import { NextRequest, NextResponse } from "next/server";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { getUserScope } from "@/lib/rls";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";

export async function GET(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const preferPrimary = (request as any).headers?.get?.('x-read-after-write') === '1';
        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get("regionId");

        if (regionId) {
            const requestedRegionId = Number(regionId);
            if (userScope.scope === 'region' && userScope.regionId !== requestedRegionId) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }

            const cacheKeyR = `regions:${userScope.userId}:${requestedRegionId}`;
            if (!preferPrimary) {
                const cached = await cacheGet<any>(cacheKeyR);
                if (cached) return NextResponse.json(cached);
            }

            const db = getPrismaClient('read', { preferPrimary });
            const region = await db.region.findUnique({ where: { id: requestedRegionId }, select: { id: true, name: true } });
            if (!region) return NextResponse.json({ error: "Region not found" }, { status: 404 });
            if (!preferPrimary) await cacheSet(cacheKeyR, region, { ttlSeconds: 3600 });
            return NextResponse.json(region, { status: 200 });
        }

        const where: Record<string, unknown> = {};
        if (userScope.scope === 'region' && userScope.regionId) {
            where.id = userScope.regionId;
        }
        if (userScope.scope === 'university' && userScope.regionId) {
            where.id = userScope.regionId;
        }

        const cacheKey = `regions:list:${userScope.userId}:${userScope.scope}:${userScope.regionId ?? 'all'}`;
        if (!preferPrimary) {
            const cached = await cacheGet<any[]>(cacheKey);
            if (cached) return NextResponse.json(cached);
        }

        const db = getPrismaClient('read', { preferPrimary });
        const regions = await db.region.findMany({ where, select: { id: true, name: true } });
        if (!preferPrimary) await cacheSet(cacheKey, regions, { ttlSeconds: 3600 });
        return NextResponse.json(regions, { status: 200 });
    } catch (error) {
        console.error("Error fetching regions:", error);
        return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (userScope.scope !== 'superadmin' && userScope.scope !== 'national') {
            return NextResponse.json({ error: "You don't have permission to create regions" }, { status: 403 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "Region name is required" }, { status: 400 });
        }

        const existingRegion = await prisma.region.findFirst({ where: { name: name.trim() } });
        if (existingRegion) {
            return NextResponse.json({ error: "Region with this name already exists" }, { status: 409 });
        }

        const region = await prisma.region.create({ data: { name: name.trim() }, select: { id: true, name: true } });

        await cacheDel('regions:list:*');
        await cacheDel('stats:*');
        return NextResponse.json(region, { status: 201 });
    } catch (error) {
        console.error("Error creating region:", error);
        return NextResponse.json({ error: 'Failed to create region' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get("id");
        if (!regionId) return NextResponse.json({ error: "Region ID is required" }, { status: 400 });

        const body = await request.json();
        const { name } = body;
        if (!name || name.trim() === '') return NextResponse.json({ error: "Region name is required" }, { status: 400 });

        const existingRegion = await prisma.region.findUnique({ where: { id: Number(regionId) } });
        if (!existingRegion) return NextResponse.json({ error: "Region not found" }, { status: 404 });

        if (userScope.scope === 'region' && userScope.regionId !== Number(regionId)) {
            return NextResponse.json({ error: "You can only update your assigned region" }, { status: 403 });
        }

        if (userScope.scope !== 'superadmin' && userScope.scope !== 'national' && userScope.scope !== 'region') {
            return NextResponse.json({ error: "You don't have permission to update regions" }, { status: 403 });
        }

        const duplicateRegion = await prisma.region.findFirst({ where: { name: name.trim(), id: { not: Number(regionId) } } });
        if (duplicateRegion) return NextResponse.json({ error: "Region with this name already exists" }, { status: 409 });

        const updatedRegion = await prisma.region.update({
            where: { id: Number(regionId) },
            data: { name: name.trim() },
            select: { id: true, name: true }
        });

        await cacheDel(`regions:*:${Number(regionId)}`);
        await cacheDel('regions:list:*');
        await cacheDel('stats:*');
        return NextResponse.json(updatedRegion, { status: 200 });
    } catch (error) {
        console.error("Error updating region:", error);
        return NextResponse.json({ error: 'Failed to update region' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (userScope.scope !== 'superadmin') {
            return NextResponse.json({ error: "You don't have permission to delete regions" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get("id");
        if (!regionId) return NextResponse.json({ error: "Region ID is required" }, { status: 400 });

        const existingRegion = await prisma.region.findUnique({ where: { id: Number(regionId) } });
        if (!existingRegion) return NextResponse.json({ error: "Region not found" }, { status: 404 });

        const universitiesCount = await prisma.university.count({ where: { regionId: Number(regionId) } });
        if (universitiesCount > 0) {
            return NextResponse.json({ error: "Cannot delete region. It is being used by universities." }, { status: 409 });
        }

        await prisma.region.delete({ where: { id: Number(regionId) } });

        await cacheDel(`regions:*:${Number(regionId)}`);
        await cacheDel('regions:list:*');
        await cacheDel('universities:list:*');
        await cacheDel('stats:*');
        return NextResponse.json({ message: "Region deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting region:", error);
        return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 });
    }
}
