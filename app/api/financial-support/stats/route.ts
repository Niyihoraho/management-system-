import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getUserScope } from '@/lib/rls';
import { cacheGet, cacheSet } from '@/lib/cache';

type FinancialSupportStats = {
    total: number;
    byStatus: Record<'want_to_support' | 'already_supporting' | 'later', number>;
    byFrequency: Record<'monthly' | 'half_year' | 'full_year', number>;
    activeRecords: number;
};

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope || !['superadmin', 'national'].includes(userScope.scope)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const preferPrimaryRead = req.headers.get('x-read-after-write') === '1';
        const db = getPrismaClient('read', { preferPrimary: preferPrimaryRead });

        const cacheKey = `financial-support:stats:${userScope.userId}:${userScope.scope}`;
        if (!preferPrimaryRead) {
            const cached = await cacheGet<FinancialSupportStats>(cacheKey);
            if (cached) {
                return NextResponse.json(cached);
            }
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
            db.financialsupport.count(),
            db.financialsupport.count({ where: { supportStatus: 'want_to_support' } }),
            db.financialsupport.count({ where: { supportStatus: 'already_supporting' } }),
            db.financialsupport.count({ where: { supportStatus: 'later' } }),
            db.financialsupport.count({ where: { supportFrequency: 'monthly' } }),
            db.financialsupport.count({ where: { supportFrequency: 'half_year' } }),
            db.financialsupport.count({ where: { supportFrequency: 'full_year' } }),
            db.financialsupport.count({ where: { status: 'active' } })
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

        if (!preferPrimaryRead) {
            await cacheSet(cacheKey, stats, { ttlSeconds: 120 });
        }

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching financial support stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
