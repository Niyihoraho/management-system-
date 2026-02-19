import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createStudentSchema } from "../validation/student";
import { createGraduateSchema } from "../validation/graduate";

interface ImportResult {
    success: number;
    errors: Array<{ row: number; error: string; data?: any }>;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { members } = body; // Expecting array of objects

        if (!Array.isArray(members)) {
            return NextResponse.json(
                { error: "Expected array of records" },
                { status: 400 }
            );
        }

        const results: ImportResult = {
            success: 0,
            errors: []
        };

        // Helper function to handle empty strings and null values
        const handleEmptyValue = (value: unknown) => {
            if (value === "" || value === null || value === undefined) {
                return null;
            }
            return value;
        };

        // Helper function to handle numeric values
        const handleNumericValue = (value: unknown) => {
            if (value === "" || value === null || value === undefined) {
                return null;
            }
            const num = Number(value);
            return isNaN(num) ? null : num;
        };

        // Process each record
        for (let i = 0; i < members.length; i++) {
            const rawData = members[i];
            const rowNumber = i + 1;
            const type = rawData.type?.toLowerCase();

            try {
                if (type === 'student') {
                    // Map generic fields to Student specific fields
                    const studentData = {
                        fullName: `${rawData.firstname || ''} ${rawData.secondname || ''}`.trim(),
                        email: handleEmptyValue(rawData.email),
                        phone: handleEmptyValue(rawData.phone),
                        universityId: handleNumericValue(rawData.universityId),
                        smallGroupId: handleNumericValue(rawData.smallGroupId),
                        regionId: handleNumericValue(rawData.regionId),
                        course: handleEmptyValue(rawData.faculty), // Mapping faculty to course
                        yearOfStudy: null, // Default
                        placeOfBirthDistrict: handleEmptyValue(rawData.placeOfBirthDistrict),
                        placeOfBirthSector: handleEmptyValue(rawData.placeOfBirthSector),
                        status: rawData.status?.toLowerCase() || 'active',
                    };

                    const validation = createStudentSchema.safeParse(studentData);

                    if (!validation.success) {
                        results.errors.push({
                            row: rowNumber,
                            error: `Student Validation failed: ${validation.error.issues.map(i => i.message).join(', ')}`,
                            data: rawData
                        });
                        continue;
                    }

                    await prisma.student.create({
                        data: {
                            ...validation.data,
                            status: validation.data.status as any,
                            updatedAt: new Date(),
                            universityId: validation.data.universityId as number // Casting for TS
                        }
                    });

                } else if (type === 'graduate' || type === 'alumni') {
                    // Map generic fields to Graduate specific fields
                    const graduateData = {
                        fullName: `${rawData.firstname || ''} ${rawData.secondname || ''}`.trim(),
                        email: handleEmptyValue(rawData.email),
                        phone: handleEmptyValue(rawData.phone),
                        university: handleEmptyValue(rawData.faculty), // Using faculty as university name/course context if needed, or null
                        course: handleEmptyValue(rawData.faculty),
                        graduationYear: rawData.graduationDate ? new Date(rawData.graduationDate).getFullYear() : null,
                        graduateGroupId: handleNumericValue(rawData.alumniGroupId) || handleNumericValue(rawData.graduateGroupId),
                        // regionId: handleNumericValue(rawData.regionId), // Removed as graduates don't have region
                        residenceDistrict: handleEmptyValue(rawData.placeOfBirthDistrict), // Assuming residence for now
                        residenceSector: handleEmptyValue(rawData.placeOfBirthSector),
                        status: rawData.status?.toLowerCase() || 'active',
                        isDiaspora: false,
                        financialSupport: false
                    };

                    const validation = createGraduateSchema.safeParse(graduateData);

                    if (!validation.success) {
                        results.errors.push({
                            row: rowNumber,
                            error: `Graduate Validation failed: ${validation.error.issues.map(i => i.message).join(', ')}`,
                            data: rawData
                        });
                        continue;
                    }

                    await prisma.graduate.create({
                        data: {
                            ...validation.data,
                            status: validation.data.status as any,
                            servingPillars: (validation.data.servingPillars || []) as any,
                            updatedAt: new Date()
                        }
                    });

                } else {
                    results.errors.push({
                        row: rowNumber,
                        error: `Unknown type: ${type}. Must be 'student' or 'graduate'`,
                        data: rawData
                    });
                    continue;
                }

                results.success++;
            } catch (error: any) {
                console.error(`Error importing row ${rowNumber}:`, error);

                let errorMessage = "Unknown error";
                if (error.code === 'P2002') {
                    errorMessage = "Email/Record already exists";
                } else {
                    errorMessage = error.message;
                }

                results.errors.push({
                    row: rowNumber,
                    error: errorMessage,
                    data: rawData
                });
            }
        }

        return NextResponse.json(results, { status: 200 });
    } catch (error: any) {
        console.error("Error in bulk import:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
