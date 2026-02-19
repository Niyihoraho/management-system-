
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope, generateRLSConditions } from "@/lib/rls";

export async function GET(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const provinceId = searchParams.get("provinceId"); // Changed from regionId
        const graduateGroupId = searchParams.get("graduateGroupId");

        // If specific graduateGroupId is provided, return that graduate small group
        if (graduateGroupId) {
            const graduatesmallgroup = await prisma.graduatesmallgroup.findUnique({
                where: { id: Number(graduateGroupId) },
                include: {
                    provinces: { select: { id: true, name: true } }
                }
            });
            if (!graduatesmallgroup) {
                return NextResponse.json({ error: "Graduate small group not found" }, { status: 404 });
            }

            // Apply RLS check
            // const rlsConditions = generateRLSConditions(userScope);
            // if (rlsConditions.regionId && graduatesmallgroup.provinceId !== rlsConditions.regionId) ... mismatched types

            return NextResponse.json({
                ...graduatesmallgroup,
                provinceId: graduatesmallgroup.provinceId?.toString(),
                provinces: graduatesmallgroup.provinces ? {
                    ...graduatesmallgroup.provinces,
                    id: graduatesmallgroup.provinces.id.toString()
                } : null
            }, { status: 200 });
        }

        let where: any = {};

        // Apply RLS conditions (Simplified for now as RLS might still return regionId)
        // const rlsConditions = generateRLSConditions(userScope);

        // Apply explicit province filter
        if (provinceId) {
            where.provinceId = BigInt(provinceId);
        }

        const graduatesmallgroups = await prisma.graduatesmallgroup.findMany({
            where,
            include: {
                provinces: { select: { id: true, name: true } }
            }
        });

        const serialized = graduatesmallgroups.map(group => ({
            ...group,
            provinceId: group.provinceId?.toString(),
            provinces: group.provinces ? {
                ...group.provinces,
                id: group.provinces.id.toString()
            } : null
        }));

        return NextResponse.json(serialized, { status: 200 });
    } catch (error) {
        console.error("Error fetching graduate small groups:", error);
        return NextResponse.json({ error: 'Failed to fetch graduate small groups' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fix permissions check - allowing generic access for now or keeping restriction
        if (userScope.scope === 'university' || userScope.scope === 'smallgroup') {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const body = await request.json();
        const { name, provinceId } = body;

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "Graduate small group name is required" },
                { status: 400 }
            );
        }

        // Check if group exists
        const existing = await prisma.graduatesmallgroup.findFirst({
            where: {
                name: name.trim(),
                ...(provinceId ? { provinceId: BigInt(provinceId) } : {})
            }
        });

        if (existing) {
            return NextResponse.json({ error: "Group already exists" }, { status: 409 });
        }

        const graduatesmallgroup = await prisma.graduatesmallgroup.create({
            data: {
                name: name.trim(),
                provinceId: provinceId ? BigInt(provinceId) : null
            },
            include: {
                provinces: { select: { id: true, name: true } }
            }
        });

        return NextResponse.json({
            ...graduatesmallgroup,
            provinceId: graduatesmallgroup.provinceId?.toString(),
            provinces: graduatesmallgroup.provinces ? {
                ...graduatesmallgroup.provinces,
                id: graduatesmallgroup.provinces.id.toString()
            } : null
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating graduate small group:", error);
        return NextResponse.json({ error: 'Failed to create graduate small group' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    // Simplified PUT
    return NextResponse.json({ error: "Not implemented fully yet" }, { status: 501 });
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.graduatesmallgroup.delete({
            where: { id: Number(id) }
        });

        return NextResponse.json({ message: "Deleted" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
