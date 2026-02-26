import { NextResponse } from 'next/server';
import { prisma, getPrismaClient } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';
import { z } from 'zod';
import type { Prisma } from '@/lib/generated/prisma';
import { cacheGet, cacheSet, cacheDel } from '@/lib/cache';

const gbuDataSchema = z.object({
    universityId: z.number(),
    year: z.number().int().min(2000).max(2100).default(new Date().getFullYear()),
    activeMembers: z.number().min(0),
    maleMembers: z.number().min(0).default(0),
    femaleMembers: z.number().min(0).default(0),
    cells: z.number().min(0),
    discipleshipGroups: z.number().min(0),
    studentsInDiscipleship: z.number().min(0),
    savedStudents: z.number().min(0),
});

export async function GET(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['superadmin', 'national', 'region', 'university'].includes(userScope.scope)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const preferPrimary = (request as any).headers?.get?.('x-read-after-write') === '1';
        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get('regionId');
        const year = searchParams.get('year');

        const where: Prisma.GBUDataWhereInput = {};

        // Enforce scope-level filtering for region users
        if (userScope.scope === 'region') {
            if (!userScope.regionId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            where.university = { is: { regionId: userScope.regionId } };
        }

        // Enforce scope-level filtering for university users
        if (userScope.scope === 'university') {
            if (!userScope.universityId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            where.universityId = userScope.universityId;
        }

        if (regionId) {
            const parsedRegionId = Number(regionId);
            if (Number.isNaN(parsedRegionId)) return NextResponse.json({ error: 'Invalid regionId' }, { status: 400 });

            if (userScope.scope === 'region' && userScope.regionId !== parsedRegionId) {
                return NextResponse.json({ error: 'Access denied to requested region' }, { status: 403 });
            }

            if (userScope.scope === 'university' && userScope.regionId && userScope.regionId !== parsedRegionId) {
                return NextResponse.json({ error: 'Access denied to requested region' }, { status: 403 });
            }

            where.university = { is: { regionId: parsedRegionId } };
        }

        if (year) {
            const parsedYear = Number(year);
            if (Number.isNaN(parsedYear)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
            where.year = parsedYear;
        }

        const effectiveRegion = regionId ?? (userScope.scope === 'region' ? String(userScope.regionId ?? 'none') : 'all');
        const effectiveUniversity = userScope.scope === 'university' ? String(userScope.universityId ?? 'none') : 'all';
        const cacheKey = `gbu-data:${userScope.userId}:${userScope.scope}:${effectiveRegion}:${effectiveUniversity}:${year ?? 'all'}`;
        if (!preferPrimary) {
            const cached = await cacheGet<any[]>(cacheKey);
            if (cached) return NextResponse.json(cached);
        }

        const db = getPrismaClient('read', { preferPrimary });
        const data = await db.gBUData.findMany({
            where,
            include: { university: { include: { region: true } } },
            orderBy: [{ year: 'desc' }, { updatedAt: 'desc' }],
        });

        if (!preferPrimary) await cacheSet(cacheKey, data, { ttlSeconds: 300 });
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching GBU data:', error);
        return NextResponse.json({ error: 'Failed to fetch GBU data' }, { status: 500 });
    }
}

async function calculateJoinedStudents(universityId: number, year: number) {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    return await prisma.student.count({ where: { universityId, createdAt: { gte: startDate, lt: endDate } } });
}

export async function POST(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['superadmin', 'national', 'region'].includes(userScope.scope)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = gbuDataSchema.safeParse(body);
        if (!validatedData.success) return NextResponse.json({ error: 'Invalid data', details: validatedData.error.format() }, { status: 400 });

        const { universityId, year, ...data } = validatedData.data;

        if (userScope.scope === 'region' && userScope.regionId) {
            const university = await prisma.university.findUnique({
                where: { id: universityId },
                select: { regionId: true },
            });

            if (!university || university.regionId !== userScope.regionId) {
                return NextResponse.json({ error: 'Access denied to selected university' }, { status: 403 });
            }
        }

        const existing = await prisma.gBUData.findUnique({ where: { universityId_year: { universityId, year } } });
        if (existing) return NextResponse.json({ error: `Data for this university in ${year} already exists` }, { status: 409 });

        const joinedThisYear = await calculateJoinedStudents(universityId, year);
        const newData = await prisma.gBUData.create({
            data: { ...data, universityId, year, joinedThisYear, updatedAt: new Date() },
            include: { university: true },
        });

        await cacheDel('gbu-data:*');
        await cacheDel('stats:*');
        return NextResponse.json(newData, { status: 201 });
    } catch (error) {
        console.error('Error creating GBU data:', error);
        return NextResponse.json({ error: 'Failed to create GBU data' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['superadmin', 'national', 'region'].includes(userScope.scope)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const queryId = searchParams.get('id');
        const updateSchema = gbuDataSchema.omit({ universityId: true }).partial();
        const body = await request.json();
        const { id: bodyId, ...payload } = body ?? {};
        const validatedData = updateSchema.safeParse(payload);
        if (!validatedData.success) return NextResponse.json({ error: 'Invalid data', details: validatedData.error.format() }, { status: 400 });

        const resolvedId = queryId ?? bodyId ?? null;
        if (resolvedId === null) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        const numericId = Number(resolvedId);
        if (Number.isNaN(numericId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

        const current = await prisma.gBUData.findUnique({
            where: { id: numericId },
            include: { university: { select: { regionId: true } } },
        });
        if (!current) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        if (userScope.scope === 'region' && userScope.regionId && current.university.regionId !== userScope.regionId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const targetYear = validatedData.data.year ?? current.year;
        const joinedThisYear = await calculateJoinedStudents(current.universityId, targetYear);
        const updatedData = await prisma.gBUData.update({
            where: { id: numericId },
            data: { ...validatedData.data, joinedThisYear },
            include: { university: true },
        });

        await cacheDel('gbu-data:*');
        await cacheDel('stats:*');
        return NextResponse.json(updatedData);
    } catch (error) {
        console.error('Error updating GBU data:', error);
        return NextResponse.json({ error: 'Failed to update GBU data' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['superadmin', 'national', 'region'].includes(userScope.scope)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const existing = await prisma.gBUData.findUnique({
            where: { id: parseInt(id) },
            include: { university: { select: { regionId: true } } },
        });

        if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        if (userScope.scope === 'region' && userScope.regionId && existing.university.regionId !== userScope.regionId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        await prisma.gBUData.delete({ where: { id: parseInt(id) } });

        await cacheDel('gbu-data:*');
        await cacheDel('stats:*');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting GBU data:', error);
        return NextResponse.json({ error: 'Failed to delete GBU data' }, { status: 500 });
    }
}
