import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GraduatePillar, SupportFrequency, SupportStatus } from '@/lib/generated/prisma';
import { getUserScope } from "@/lib/rls";
import { cacheDel } from '@/lib/cache';

const parseNumericId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get user scope for permissions
        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const { id } = await req.json();

        const request = await prisma.registrationrequest.findUnique({
            where: { id },
            include: {
                invitationlink: {
                    include: {
                        university: true
                    }
                }
            },
        });

        const payload = request?.payload as Record<string, unknown> | null;
        const isStudentMigration = payload?.source === 'student_migration';

        if (!request || request.status !== 'PENDING') {
            return new NextResponse('Request not found or already processed', { status: 404 });
        }

        // Authorization Check
        if (userScope.scope === 'region') {
            const requestRegionId = request.invitationlink?.regionId ?? parseNumericId(payload?.regionId);
            if (!requestRegionId || requestRegionId !== userScope.regionId) {
                return new NextResponse('Forbidden: You can only approve requests for your region', { status: 403 });
            }
        } else if (userScope.scope === 'university') {
            // University admins can approve if the request belongs to their university
            const payloadUniversityId = parseNumericId(payload?.universityId);
            const hasUniversity = request.invitationlink?.university?.some(u => u.id === userScope.universityId)
                || payloadUniversityId === userScope.universityId;
            if (!hasUniversity) {
                return new NextResponse('Forbidden: You can only approve requests for your university', { status: 403 });
            }
        } else if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
            // Allowed
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!request || request.status !== 'PENDING') {
            return new NextResponse('Request not found or already processed', { status: 404 });
        }

        const payloadData = (payload ?? {}) as Record<string, any>;
        const migrationStudentId = typeof payloadData.sourceStudentId === 'number' ? payloadData.sourceStudentId : null;
        const normalizedSex = typeof payloadData.sex === 'string'
            ? (payloadData.sex.toLowerCase() === 'male' ? 'Male' : payloadData.sex.toLowerCase() === 'female' ? 'Female' : null)
            : null;

        if (!normalizedSex) {
            return new NextResponse('Sex is required to approve this registration', { status: 422 });
        }

        const runApproval = async (includeSex: boolean) => prisma.$transaction(async (tx) => {

            if (request.type === 'student') {
                // Ensure universityId is valid
                const uniId = parseInt(String(payloadData.universityId));
                if (isNaN(uniId)) throw new Error("Invalid University ID");

                await tx.student.create({
                    data: {
                        fullName: request.fullName || payloadData.fullName,
                        ...(includeSex ? { sex: normalizedSex } : {}),
                        phone: request.phone || payloadData.phone,
                        email: request.email || payloadData.email,
                        universityId: uniId,
                        yearOfStudy: parseInt(String(payloadData.yearOfStudy)) || 1,
                        placeOfBirthProvince: payloadData.province,
                        placeOfBirthDistrict: payloadData.district,
                        status: 'active',
                        regionId: request.invitationlink?.regionId,
                        updatedAt: new Date(),
                    }
                });
            } else if (request.type === 'graduate') {
                const parsedSupportStatus = Object.values(SupportStatus).includes(payloadData.supportStatus)
                    ? payloadData.supportStatus
                    : null;

                const parsedSupportFrequency = Object.values(SupportFrequency).includes(payloadData.supportFrequency)
                    ? payloadData.supportFrequency
                    : null;

                const parsedPillars = Array.isArray(payloadData.servingPillars)
                    ? payloadData.servingPillars.filter((pillar): pillar is GraduatePillar =>
                        Object.values(GraduatePillar).includes(pillar as GraduatePillar)
                    )
                    : [];

                const parsedGraduateGroupId = parseNumericId(payloadData.graduateGroupId);
                const isNewCellMember = payloadData.attendGraduateCell === false || Boolean(payloadData.noCellAvailable);
                let resolvedProvinceId: bigint | null = null;
                if (typeof payloadData.provinceId === 'string' && payloadData.provinceId) {
                    resolvedProvinceId = BigInt(payloadData.provinceId);
                } else if (typeof payloadData.residenceProvince === 'string' && payloadData.residenceProvince.trim() !== '') {
                    const province = await tx.province.findFirst({
                        where: { name: { equals: payloadData.residenceProvince.trim(), mode: 'insensitive' } }
                    });
                    if (province) resolvedProvinceId = province.id;
                }

                const graduate = await tx.graduate.create({
                    data: {
                        fullName: request.fullName || payloadData.fullName,
                        ...(includeSex ? { sex: normalizedSex } : {}),
                        phone: request.phone || payloadData.phone,
                        email: request.email || payloadData.email,
                        university: payloadData.university,
                        course: payloadData.course,
                        graduationYear: parseInt(String(payloadData.graduationYear)) || new Date().getFullYear(),
                        isDiaspora: Boolean(payloadData.isDiaspora),
                        residenceProvince: payloadData.residenceProvince,
                        residenceDistrict: payloadData.residenceDistrict,
                        residenceSector: payloadData.residenceSector,
                        profession: payloadData.profession,
                        servingPillars: parsedPillars,
                        financialSupport: Boolean(payloadData.financialSupport),
                        graduateGroupId: parsedGraduateGroupId,
                        noCellAvailable: isNewCellMember,
                        supportStatus: parsedSupportStatus,
                        supportFrequency: parsedSupportFrequency,
                        supportAmount: payloadData.supportAmount,
                        enableReminder: Boolean(payloadData.enableReminder),
                        status: 'active',
                        provinceId: resolvedProvinceId,
                        updatedAt: new Date(),
                    }
                });

                // Always create a FinancialSupport record for every new graduate.
                // Use the supportStatus from the form if valid, otherwise default to 'later' (undecided).
                const financialSupportStatus: SupportStatus = parsedSupportStatus ?? SupportStatus.later;

                // Calculate next reminder date if enabled
                let nextReminderDate = null;
                if (payloadData.enableReminder && parsedSupportFrequency) {
                    const now = new Date();
                    const nextDate = new Date(now);

                    switch (parsedSupportFrequency) {
                        case 'monthly':
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            break;
                        case 'half_year':
                            nextDate.setMonth(nextDate.getMonth() + 6);
                            break;
                        case 'full_year':
                            nextDate.setFullYear(nextDate.getFullYear() + 1);
                            break;
                    }

                    nextReminderDate = nextDate;
                }

                await tx.financialsupport.create({
                    data: {
                        graduateId: graduate.id,
                        supportStatus: financialSupportStatus,
                        supportFrequency: parsedSupportFrequency,
                        supportAmount: payloadData.supportAmount ?? null,
                        enableReminder: Boolean(payloadData.enableReminder),
                        nextReminderDate,
                        status: 'active',
                        updatedAt: new Date(),
                    }
                });

                // If this came from student migration, archive and remove source student on approval
                if (isStudentMigration && migrationStudentId) {
                    const sourceStudent = await tx.student.findUnique({
                        where: { id: migrationStudentId },
                        include: {
                            university: true,
                            region: true,
                            smallgroup: true,
                        },
                    });

                    if (sourceStudent) {
                        await tx.student_archive.create({
                            data: {
                                studentId: sourceStudent.id,
                                jsonData: {
                                    originalId: sourceStudent.id,
                                    fullName: sourceStudent.fullName,
                                    phone: sourceStudent.phone,
                                    email: sourceStudent.email,
                                    course: sourceStudent.course,
                                    yearOfStudy: sourceStudent.yearOfStudy,
                                    placeOfBirthProvince: sourceStudent.placeOfBirthProvince,
                                    placeOfBirthDistrict: sourceStudent.placeOfBirthDistrict,
                                    placeOfBirthSector: sourceStudent.placeOfBirthSector,
                                    universityId: sourceStudent.universityId,
                                    universityName: sourceStudent.university.name,
                                    regionId: sourceStudent.regionId,
                                    regionName: sourceStudent.region?.name || null,
                                    smallGroupId: sourceStudent.smallGroupId,
                                    smallGroupName: sourceStudent.smallgroup?.name || null,
                                    migratedGraduateId: graduate.id,
                                },
                            },
                        });

                        await tx.student.delete({
                            where: { id: sourceStudent.id },
                        });
                    }
                }
            }

            // Update Request Status
            await tx.registrationrequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    reviewedById: session.user.id,
                    processedAt: new Date(),
                }
            });
        }, { timeout: 30000 });

        try {
            await runApproval(true);
        } catch (error) {
            const code = typeof error === 'object' && error !== null && 'code' in error
                ? String((error as { code?: unknown }).code)
                : '';
            const message = typeof error === 'object' && error !== null && 'message' in error
                ? String((error as { message?: unknown }).message)
                : '';

            // Backward compatibility when DB schema is not yet updated with sex column.
            if (code === 'P2022' && /sex/i.test(message)) {
                await runApproval(false);
            } else {
                throw error;
            }
        }

        await Promise.all([
            cacheDel('graduates:list:*'),
            cacheDel('graduates:*'),
            cacheDel('financial-support:*'),
            cacheDel('stats:*'),
            cacheDel('registrations:*'),
        ]);

        return new NextResponse('Approved successfully', { status: 200 });

    } catch (error) {
        console.error('Approval error:', error);
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const code = String((error as { code?: unknown }).code);
            if (code === 'P2002') {
                return new NextResponse('A member with this email already exists', { status: 409 });
            }
            if (code === 'P2024') {
                return new NextResponse('Database is busy. Please retry in a few seconds.', { status: 503 });
            }
        }
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
