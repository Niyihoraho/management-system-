import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope, generateRLSConditions } from "@/lib/rls";
import { z } from "zod";

const updateStatusSchema = z.object({
    id: z.number().int().positive(),
    status: z.enum(['active', 'inactive']),
});

export async function PUT(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Small group users cannot modify graduates
        if (userScope.scope === 'university' || userScope.scope === 'smallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to update graduates" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = updateStatusSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const { id, status } = validation.data;

        // Check if graduate exists
        const existingGraduate = await prisma.graduate.findUnique({
            where: { id }
        });

        if (!existingGraduate) {
            return NextResponse.json(
                { error: "Graduate not found" },
                { status: 404 }
            );
        }

        // Apply RLS check
        const rlsConditions = generateRLSConditions(userScope);
        if (rlsConditions.regionId && existingGraduate.regionId !== rlsConditions.regionId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (rlsConditions.graduateGroupId && existingGraduate.graduateGroupId !== rlsConditions.graduateGroupId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Update the graduate status
        const updatedGraduate = await prisma.graduate.update({
            where: { id },
            data: {
                status: status,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(updatedGraduate, { status: 200 });

    } catch (error) {
        console.error("Error updating graduate status:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
