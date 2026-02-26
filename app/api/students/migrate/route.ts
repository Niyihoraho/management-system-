import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserScope } from "@/lib/rls";

export async function POST(request: NextRequest) {
    try {
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (["university", "smallgroup", "graduatesmallgroup"].includes(userScope.scope)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const {
            studentId,
            graduationYear,
            profession,
            phone,
            email,
            residenceProvince,
            residenceDistrict,
            residenceSector,
            provinceId,
            districtId,
            sectorId,
        } = body;

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

        // 2. Queue request and mark student inactive until approval
        const registrationRequest = await prisma.$transaction(async (tx) => {
            const created = await tx.registrationrequest.create({
                data: {
                    type: 'graduate',
                    status: 'PENDING',
                    fullName: student.fullName,
                    phone: phone || student.phone,
                    email: email || student.email,
                    payload: {
                        source: 'student_migration',
                        sourceStudentId: student.id,
                        fullName: student.fullName,
                        sex: student.sex,
                        phone: phone || student.phone,
                        email: email || student.email,
                        university: student.university.name,
                        universityId: student.universityId,
                        regionId: student.regionId,
                        course: student.course,
                        graduationYear: graduationYear ? parseInt(graduationYear) : new Date().getFullYear(),
                        profession: profession || null,
                        residenceProvince: residenceProvince || student.placeOfBirthProvince,
                        residenceDistrict: residenceDistrict || student.placeOfBirthDistrict,
                        residenceSector: residenceSector || student.placeOfBirthSector,
                        provinceId: provinceId || null,
                        districtId: districtId || null,
                        sectorId: sectorId || null,
                        isDiaspora: false,
                        financialSupport: false,
                    },
                    updatedAt: new Date(),
                },
            });

            await tx.student.update({
                where: { id: student.id },
                data: {
                    status: 'inactive',
                    updatedAt: new Date(),
                },
            });

            return created;
        });

        return NextResponse.json({ success: true, requestId: registrationRequest.id });

    } catch (error: any) {
        console.error("Migration error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to migrate student" },
            { status: 500 }
        );
    }
}
