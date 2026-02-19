import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [
            totalSupporters,
            wantToSupport,
            alreadySupporting,
            decidedLater,
            monthlySupporters,
            halfYearlySupporters,
            yearlySupporters,
            activeSupporters
        ] = await Promise.all([
            prisma.financialsupport.count(),
            prisma.financialsupport.count({ where: { supportStatus: 'want_to_support' } }),
            prisma.financialsupport.count({ where: { supportStatus: 'already_supporting' } }),
            prisma.financialsupport.count({ where: { supportStatus: 'later' } }),
            prisma.financialsupport.count({ where: { supportFrequency: 'monthly' } }),
            prisma.financialsupport.count({ where: { supportFrequency: 'half_year' } }),
            prisma.financialsupport.count({ where: { supportFrequency: 'full_year' } }),
            prisma.financialsupport.count({ where: { status: 'active' } })
        ]);

        const stats = {
            total: totalSupporters,
            byStatus: {
                want_to_support: wantToSupport,
                already_supporting: alreadySupporting,
                later: decidedLater
            },
            byFrequency: {
                monthly: monthlySupporters,
                half_year: halfYearlySupporters,
                full_year: yearlySupporters
            },
            activeRecords: activeSupporters
        };

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching financial support stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
