import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/rls";

const parseNumericId = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

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
        const studentId = parseNumericId(body?.studentId);
        const destinationRegionId = parseNumericId(body?.destinationRegionId);
        const destinationUniversityId = parseNumericId(body?.destinationUniversityId);

        if (!studentId || !destinationRegionId || !destinationUniversityId) {
            return NextResponse.json(
                { error: "studentId, destinationRegionId and destinationUniversityId are required" },
                { status: 400 }
            );
        }

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                university: { select: { id: true, name: true, regionId: true } },
            },
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        if (student.status !== "active") {
            return NextResponse.json(
                { error: "Only active students can be transferred to another campus." },
                { status: 409 }
            );
        }

        if (userScope.scope === "region" && userScope.regionId && student.regionId !== userScope.regionId) {
            return NextResponse.json({ error: "Forbidden: student outside your region" }, { status: 403 });
        }

        if (userScope.scope === "university" && userScope.universityId && student.universityId !== userScope.universityId) {
            return NextResponse.json({ error: "Forbidden: student outside your university" }, { status: 403 });
        }

        const destinationUniversity = await prisma.university.findUnique({
            where: { id: destinationUniversityId },
            select: { id: true, name: true, regionId: true },
        });

        if (!destinationUniversity) {
            return NextResponse.json({ error: "Destination university not found" }, { status: 404 });
        }

        if (destinationUniversity.regionId !== destinationRegionId) {
            return NextResponse.json(
                { error: "Destination university does not belong to selected destination region" },
                { status: 400 }
            );
        }

        if (destinationUniversity.id === student.universityId) {
            return NextResponse.json(
                { error: "Destination university must be different from current university" },
                { status: 400 }
            );
        }

        const pendingRequests = await prisma.registrationrequest.findMany({
            where: { status: "PENDING" },
            select: { payload: true },
        });

        const hasPendingFlow = pendingRequests.some((requestRow) => {
            const payload = requestRow.payload as Record<string, unknown> | null;
            return parseNumericId(payload?.sourceStudentId) === student.id;
        });

        if (hasPendingFlow) {
            return NextResponse.json(
                { error: "This student already has a pending approval request." },
                { status: 409 }
            );
        }

        const requestRow = await prisma.$transaction(async (tx) => {
            await tx.student.update({
                where: { id: student.id },
                data: {
                    status: "migrating" as any,
                    updatedAt: new Date(),
                },
            });

            return tx.registrationrequest.create({
                data: {
                    type: "student",
                    status: "PENDING",
                    fullName: student.fullName,
                    phone: student.phone,
                    email: student.email,
                    updatedAt: new Date(),
                    payload: {
                        source: "student_campus_transfer",
                        sourceStudentId: student.id,
                        fullName: student.fullName,
                        phone: student.phone,
                        email: student.email,
                        sex: student.sex,
                        course: student.course,
                        yearOfStudy: student.yearOfStudy,
                        sourceUniversityId: student.universityId,
                        sourceUniversity: student.university?.name || null,
                        sourceRegionId: student.regionId,
                        destinationRegionId,
                        destinationUniversityId: destinationUniversity.id,
                        destinationUniversity: destinationUniversity.name,
                        // Keep universityId/regionId aligned with destination for RLS/approval filtering
                        universityId: destinationUniversity.id,
                        university: destinationUniversity.name,
                        regionId: destinationRegionId,
                        province: student.placeOfBirthProvince,
                        district: student.placeOfBirthDistrict,
                        sector: student.placeOfBirthSector,
                        cell: student.placeOfBirthCell,
                        village: student.placeOfBirthVillage,
                    },
                },
            });
        });

        return NextResponse.json({ success: true, requestId: requestRow.id }, { status: 201 });
    } catch (error: any) {
        console.error("Campus transfer migration error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create campus transfer migration" },
            { status: 500 }
        );
    }
}
