import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope, getTableRLSConditions } from "@/lib/rls";

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
        const smallgroupId = searchParams.get("smallgroupId");

        // If specific smallgroupId is provided, return that small group
        if (smallgroupId) {
            const requestedSmallGroupId = Number(smallgroupId);

            // Apply RLS check for specific small group
            if (userScope.scope === 'smallgroup' && userScope.smallgroupId !== requestedSmallGroupId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            const smallgroup = await prisma.smallGroup.findUnique({
                where: { id: requestedSmallGroupId },
                include: {
                    region: { select: { id: true, name: true } },
                    university: { select: { id: true, name: true } }
                }
            });
            if (!smallgroup) {
                return NextResponse.json({ error: "Small group not found" }, { status: 404 });
            }

            // Additional RLS checks for parent scopes
            if (userScope.scope === 'university' && userScope.universityId && smallgroup.universityId !== userScope.universityId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
            if (userScope.scope === 'region' && userScope.regionId && smallgroup.regionId !== userScope.regionId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            return NextResponse.json(smallgroup, { status: 200 });
        }

        // Apply RLS conditions
        const rlsConditions = getTableRLSConditions(userScope, 'smallgroup');
        const where: Record<string, unknown> = { ...rlsConditions };

        // Apply explicit filters if provided (but they must be within user's scope)
        if (regionId) {
            const requestedRegionId = Number(regionId);
            if (rlsConditions.regionId && requestedRegionId !== rlsConditions.regionId) {
                return NextResponse.json({ error: "Access denied to requested region" }, { status: 403 });
            }
            where.regionId = requestedRegionId;
        }
        if (universityId) {
            const requestedUniversityId = Number(universityId);
            if (rlsConditions.universityId && requestedUniversityId !== rlsConditions.universityId) {
                return NextResponse.json({ error: "Access denied to requested university" }, { status: 403 });
            }
            where.universityId = requestedUniversityId;
        }

        const smallgroups = await prisma.smallGroup.findMany({
            where,
            include: {
                region: { select: { id: true, name: true } },
                university: { select: { id: true, name: true } }
            }
        });
        return NextResponse.json(smallgroups, { status: 200 });
    } catch (error) {
        console.error("Error fetching small groups:", error);
        return NextResponse.json({ error: 'Failed to fetch small groups' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, universityId, regionId } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "Small group name is required" },
                { status: 400 }
            );
        }

        if (!universityId) {
            return NextResponse.json(
                { error: "University ID is required" },
                { status: 400 }
            );
        }

        if (!regionId) {
            return NextResponse.json(
                { error: "Region ID is required" },
                { status: 400 }
            );
        }

        // Apply RLS checks for creation
        const finalUniversityId = Number(universityId);
        const finalRegionId = Number(regionId);

        // Check if user has permission to create in this university/region
        if (userScope.scope === 'university' && userScope.universityId !== finalUniversityId) {
            return NextResponse.json({ error: "Access denied to create in this university" }, { status: 403 });
        }
        if (userScope.scope === 'region' && userScope.regionId !== finalRegionId) {
            return NextResponse.json({ error: "Access denied to create in this region" }, { status: 403 });
        }
        if (userScope.scope === 'smallgroup') {
            return NextResponse.json({ error: "Small group users cannot create new small groups" }, { status: 403 });
        }

        // Check if small group with same name already exists in the university
        const existingSmallGroup = await prisma.smallGroup.findFirst({
            where: {
                name: name.trim(),
                universityId: finalUniversityId
            }
        });

        if (existingSmallGroup) {
            return NextResponse.json(
                { error: "Small group with this name already exists in the selected university" },
                { status: 409 }
            );
        }

        // Verify university exists
        const university = await prisma.university.findUnique({
            where: { id: finalUniversityId }
        });

        if (!university) {
            return NextResponse.json(
                { error: "University not found" },
                { status: 404 }
            );
        }

        // Verify region exists
        const region = await prisma.region.findUnique({
            where: { id: finalRegionId }
        });

        if (!region) {
            return NextResponse.json(
                { error: "Region not found" },
                { status: 404 }
            );
        }

        // Verify university belongs to the region
        if (university.regionId !== finalRegionId) {
            return NextResponse.json(
                { error: "University does not belong to the selected region" },
                { status: 400 }
            );
        }

        const smallgroup = await prisma.smallGroup.create({
            data: {
                name: name.trim(),
                universityId: finalUniversityId,
                regionId: finalRegionId
            },
            include: {
                region: { select: { id: true, name: true } },
                university: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json(smallgroup, { status: 201 });
    } catch (error) {
        console.error("Error creating small group:", error);
        return NextResponse.json({ error: 'Failed to create small group' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const smallgroupId = searchParams.get("id");

        if (!smallgroupId) {
            return NextResponse.json(
                { error: "Small group ID is required" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { name, universityId, regionId } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "Small group name is required" },
                { status: 400 }
            );
        }

        if (!universityId) {
            return NextResponse.json(
                { error: "University ID is required" },
                { status: 400 }
            );
        }

        if (!regionId) {
            return NextResponse.json(
                { error: "Region ID is required" },
                { status: 400 }
            );
        }

        // Check if small group exists
        const existingSmallGroup = await prisma.smallGroup.findUnique({
            where: { id: Number(smallgroupId) }
        });

        if (!existingSmallGroup) {
            return NextResponse.json(
                { error: "Small group not found" },
                { status: 404 }
            );
        }

        // Apply RLS checks for update
        if (userScope.scope === 'smallgroup' && userScope.smallgroupId !== Number(smallgroupId)) {
            return NextResponse.json({ error: "Access denied to update this small group" }, { status: 403 });
        }
        if (userScope.scope === 'university' && userScope.universityId && existingSmallGroup.universityId !== userScope.universityId) {
            return NextResponse.json({ error: "Access denied to update small groups outside your university" }, { status: 403 });
        }
        if (userScope.scope === 'region' && userScope.regionId && existingSmallGroup.regionId !== userScope.regionId) {
            return NextResponse.json({ error: "Access denied to update small groups outside your region" }, { status: 403 });
        }

        // Check if another small group with same name already exists in the university
        const duplicateSmallGroup = await prisma.smallGroup.findFirst({
            where: {
                name: name.trim(),
                universityId: Number(universityId),
                id: { not: Number(smallgroupId) }
            }
        });

        if (duplicateSmallGroup) {
            return NextResponse.json(
                { error: "Small group with this name already exists in the selected university" },
                { status: 409 }
            );
        }

        // Verify university exists
        const university = await prisma.university.findUnique({
            where: { id: Number(universityId) }
        });

        if (!university) {
            return NextResponse.json(
                { error: "University not found" },
                { status: 404 }
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

        // Verify university belongs to the region
        if (university.regionId !== Number(regionId)) {
            return NextResponse.json(
                { error: "University does not belong to the selected region" },
                { status: 400 }
            );
        }

        const updatedSmallGroup = await prisma.smallGroup.update({
            where: { id: Number(smallgroupId) },
            data: {
                name: name.trim(),
                universityId: Number(universityId),
                regionId: Number(regionId)
            },
            include: {
                region: { select: { id: true, name: true } },
                university: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json(updatedSmallGroup, { status: 200 });
    } catch (error) {
        console.error("Error updating small group:", error);
        return NextResponse.json({ error: 'Failed to update small group' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const smallgroupId = searchParams.get("id");

        if (!smallgroupId) {
            return NextResponse.json(
                { error: "Small group ID is required" },
                { status: 400 }
            );
        }

        // Check if small group exists
        const existingSmallGroup = await prisma.smallGroup.findUnique({
            where: { id: Number(smallgroupId) }
        });

        if (!existingSmallGroup) {
            return NextResponse.json(
                { error: "Small group not found" },
                { status: 404 }
            );
        }

        // Apply RLS checks for deletion
        if (userScope.scope === 'smallgroup') {
            return NextResponse.json({ error: "Small group users cannot delete small groups" }, { status: 403 });
        }
        if (userScope.scope === 'university' && userScope.universityId && existingSmallGroup.universityId !== userScope.universityId) {
            return NextResponse.json({ error: "Access denied to delete small groups outside your university" }, { status: 403 });
        }
        if (userScope.scope === 'region' && userScope.regionId && existingSmallGroup.regionId !== userScope.regionId) {
            return NextResponse.json({ error: "Access denied to delete small groups outside your region" }, { status: 403 });
        }

        // Check if small group is being used by students
        const studentsCount = await prisma.student.count({
            where: { smallgroupId: Number(smallgroupId) }
        });

        if (studentsCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete small group. It is being used by students." },
                { status: 409 }
            );
        }

        await prisma.smallGroup.delete({
            where: { id: Number(smallgroupId) }
        });

        return NextResponse.json(
            { message: "Small group deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting small group:", error);
        return NextResponse.json({ error: 'Failed to delete small group' }, { status: 500 });
    }
} 