import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createStudentSchema, updateStudentSchema } from "../validation/student";
import { getUserScope, generateRLSConditions } from "@/lib/rls";

// Helper function to handle empty strings and null values
const handleEmptyValue = (value: any) => {
    if (value === "" || value === null || value === undefined) {
        return null;
    }
    return value;
};

// Helper function to handle numeric values
const handleNumericValue = (value: any) => {
    if (value === "" || value === null || value === undefined) {
        return null;
    }
    return Number(value);
};

export async function POST(request: NextRequest) {
    try {
        // Get user scope for RLS - Students use University scope
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user has appropriate scope for creating students (university level or higher)
        if (userScope.scope === 'graduatesmallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to create students" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = createStudentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Apply RLS validation to ensure user can only create students in their scope
        const rlsConditions = generateRLSConditions(userScope);

        // Students are scoped to University level
        if (data.universityId && rlsConditions.universityId && data.universityId !== rlsConditions.universityId) {
            return NextResponse.json(
                { error: "You can only create students in your assigned university" },
                { status: 403 }
            );
        }

        if (data.regionId && rlsConditions.regionId && data.regionId !== rlsConditions.regionId) {
            return NextResponse.json(
                { error: "You can only create students in your assigned region" },
                { status: 403 }
            );
        }

        // Verify small group belongs to the university
        if (data.smallGroupId) {
            const smallGroup = await prisma.smallGroup.findUnique({
                where: { id: data.smallGroupId }
            });
            if (!smallGroup || smallGroup.universityId !== data.universityId) {
                return NextResponse.json(
                    { error: "Invalid small group for the selected university" },
                    { status: 400 }
                );
            }
        }

        // Get University to derive regionId automatically
        const university = await prisma.university.findUnique({
            where: { id: data.universityId as number }
        });

        if (!university) {
            return NextResponse.json({ error: "University not found" }, { status: 400 });
        }

        const newStudent = await prisma.student.create({
            data: {
                fullName: data.fullName,
                phone: handleEmptyValue(data.phone),
                email: handleEmptyValue(data.email),
                universityId: data.universityId as number,
                smallGroupId: data.smallGroupId as number | null,
                course: handleEmptyValue(data.course),
                yearOfStudy: handleNumericValue(data.yearOfStudy),
                placeOfBirthProvince: handleEmptyValue(data.placeOfBirthProvince),
                placeOfBirthDistrict: handleEmptyValue(data.placeOfBirthDistrict),
                placeOfBirthSector: handleEmptyValue(data.placeOfBirthSector),
                status: data.status ? (data.status.toLowerCase() as any) : "active",
                regionId: university.regionId, // Always use region from university
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(newStudent, { status: 201 });
    } catch (error: any) {
        console.error("Error creating student:", error);

        // Handle specific Prisma errors
        if (typeof error === 'object' && error !== null && 'code' in error) {
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: "Email already exists" },
                    { status: 409 }
                );
            }
            if (error.code === 'P2003') {
                return NextResponse.json(
                    { error: "Foreign key constraint failed" },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Graduate small group users cannot access students
        if (userScope.scope === 'graduatesmallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to view students" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const smallGroupId = searchParams.get("smallGroupId");
        const universityId = searchParams.get("universityId");
        const regionId = searchParams.get("regionId");

        // If ID is provided, return specific student
        if (id) {
            const student = await prisma.student.findUnique({
                where: { id: Number(id) },
                include: {
                    region: true,
                    university: true,
                    smallgroup: true,
                }
            });
            if (!student) {
                return NextResponse.json({ error: "Student not found" }, { status: 404 });
            }

            // Apply RLS check for single student
            const rlsConditions = generateRLSConditions(userScope);
            if (rlsConditions.regionId && student.regionId !== rlsConditions.regionId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
            if (rlsConditions.universityId && student.universityId !== rlsConditions.universityId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
            if (rlsConditions.smallGroupId && student.smallGroupId !== rlsConditions.smallGroupId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            return NextResponse.json(student, { status: 200 });
        }

        // Build the filter object with RLS conditions
        const rlsConditions = generateRLSConditions(userScope);
        let where: any = { ...rlsConditions };

        // Apply explicit filters if they exist (but they must be within user's scope)
        if (smallGroupId) {
            const requestedSmallGroupId = Number(smallGroupId);
            if (rlsConditions.smallGroupId && requestedSmallGroupId !== rlsConditions.smallGroupId) {
                return NextResponse.json({ error: "Access denied to requested small group" }, { status: 403 });
            }
            where.smallGroupId = requestedSmallGroupId;
        } else if (universityId) {
            const requestedUniversityId = Number(universityId);
            if (rlsConditions.universityId && requestedUniversityId !== rlsConditions.universityId) {
                return NextResponse.json({ error: "Access denied to requested university" }, { status: 403 });
            }
            where.universityId = requestedUniversityId;
        } else if (regionId) {
            const requestedRegionId = Number(regionId);
            if (rlsConditions.regionId && requestedRegionId !== rlsConditions.regionId) {
                return NextResponse.json({ error: "Access denied to requested region" }, { status: 403 });
            }
            where.regionId = requestedRegionId;
        }

        // Fetch students based on the constructed 'where' clause with RLS
        const students = await prisma.student.findMany({
            where,
            include: {
                region: true,
                university: true,
                smallgroup: true,
            }
        });

        return NextResponse.json({ students }, { status: 200 });
    } catch (error) {
        console.error("Error fetching students:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Graduate small group users cannot modify students
        if (userScope.scope === 'graduatesmallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to update students" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Student ID is required" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const validation = updateStudentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
            where: { id: Number(id) }
        });

        if (!existingStudent) {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            );
        }

        // Apply RLS check - ensure user can only update students in their scope
        const rlsConditions = generateRLSConditions(userScope);
        if (rlsConditions.regionId && existingStudent.regionId !== rlsConditions.regionId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (rlsConditions.universityId && existingStudent.universityId !== rlsConditions.universityId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (rlsConditions.smallGroupId && existingStudent.smallGroupId !== rlsConditions.smallGroupId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Validate that the updated data doesn't move the student outside user's scope
        if (data.universityId && rlsConditions.universityId && data.universityId !== rlsConditions.universityId) {
            return NextResponse.json(
                { error: "You can only assign students to your assigned university" },
                { status: 403 }
            );
        }

        if (data.regionId && rlsConditions.regionId && data.regionId !== rlsConditions.regionId) {
            return NextResponse.json(
                { error: "You can only assign students to your assigned region" },
                { status: 403 }
            );
        }

        // Verify small group belongs to the university if both are being updated
        if (data.smallGroupId && (data.universityId || existingStudent.universityId)) {
            const smallGroup = await prisma.smallGroup.findUnique({
                where: { id: data.smallGroupId }
            });
            const targetUniversityId = data.universityId || existingStudent.universityId;
            if (!smallGroup || smallGroup.universityId !== targetUniversityId) {
                return NextResponse.json(
                    { error: "Invalid small group for the selected university" },
                    { status: 400 }
                );
            }
        }

        // If university is changing, we must update regionId as well
        let newRegionId = undefined;
        if (data.universityId && data.universityId !== existingStudent.universityId) {
            const university = await prisma.university.findUnique({
                where: { id: data.universityId as number }
            });
            if (!university) {
                return NextResponse.json({ error: "University not found" }, { status: 400 });
            }
            newRegionId = university.regionId;
        }

        // Update the student
        const updatedStudent = await prisma.student.update({
            where: { id: Number(id) },
            data: {
                ...(data.fullName !== undefined && { fullName: data.fullName }),
                ...(data.phone !== undefined && { phone: handleEmptyValue(data.phone) }),
                ...(data.email !== undefined && { email: handleEmptyValue(data.email) }),
                ...(data.universityId !== undefined && { universityId: data.universityId as number }),
                ...(data.smallGroupId !== undefined && { smallGroupId: data.smallGroupId as number | null }),
                ...(data.course !== undefined && { course: handleEmptyValue(data.course) }),
                ...(data.yearOfStudy !== undefined && { yearOfStudy: handleNumericValue(data.yearOfStudy) }),
                ...(data.placeOfBirthProvince !== undefined && { placeOfBirthProvince: handleEmptyValue(data.placeOfBirthProvince) }),
                ...(data.placeOfBirthDistrict !== undefined && { placeOfBirthDistrict: handleEmptyValue(data.placeOfBirthDistrict) }),
                ...(data.placeOfBirthSector !== undefined && { placeOfBirthSector: handleEmptyValue(data.placeOfBirthSector) }),
                ...(data.status !== undefined && { status: data.status.toLowerCase() as any }),
                ...(newRegionId !== undefined && { regionId: newRegionId }), // Use derived regionId
                updatedAt: new Date(),
            },
            include: {
                region: true,
                university: true,
                smallgroup: true,
            }
        });

        return NextResponse.json(updatedStudent, { status: 200 });
    } catch (error: any) {
        console.error("Error updating student:", error);

        // Handle specific Prisma errors
        if (typeof error === 'object' && error !== null && 'code' in error) {
            if (error.code === 'P2025') {
                return NextResponse.json(
                    { error: "Student not found" },
                    { status: 404 }
                );
            }
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: "Email already exists" },
                    { status: 409 }
                );
            }
            if (error.code === 'P2003') {
                return NextResponse.json(
                    { error: "Foreign key constraint failed" },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Graduate small group users cannot delete students
        if (userScope.scope === 'graduatesmallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to delete students" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Student ID is required" },
                { status: 400 }
            );
        }

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
            where: { id: Number(id) }
        });

        if (!existingStudent) {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            );
        }

        // Apply RLS check - ensure user can only delete students in their scope
        const rlsConditions = generateRLSConditions(userScope);
        if (rlsConditions.regionId && existingStudent.regionId !== rlsConditions.regionId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (rlsConditions.universityId && existingStudent.universityId !== rlsConditions.universityId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (rlsConditions.smallGroupId && existingStudent.smallGroupId !== rlsConditions.smallGroupId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Delete the student
        await prisma.student.delete({
            where: { id: Number(id) }
        });

        return NextResponse.json(
            { message: "Student deleted successfully" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error deleting student:", error);

        // Handle specific Prisma errors
        if (typeof error === 'object' && error !== null && 'code' in error) {
            if (error.code === 'P2025') {
                return NextResponse.json(
                    { error: "Student not found" },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
