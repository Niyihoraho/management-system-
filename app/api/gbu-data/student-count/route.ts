
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserScope, generateRLSConditions } from "@/lib/rls";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const universityId = searchParams.get("universityId");
        const year = searchParams.get("year");

        if (!universityId || !year) {
            return NextResponse.json(
                { error: "University ID and Year are required" },
                { status: 400 }
            );
        }

        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Apply RLS
        const rlsConditions = generateRLSConditions(userScope);
        if (rlsConditions.universityId && Number(universityId) !== rlsConditions.universityId) {
            return NextResponse.json({ error: "Access denied to requested university" }, { status: 403 });
        }
        // Region check could also be applied if needed, but usually universityId implies region check if data is consistent.
        // But let's be safe if we can. 
        // Actually, fetching university to check region might be overload. 
        // If the user can see the university in the dropdown, they likely have access.
        // Let's rely on universityId check if constrained, otherwise trust the query for now or add complex check if needed.
        // For 'region' scope, rlsConditions.regionId is set. We can check if the university belongs to that region.

        if (rlsConditions.regionId) {
            const university = await prisma.university.findUnique({
                where: { id: Number(universityId) },
                select: { regionId: true }
            });
            if (!university || university.regionId !== rlsConditions.regionId) {
                return NextResponse.json({ error: "Access denied to requested university" }, { status: 403 });
            }
        }

        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`);

        const count = await prisma.student.count({
            where: {
                universityId: Number(universityId),
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                },
            },
        });

        return NextResponse.json({ count });
    } catch (error) {
        console.error("Error fetching student count:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
