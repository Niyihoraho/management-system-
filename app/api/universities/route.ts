import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope, generateRLSConditions } from "@/lib/rls";

export async function GET(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get("regionId");
        const universityId = searchParams.get("universityId");

        // If specific universityId is provided, return that university
        if (universityId) {
            const requestedUniversityId = Number(universityId);

            // Apply RLS check for specific university
            if (userScope.scope === 'university' && userScope.universityId !== requestedUniversityId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            const university = await prisma.university.findUnique({
                where: { id: requestedUniversityId },
                select: {
                    id: true,
                    name: true,
                    regionId: true,
                    studentPopulation: true,
                    region: { select: { name: true } },
                    cult: { select: { name: true } },
                    faculty: { select: { name: true } },
                    association: { select: { name: true } }
                }
            });
            if (!university) {
                return NextResponse.json({ error: "University not found" }, { status: 404 });
            }

            // Additional RLS check for region scope
            if (userScope.scope === 'region' && userScope.regionId && university.regionId !== userScope.regionId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            return NextResponse.json(university, { status: 200 });
        }

        // Build where clause with RLS conditions
        const rlsConditions = generateRLSConditions(userScope);
        const where: Record<string, unknown> = { ...rlsConditions };

        // Apply region filter if provided (but it must be within user's scope)
        if (regionId) {
            const requestedRegionId = Number(regionId);
            if (rlsConditions.regionId && requestedRegionId !== rlsConditions.regionId) {
                return NextResponse.json({ error: "Access denied to requested region" }, { status: 403 });
            }
            where.regionId = requestedRegionId;
        }

        const universities = await prisma.university.findMany({
            where,
            select: {
                id: true,
                name: true,
                regionId: true,
                studentPopulation: true,
                region: { select: { name: true } },
                cult: { select: { name: true } },
                faculty: { select: { name: true } },
                association: { select: { name: true } }
            }
        });
        return NextResponse.json(universities, { status: 200 });
    } catch (error) {
        console.error("Error fetching universities:", error);
        return NextResponse.json({ error: 'Failed to fetch universities' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, regionId, studentPopulation, cults, faculties, associations } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "University name is required" },
                { status: 400 }
            );
        }

        if (!regionId) {
            return NextResponse.json(
                { error: "Region ID is required" },
                { status: 400 }
            );
        }

        // Check if university with same name already exists in the region
        const existingUniversity = await prisma.university.findFirst({
            where: {
                name: name.trim(),
                regionId: Number(regionId)
            }
        });

        if (existingUniversity) {
            return NextResponse.json(
                { error: "University with this name already exists in the selected region" },
                { status: 409 }
            );
        }

        // Verify region exists
        const region = await prisma.region.findUnique({
            where: { id: Number(regionId) }
        });

        if (!region) {
            return NextResponse.json(
                { error: "Region not found" },
                { status: 404 }
            );
        }

        const university = await prisma.university.create({
            data: {
                name: name.trim(),
                regionId: Number(regionId),
                studentPopulation: studentPopulation ? Number(studentPopulation) : 0,
                cult: {
                    create: Array.isArray(cults) ? cults.map((c: string) => ({ name: c })) : []
                },
                faculty: {
                    create: Array.isArray(faculties) ? faculties.map((f: string) => ({ name: f })) : []
                },
                association: {
                    create: Array.isArray(associations) ? associations.map((a: string) => ({ name: a })) : []
                }
            },
            select: {
                id: true,
                name: true,
                regionId: true,
                studentPopulation: true,
                region: { select: { name: true } },
                cult: { select: { name: true } },
                faculty: { select: { name: true } },
                association: { select: { name: true } }
            }
        });

        return NextResponse.json(university, { status: 201 });
    } catch (error) {
        console.error("Error creating university:", error);
        return NextResponse.json({ error: 'Failed to create university' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const universityId = searchParams.get("id");

        if (!universityId) {
            return NextResponse.json(
                { error: "University ID is required" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { name, regionId, studentPopulation, cults, faculties, associations } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "University name is required" },
                { status: 400 }
            );
        }

        if (!regionId) {
            return NextResponse.json(
                { error: "Region ID is required" },
                { status: 400 }
            );
        }

        // Check if university exists
        const existingUniversity = await prisma.university.findUnique({
            where: { id: Number(universityId) }
        });

        if (!existingUniversity) {
            return NextResponse.json(
                { error: "University not found" },
                { status: 404 }
            );
        }

        // Check if another university with same name already exists in the region
        const duplicateUniversity = await prisma.university.findFirst({
            where: {
                name: name.trim(),
                regionId: Number(regionId),
                id: { not: Number(universityId) }
            }
        });

        if (duplicateUniversity) {
            return NextResponse.json(
                { error: "University with this name already exists in the selected region" },
                { status: 409 }
            );
        }

        // Verify region exists
        const region = await prisma.region.findUnique({
            where: { id: Number(regionId) }
        });

        if (!region) {
            return NextResponse.json(
                { error: "Region not found" },
                { status: 404 }
            );
        }

        // Use transaction to update relationships
        const updatedUniversity = await prisma.$transaction(async (tx) => {
            // Update basic info
            const updated = await tx.university.update({
                where: { id: Number(universityId) },
                data: {
                    name: name.trim(),
                    regionId: Number(regionId),
                    studentPopulation: studentPopulation ? Number(studentPopulation) : 0,
                }
            });

            // Update Cults
            if (Array.isArray(cults)) {
                await tx.cult.deleteMany({ where: { universityId: Number(universityId) } });
                if (cults.length > 0) {
                    await tx.cult.createMany({
                        data: cults.map((c: string) => ({ name: c, universityId: Number(universityId) }))
                    });
                }
            }

            // Update Faculties
            if (Array.isArray(faculties)) {
                await tx.faculty.deleteMany({ where: { universityId: Number(universityId) } });
                if (faculties.length > 0) {
                    await tx.faculty.createMany({
                        data: faculties.map((f: string) => ({ name: f, universityId: Number(universityId) }))
                    });
                }
            }

            // Update Associations
            if (Array.isArray(associations)) {
                await tx.association.deleteMany({ where: { universityId: Number(universityId) } });
                if (associations.length > 0) {
                    await tx.association.createMany({
                        data: associations.map((a: string) => ({ name: a, universityId: Number(universityId) }))
                    });
                }
            }

            return await tx.university.findUnique({
                where: { id: Number(universityId) },
                select: {
                    id: true,
                    name: true,
                    regionId: true,
                    studentPopulation: true,
                    region: { select: { name: true } },
                    cult: { select: { name: true } },
                    faculty: { select: { name: true } },
                    association: { select: { name: true } }
                }
            });
        });

        return NextResponse.json(updatedUniversity, { status: 200 });
    } catch (error) {
        console.error("Error updating university:", error);
        return NextResponse.json({ error: 'Failed to update university' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const universityId = searchParams.get("id");

        if (!universityId) {
            return NextResponse.json(
                { error: "University ID is required" },
                { status: 400 }
            );
        }

        // Check if university exists
        const existingUniversity = await prisma.university.findUnique({
            where: { id: Number(universityId) }
        });

        if (!existingUniversity) {
            return NextResponse.json(
                { error: "University not found" },
                { status: 404 }
            );
        }

        // Check if university is being used by students
        const studentsCount = await prisma.student.count({
            where: { universityId: Number(universityId) }
        });

        if (studentsCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete university. It is being used by students." },
                { status: 409 }
            );
        }

        await prisma.university.delete({
            where: { id: Number(universityId) }
        });

        return NextResponse.json(
            { message: "University deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting university:", error);
        return NextResponse.json({ error: 'Failed to delete university' }, { status: 500 });
    }
}