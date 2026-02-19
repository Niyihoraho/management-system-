import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

interface RouteParams {
    params: { id: string };
}

export async function GET(req: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = parseInt(params.id);

        const financialSupport = await prisma.financialsupport.findUnique({
            where: { id },
            include: {
                graduate: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        provinceId: true,
                        residenceProvince: true,
                        residenceDistrict: true,
                        residenceSector: true,
                        profession: true,
                        graduationYear: true,
                        university: true,
                    }
                }
            }
        });

        if (!financialSupport) {
            return NextResponse.json(
                { error: 'Financial support record not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(financialSupport);

    } catch (error) {
        console.error('Error fetching financial support:', error);
        return NextResponse.json(
            { error: 'Failed to fetch financial support' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const id = parseInt(params.id);
        const body = await req.json();

        const { supportStatus, supportFrequency, supportAmount, enableReminder, status, notes } = body;

        // Recalculate next reminder date if frequency changed or reminder enabled
        let updateData: any = {
            ...(supportStatus && { supportStatus }),
            ...(supportFrequency !== undefined && { supportFrequency }),
            ...(supportAmount !== undefined && { supportAmount }),
            ...(enableReminder !== undefined && { enableReminder }),
            ...(status && { status }),
            ...(notes !== undefined && { notes }),
        };

        // If reminder settings changed, recalculate next reminder date
        if (enableReminder && supportFrequency) {
            updateData.nextReminderDate = calculateNextReminderDate(supportFrequency);
        } else if (enableReminder === false) {
            updateData.nextReminderDate = null;
        }

        updateData.updatedAt = new Date();

        const financialSupport = await prisma.financialsupport.update({
            where: { id },
            data: updateData,
            include: {
                graduate: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });

        return NextResponse.json(financialSupport);

    } catch (error) {
        console.error('Error updating financial support:', error);
        return NextResponse.json(
            { error: 'Failed to update financial support' },
            { status: 500 }
        );
    }
}

function calculateNextReminderDate(frequency: string): Date {
    const now = new Date();
    const nextDate = new Date(now);

    switch (frequency) {
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

    return nextDate;
}
