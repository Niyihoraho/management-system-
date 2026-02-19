import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserScope } from "@/lib/rls";

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

        if (!request || request.status !== 'PENDING') {
            return new NextResponse('Request not found or already processed', { status: 404 });
        }

        // Authorization Check
        if (userScope.scope === 'region') {
            if (!request.invitationlink?.regionId || request.invitationlink.regionId !== userScope.regionId) {
                return new NextResponse('Forbidden: You can only approve requests for your region', { status: 403 });
            }
        } else if (userScope.scope === 'university') {
            // University admins can approve if the invitation link includes their university
            const hasUniversity = request.invitationlink?.university?.some(u => u.id === userScope.universityId);
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

        const payload = request.payload as any;

        // Transaction to create member and update request
        // Note: We are creating a Member record (Student or Graduate), NOT necessarily a User login account yet.
        // User login creation usually happens via invitation or separate flow, or we can auto-create.
        // For now, let's just create the member record as getting them into the DB is the goal.

        await prisma.$transaction(async (tx) => {
            if (request.type === 'student') {
                // Ensure universityId is valid
                const uniId = parseInt(payload.universityId);
                if (isNaN(uniId)) throw new Error("Invalid University ID");

                await tx.student.create({
                    data: {
                        fullName: request.fullName || payload.fullName,
                        phone: request.phone || payload.phone,
                        email: request.email || payload.email,
                        universityId: uniId,
                        yearOfStudy: parseInt(payload.yearOfStudy) || 1,
                        placeOfBirthProvince: payload.province,
                        placeOfBirthDistrict: payload.district,
                        status: 'active',
                        regionId: request.invitationlink?.regionId,
                        updatedAt: new Date(),
                    }
                });
            } else if (request.type === 'graduate') {
                const graduate = await tx.graduate.create({
                    data: {
                        fullName: request.fullName || payload.fullName,
                        phone: request.phone || payload.phone,
                        email: request.email || payload.email,
                        university: payload.university,
                        course: payload.course,
                        graduationYear: parseInt(payload.graduationYear) || new Date().getFullYear(),
                        isDiaspora: Boolean(payload.isDiaspora),
                        residenceProvince: payload.residenceProvince,
                        residenceDistrict: payload.residenceDistrict,
                        residenceSector: payload.residenceSector,
                        profession: payload.profession,
                        servingPillars: payload.servingPillars || [],
                        financialSupport: Boolean(payload.financialSupport),
                        supportStatus: payload.supportStatus,
                        supportFrequency: payload.supportFrequency,
                        supportAmount: payload.supportAmount,
                        enableReminder: Boolean(payload.enableReminder),
                        status: 'active',
                        updatedAt: new Date(),
                    }
                });

                // Create FinancialSupport record if financial support is enabled
                if (payload.financialSupport && payload.supportStatus) {
                    // Calculate next reminder date if enabled
                    let nextReminderDate = null;
                    if (payload.enableReminder && payload.supportFrequency) {
                        const now = new Date();
                        const nextDate = new Date(now);

                        switch (payload.supportFrequency) {
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
                            supportStatus: payload.supportStatus,
                            supportFrequency: payload.supportFrequency,
                            supportAmount: payload.supportAmount,
                            enableReminder: Boolean(payload.enableReminder),
                            nextReminderDate,
                            status: 'active',
                            updatedAt: new Date(),
                        }
                    });
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
        });

        return new NextResponse('Approved successfully', { status: 200 });

    } catch (error) {
        console.error('Approval error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
