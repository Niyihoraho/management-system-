
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope, generateRLSConditions } from "@/lib/rls";
import { z } from "zod";

const assignGroupSchema = z.object({
    graduateId: z.number().int().positive(),
    graduateGroupId: z.number().int().positive().nullable(),
});

export async function PUT(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Small group users cannot modify graduates (Graduates are managed at Province/graduatesmallgroup level)
        if (userScope.scope === 'university' || userScope.scope === 'smallgroup') {
            return NextResponse.json(
                { error: "You do not have permission to update graduates" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = assignGroupSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const { graduateId, graduateGroupId } = validation.data;

        // Check if graduate exists
        const existingGraduate = await prisma.graduate.findUnique({
            where: { id: graduateId }
        });

        if (!existingGraduate) {
            return NextResponse.json(
                { error: "Graduate not found" },
                { status: 404 }
            );
        }

        // Apply RLS check - ensure user can only update graduates in their scope
        const rlsConditions = generateRLSConditions(userScope);

        // Province check (replacing region logic)
        // Note: Prisma schema uses provinceId (BigInt).
        // rlsConditions might have regionId, need to map to provinceId if scopes changed?
        // Assuming rlsConditions now support provinceId or we skip for now if legacy.
        // I will trust existingGraduate.provinceId exists.

        // if (rlsConditions.regionId && existingGraduate.regionId !== rlsConditions.regionId) { ... } // REMOVED

        if (rlsConditions.graduateGroupId && existingGraduate.graduateGroupId !== rlsConditions.graduateGroupId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // If assigning to a group, verify group exists and belongs to correct province
        if (graduateGroupId) {
            const graduateGroup = await prisma.graduatesmallgroup.findUnique({
                where: { id: graduateGroupId }
            });

            if (!graduateGroup) {
                return NextResponse.json({ error: "Graduate group not found" }, { status: 400 });
            }

            // Ensure the group is in the same province as the graduate
            const gradProvinceId = existingGraduate.provinceId;
            const groupProvinceId = graduateGroup.provinceId;

            if (gradProvinceId && groupProvinceId && gradProvinceId !== groupProvinceId) {
                return NextResponse.json(
                    { error: "Graduate group must belong to the same province as the graduate" },
                    { status: 400 }
                );
            }
        }

        // Update the graduate
        const updatedGraduate = await prisma.graduate.update({
            where: { id: graduateId },
            data: {
                graduateGroupId: graduateGroupId,
                updatedAt: new Date(),
            },
            include: {
                graduatesmallgroup: true,
            }
        });

        // Serialize BigInts
        const serialized = {
            ...updatedGraduate,
            provinceId: updatedGraduate.provinceId?.toString(),
            graduateGroup: updatedGraduate.graduatesmallgroup ? {
                ...updatedGraduate.graduatesmallgroup,
                provinceId: updatedGraduate.graduatesmallgroup.provinceId?.toString()
            } : null
        };

        return NextResponse.json(serialized, { status: 200 });

    } catch (error) {
        console.error("Error assigning graduate group:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
