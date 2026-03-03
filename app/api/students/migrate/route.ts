import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserScope } from "@/lib/rls";
import { cacheDel } from "@/lib/cache";

export async function POST(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (["smallgroup", "graduatesmallgroup"].includes(userScope.scope)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { studentId } = body;

        if (!studentId) {
            return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
        }

        // 1. Fetch Student Data
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                university: true,
                region: true,
                smallgroup: true,
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Scope checks
        if (userScope.scope === 'region' && userScope.regionId && student.regionId !== userScope.regionId) {
            return NextResponse.json({ error: "Forbidden: student outside your region" }, { status: 403 });
        }

        if (userScope.scope === 'university' && userScope.universityId && student.universityId !== userScope.universityId) {
            return NextResponse.json({ error: "Forbidden: student outside your university" }, { status: 403 });
        }

        if (student.status !== 'active') {
            return NextResponse.json(
                { error: "This student already has a pending migration or is not in active status." },
                { status: 409 }
            );
        }

        const pendingRequests = await prisma.registrationrequest.findMany({
            where: { status: 'PENDING' },
            select: { payload: true },
        });

        const hasPendingFlow = pendingRequests.some((requestRow) => {
            const payload = requestRow.payload as Record<string, unknown> | null;
            const sourceStudentId = typeof payload?.sourceStudentId === 'number' ? payload.sourceStudentId : null;
            return sourceStudentId === student.id;
        });

        if (hasPendingFlow) {
            return NextResponse.json(
                { error: "This student already has a pending approval request." },
                { status: 409 }
            );
        }

        // 2. Mark as migrating only. Student completes public migration form later.
        await prisma.student.update({
            where: { id: student.id },
            data: {
                status: 'migrating' as any,
                updatedAt: new Date(),
            },
        });

        await Promise.all([
            cacheDel(`students:*:${student.id}`),
            cacheDel('students:list:*'),
            cacheDel('stats:*'),
        ]);

        return NextResponse.json({ success: true, studentId: student.id, status: 'migrating' });

    } catch (error: any) {
        console.error("Migration error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to migrate student" },
            { status: 500 }
        );
    }
}
