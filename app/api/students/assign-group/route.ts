import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope, generateRLSConditions } from "@/lib/rls";
import { z } from "zod";

const assignGroupSchema = z.object({
    studentId: z.number().int().positive(),
    smallGroupId: z.number().int().positive().nullable(),
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
        const validation = assignGroupSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const { studentId, smallGroupId } = validation.data;

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
            where: { id: studentId }
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
            // NOTE: Users should probably be allowed to assign groups if they have access to the student?
            // But if they are restricted to a specific small group, they shouldn't be able to move students out/in arbitrarily unless logic allows.
            // For now, if they are restricted to a small group, they can probably only see students in that group.
            // Taking a strict approach: if you are locked to a small group, you can't change a student's group (unless it's to your own, but they are already there).
            // actually, if scope is smallgroup, you probably can't change the group field at all.
            return NextResponse.json({ error: "Access denied: Cannot change student group with your restricted access" }, { status: 403 });
        }

        // If assigning to a group, verify group exists and belongs to correct university
        if (smallGroupId) {
            const smallGroup = await prisma.smallGroup.findUnique({
                where: { id: smallGroupId }
            });

            if (!smallGroup) {
                return NextResponse.json({ error: "Small group not found" }, { status: 400 });
            }

            if (smallGroup.universityId !== existingStudent.universityId) {
                return NextResponse.json(
                    { error: "Small group must belong to the same university as the student" },
                    { status: 400 }
                );
            }
        }

        // Update the student
        const updatedStudent = await prisma.student.update({
            where: { id: studentId },
            data: {
                smallGroupId: smallGroupId,
                updatedAt: new Date(),
            },
            include: {
                smallgroup: true,
            } // Return the updated small group data
        });

        return NextResponse.json(updatedStudent, { status: 200 });

    } catch (error) {
        console.error("Error assigning group:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
