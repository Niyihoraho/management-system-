import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { studentId, graduationYear, profession, phone, email, residenceProvince, residenceDistrict, residenceSector } = body;

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

        // 2. Perform Migration in Transaction
        const result = await prisma.$transaction(async (tx) => {
            // A. Archive Student
            await tx.student_archive.create({
                data: {
                    studentId: student.id,
                    jsonData: {
                        originalId: student.id,
                        fullName: student.fullName,
                        phone: student.phone,
                        email: student.email,
                        course: student.course,
                        yearOfStudy: student.yearOfStudy,
                        placeOfBirthProvince: student.placeOfBirthProvince,
                        placeOfBirthDistrict: student.placeOfBirthDistrict,
                        placeOfBirthSector: student.placeOfBirthSector,
                        universityId: student.universityId,
                        universityName: student.university.name,
                        regionId: student.regionId,
                        regionName: student.region?.name || null,
                        smallGroupId: student.smallGroupId,
                        smallGroupName: student.smallgroup?.name || null,
                    }
                }
            });

            // B. Create Graduate
            const graduate = await tx.graduate.create({
                data: {
                    fullName: student.fullName,
                    phone: phone || student.phone,
                    email: email || student.email,
                    university: student.university.name,
                    course: student.course,
                    graduationYear: graduationYear ? parseInt(graduationYear) : new Date().getFullYear(),
                    profession: profession || null,

                    // Location mappings (Residence defaults to Place of Birth if not provided)
                    residenceProvince: residenceProvince || student.placeOfBirthProvince,
                    residenceDistrict: residenceDistrict || student.placeOfBirthDistrict,
                    residenceSector: residenceSector || student.placeOfBirthSector,

                    status: 'active',
                    updatedAt: new Date(),
                }
            });

            // C. Delete Student
            await tx.student.delete({
                where: { id: student.id }
            });

            return graduate;
        });

        return NextResponse.json({ success: true, graduate: result });

    } catch (error: any) {
        console.error("Migration error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to migrate student" },
            { status: 500 }
        );
    }
}
