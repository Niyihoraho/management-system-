import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getUserScope } from '@/lib/rls';
import { cacheDel } from '@/lib/cache';

interface RouteParams {
    params: { id: string };
}

export async function POST(req: Request, { params }: RouteParams) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope || !['superadmin', 'national'].includes(userScope.scope)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const id = parseInt(params.id, 10);
        if (Number.isNaN(id)) {
            return NextResponse.json({ error: 'Invalid financial support ID' }, { status: 400 });
        }

        const support = await prisma.financialsupport.findUnique({
            where: { id },
            include: {
                graduate: {
                    select: {
                        fullName: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        if (!support) {
            return NextResponse.json({ error: 'Financial support record not found' }, { status: 404 });
        }

        if (!support.enableReminder) {
            return NextResponse.json(
                { error: 'Reminder is disabled for this supporter. Enable it first in Edit Details.' },
                { status: 400 }
            );
        }

        const updated = await prisma.financialsupport.update({
            where: { id },
            data: {
                lastReminderSent: new Date(),
                nextReminderDate: support.supportFrequency
                    ? calculateNextReminderDate(support.supportFrequency)
                    : null,
                updatedAt: new Date(),
            },
            select: {
                id: true,
                lastReminderSent: true,
                nextReminderDate: true,
            },
        });

        await cacheDel('financial-support:*');

        return NextResponse.json({
            message: `Reminder recorded for ${support.graduate.fullName}`,
            recipient: support.graduate.email || support.graduate.phone || null,
            financialSupport: updated,
        });
    } catch (error) {
        console.error('Error sending financial support reminder:', error);
        return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 });
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
