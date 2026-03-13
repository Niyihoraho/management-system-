import { NextResponse } from 'next/server';
import { prisma, getPrismaClient } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getUserScope } from '@/lib/rls';
import { cacheGet, cacheSet, cacheDel } from '@/lib/cache';

const toJsonSafe = <T>(value: T): T => {
    return JSON.parse(
        JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
    ) as T;
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

        const preferPrimary = (req as any).headers?.get?.('x-read-after-write') === '1';
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const search = searchParams.get('search');
        const provinceId = searchParams.get('provinceId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        // Cache only when no search/filter (paginated list with filters = skip cache)
        const cacheKey = `financial-support:${userScope.userId}:${userScope.scope}:${status ?? 'all'}:${provinceId ?? 'all'}:p${page}`;
        if (!preferPrimary && !search) {
            const cached = await cacheGet<any>(cacheKey);
            if (cached) return NextResponse.json(toJsonSafe(cached));
        }

        const where: any = {};
        if (status && status !== 'all') where.supportStatus = status;
        if (provinceId && provinceId !== 'all') where.graduate = { provinceId: BigInt(provinceId) };

        const searchConditions: any[] = [];
        if (search) {
            searchConditions.push(
                { graduate: { fullName: { contains: search, mode: 'insensitive' } } },
                { graduate: { email: { contains: search, mode: 'insensitive' } } },
                { graduate: { phone: { contains: search } } }
            );
        }
        if (searchConditions.length > 0) where.OR = searchConditions;

        const db = getPrismaClient('read', { preferPrimary });
        const [financialSupports, total] = await Promise.all([
            db.financialsupport.findMany({
                where,
                include: {
                    graduate: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                            provinceId: true,
                            isDiaspora: true,
                            residenceProvince: true,
                            residenceDistrict: true,
                            updatedAt: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.financialsupport.count({ where })
        ]);

        const result = {
            financialSupports,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
        const jsonSafeResult = toJsonSafe(result);

        if (!preferPrimary && !search) {
            await cacheSet(cacheKey, jsonSafeResult, { ttlSeconds: 120 });
        }
        return NextResponse.json(jsonSafeResult);
    } catch (error) {
        console.error('Error fetching financial supports:', error);
        return NextResponse.json({ error: 'Failed to fetch financial supports' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope || !['superadmin', 'national'].includes(userScope.scope)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { graduateId, supportStatus, supportFrequency, supportAmount, enableReminder } = body;

        const graduate = await prisma.graduate.findUnique({ where: { id: graduateId } });
        if (!graduate) return NextResponse.json({ error: 'Graduate not found' }, { status: 404 });

        const existingSupport = await prisma.financialsupport.findUnique({ where: { graduateId } });
        if (existingSupport) {
            return NextResponse.json({ error: 'Financial support record already exists for this graduate' }, { status: 409 });
        }

        let nextReminderDate = null;
        if (enableReminder && supportFrequency) {
            nextReminderDate = calculateNextReminderDate(supportFrequency);
        }

        const financialSupport = await prisma.financialsupport.create({
            data: { graduateId, supportStatus, supportFrequency, supportAmount, enableReminder, nextReminderDate, status: 'active', updatedAt: new Date() },
            include: { graduate: { select: { id: true, fullName: true, email: true, phone: true } } }
        });

        await cacheDel('financial-support:*');
        return NextResponse.json(financialSupport, { status: 201 });
    } catch (error) {
        console.error('Error creating financial support:', error);
        return NextResponse.json({ error: 'Failed to create financial support' }, { status: 500 });
    }
}

function calculateNextReminderDate(frequency: string): Date {
    const now = new Date();
    const nextDate = new Date(now);
    switch (frequency) {
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'half_year': nextDate.setMonth(nextDate.getMonth() + 6); break;
        case 'full_year': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    }
    return nextDate;
}
