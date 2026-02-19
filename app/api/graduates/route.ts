import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createGraduateSchema, updateGraduateSchema } from "../validation/graduate";
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
        // Get user scope for RLS - Graduates use Region/GraduateGroup scope
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user has appropriate scope for creating graduates (region level or graduate group)
        if (userScope.scope === 'university' || userScope.scope === 'smallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to create graduates" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = createGraduateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Apply RLS validation to ensure user can only create graduates in their scope
        const rlsConditions = generateRLSConditions(userScope);

        // Graduates are scoped to Province/GraduateGroup level
        if (data.graduateGroupId && rlsConditions.graduateGroupId && data.graduateGroupId !== rlsConditions.graduateGroupId) {
            return NextResponse.json(
                { error: "You can only create graduates in your assigned graduate group" },
                { status: 403 }
            );
        }

        // Verify graduate group belongs to the province (if applicable)
        if (data.graduateGroupId) {
            const graduateGroup = await prisma.graduatesmallgroup.findUnique({
                where: { id: data.graduateGroupId }
            });

            // TODO: Add province check if needed
        }

        const newGraduate = await prisma.graduate.create({
            data: {
                fullName: data.fullName,
                phone: handleEmptyValue(data.phone),
                email: handleEmptyValue(data.email),
                university: handleEmptyValue(data.university),
                course: handleEmptyValue(data.course),
                graduationYear: handleNumericValue(data.graduationYear),
                residenceProvince: handleEmptyValue(data.residenceProvince),
                residenceDistrict: handleEmptyValue(data.residenceDistrict),
                residenceSector: handleEmptyValue(data.residenceSector),
                isDiaspora: data.isDiaspora ?? false,
                servingPillars: (data.servingPillars || []) as any,
                financialSupport: data.financialSupport ?? false,
                graduateGroupId: data.graduateGroupId,
                status: data.status ? (data.status.toLowerCase() as any) : "active",
                // regionId removed

                provinceId: data.provinceId ? BigInt(data.provinceId) : null,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(newGraduate, { status: 201 });
    } catch (error: any) {
        console.error("Error creating graduate:", error);
        return NextResponse.json(
            { error: "Failed to create graduate", details: error.message },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const status = searchParams.get("status");
        const pillar = searchParams.get("pillar");
        const graduateGroupId = searchParams.get("graduateGroupId");
        const id = searchParams.get("id");

        if (id) {
            const graduate = await prisma.graduate.findUnique({
                where: { id: Number(id) },
                include: {
                    graduatesmallgroup: true,
                    provinces: true
                }
            });
            if (!graduate) {
                return NextResponse.json({ error: "Graduate not found" }, { status: 404 });
            }

            // Apply RLS check for single graduate
            const rlsConditions = generateRLSConditions(userScope);

            // Region check removed as graduates don't have region
            // if (rlsConditions.regionId && graduate.regionId !== rlsConditions.regionId) {
            //     return NextResponse.json({ error: "Access denied" }, { status: 403 });
            // }

            if (rlsConditions.graduateGroupId && graduate.graduateGroupId !== rlsConditions.graduateGroupId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            const serializedGraduate = {
                ...graduate,
                provinceId: graduate.provinceId?.toString(),
                graduateGroup: graduate.graduatesmallgroup,
                province: graduate.provinces ? {
                    ...graduate.provinces,
                    id: graduate.provinces.id.toString()
                } : null
            };

            return NextResponse.json(serializedGraduate, { status: 200 });
        }

        // Build the filter object with RLS conditions
        const rlsConditions = generateRLSConditions(userScope);
        const whereClause: any = { ...rlsConditions };

        // Remove regionId from whereClause for graduates if it was added by default RLS
        delete whereClause.regionId;

        // Apply explicit filters if they exist (but they must be within user's scope)
        if (graduateGroupId) {
            const requestedGraduateGroupId = Number(graduateGroupId);
            if (rlsConditions.graduateGroupId && requestedGraduateGroupId !== rlsConditions.graduateGroupId) {
                return NextResponse.json({ error: "Access denied to requested graduate group" }, { status: 403 });
            }
            whereClause.graduateGroupId = requestedGraduateGroupId;
        }

        // Region filter removed

        if (search) {
            whereClause.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
            ];
        }

        if (status && status !== "all") {
            whereClause.status = status;
        }

        if (pillar && pillar !== "all") {
            whereClause.servingPillars = {
                has: pillar
            };
        }

        if (searchParams.get("provinceId")) {
            whereClause.provinceId = BigInt(searchParams.get("provinceId")!);
        }

        const graduates = await prisma.graduate.findMany({
            where: whereClause,
            include: {
                graduatesmallgroup: true,
                provinces: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formattedGraduates = graduates.map(graduate => ({
            ...graduate,
            provinceId: graduate.provinceId?.toString(),
            graduateGroup: graduate.graduatesmallgroup, // Map to expected frontend key if needed, or just keep it
            graduateSmallGroup: graduate.graduatesmallgroup,
            province: graduate.provinces ? {
                ...graduate.provinces,
                id: graduate.provinces.id.toString()
            } : null
        }));

        return NextResponse.json(formattedGraduates);
    } catch (error: any) {
        console.error("Error fetching postgraduates:", error);
        return NextResponse.json(
            { error: "Failed to fetch postgraduates", details: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Graduate ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const validation = updateGraduateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Check if graduate exists
        const existingGraduate = await prisma.graduate.findUnique({
            where: { id: Number(id) },
            include: {
                graduatesmallgroup: true
            }
        });

        if (!existingGraduate) {
            return NextResponse.json(
                { error: "Graduate not found" },
                { status: 404 }
            );
        }

        // Apply RLS check - ensure user can only update graduates in their scope
        const rlsConditions = generateRLSConditions(userScope);

        if (rlsConditions.graduateGroupId && existingGraduate.graduateGroupId !== rlsConditions.graduateGroupId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Validate that the updated data doesn't move the graduate outside user's scope
        if (data.graduateGroupId && rlsConditions.graduateGroupId && data.graduateGroupId !== rlsConditions.graduateGroupId) {
            return NextResponse.json(
                { error: "You can only assign graduates to your assigned graduate group" },
                { status: 403 }
            );
        }

        // Verify graduate group belongs to the province if both are being updated
        if (data.graduateGroupId) {
            const graduateGroup = await prisma.graduatesmallgroup.findUnique({
                where: { id: data.graduateGroupId }
            });

            // TODO: Add province check if needed
        }

        const { provinceId, servingPillars, status, ...updateData } = data;

        const updatedGraduate = await prisma.graduate.update({
            where: { id: Number(id) },
            data: {
                ...updateData,
                servingPillars: servingPillars as any,
                status: status ? (status.toLowerCase() as any) : undefined,
                updatedAt: new Date(),
                provinceId: provinceId ? BigInt(provinceId) : existingGraduate.provinceId,
            },
            include: {
                graduatesmallgroup: true,
                provinces: true
            }
        });

        const serializedUpdatedGraduate = {
            ...updatedGraduate,
            provinceId: updatedGraduate.provinceId?.toString(),
            graduateGroup: updatedGraduate.graduatesmallgroup,
            province: updatedGraduate.provinces ? {
                ...updatedGraduate.provinces,
                id: updatedGraduate.provinces.id.toString()
            } : null
        };

        return NextResponse.json(serializedUpdatedGraduate);
    } catch (error: any) {
        console.error("Error updating graduate:", error);
        return NextResponse.json(
            { error: "Failed to update graduate", details: error.message },
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

        // University and small group users cannot delete graduates
        if (userScope.scope === 'university' || userScope.scope === 'smallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to delete graduates" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Graduate ID is required" },
                { status: 400 }
            );
        }

        // Check if graduate exists
        const existingGraduate = await prisma.graduate.findUnique({
            where: { id: Number(id) }
        });

        if (!existingGraduate) {
            return NextResponse.json(
                { error: "Graduate not found" },
                { status: 404 }
            );
        }

        // Apply RLS check - ensure user can only delete graduates in their scope
        const rlsConditions = generateRLSConditions(userScope);
        // Region check removed
        // if (rlsConditions.regionId && existingGraduate.regionId !== rlsConditions.regionId) {
        //     return NextResponse.json({ error: "Access denied" }, { status: 403 });
        // }
        if (rlsConditions.graduateGroupId && existingGraduate.graduateGroupId !== rlsConditions.graduateGroupId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Delete the graduate
        await prisma.graduate.delete({
            where: { id: Number(id) }
        });

        return NextResponse.json(
            { message: "Graduate deleted successfully" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error deleting graduate:", error);

        // Handle specific Prisma errors
        if (typeof error === 'object' && error !== null && 'code' in error) {
            if (error.code === 'P2025') {
                return NextResponse.json(
                    { error: "Graduate not found" },
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
