import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope, generateRLSConditions } from "@/lib/rls";
import { z } from "zod";

const updateStatusSchema = z.object({
    id: z.number().int().positive(),
    status: z.enum(["active", "inactive", "mobilized", "alumning"]),
});

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

        const body = await request.json();
        const validation = updateStatusSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const { id, status } = validation.data;

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
            where: { id }
        });

        if (!existingStudent) {
            return NextResponse.json(
                { error: "Student not found" },
                { status: 404 }
            );
        }

        // Apply RLS check
        const rlsConditions = generateRLSConditions(userScope);
        if (rlsConditions.regionId && existingStudent.regionId !== rlsConditions.regionId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (rlsConditions.universityId && existingStudent.universityId !== rlsConditions.universityId) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Update student status
        const updatedStudent = await prisma.student.update({
            where: { id },
            data: {
                status: status as any,
                updatedAt: new Date(),
            },
            include: {
                region: true,
                university: true,
                smallgroup: true,
            }
        });

        return NextResponse.json(updatedStudent, { status: 200 });

    } catch (error) {
        console.error("Error updating student status:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
