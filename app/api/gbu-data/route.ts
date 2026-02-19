import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@/lib/generated/prisma';

const gbuDataSchema = z.object({
    universityId: z.number(),
    year: z.number().int().min(2000).max(2100).default(new Date().getFullYear()),
    activeMembers: z.number().min(0),
    cells: z.number().min(0),
    discipleshipGroups: z.number().min(0),
    studentsInDiscipleship: z.number().min(0),
    // joinedThisYear is calculated, not input
    savedStudents: z.number().min(0),
});

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const regionId = searchParams.get('regionId');
        const year = searchParams.get('year');

        const where: Prisma.gbu_dataWhereInput = {};

        if (regionId) {
            const parsedRegionId = Number(regionId);
            if (Number.isNaN(parsedRegionId)) {
                return NextResponse.json(
                    { error: 'Invalid regionId' },
                    { status: 400 }
                );
            }

            where.university = {
                is: {
                    regionId: parsedRegionId,
                },
            };
        }

        if (year) {
            const parsedYear = Number(year);
            if (Number.isNaN(parsedYear)) {
                return NextResponse.json(
                    { error: 'Invalid year' },
                    { status: 400 }
                );
            }

            where.year = parsedYear;
        }

        const data = await prisma.gbu_data.findMany({
            where,
            include: {
                university: {
                    include: {
                        region: true,
                    },
                },
            },
            orderBy: [
                { year: 'desc' },
                { updatedAt: 'desc' },
            ],
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching GBU data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch GBU data' },
            { status: 500 }
        );
    }
}

async function calculateJoinedStudents(universityId: number, year: number) {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    return await prisma.student.count({
        where: {
            universityId,
            createdAt: {
                gte: startDate,
                lt: endDate,
            },
        },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validatedData = gbuDataSchema.safeParse(body);

        if (!validatedData.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validatedData.error.format() },
                { status: 400 }
            );
        }

        const { universityId, year, ...data } = validatedData.data;

        // Check if entry already exists for this university AND year
        const existing = await prisma.gbu_data.findUnique({
            where: {
                universityId_year: {
                    universityId,
                    year
                }
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: `Data for this university in ${year} already exists` },
                { status: 409 }
            );
        }

        // Calculate joinedThisYear
        const joinedThisYear = await calculateJoinedStudents(universityId, year);

        const newData = await prisma.gbu_data.create({
            data: {
                ...data,
                universityId,
                year,
                joinedThisYear,
                updatedAt: new Date(),
            },
            include: {
                university: true,
            },
        });

        return NextResponse.json(newData, { status: 201 });
    } catch (error) {
        console.error('Error creating GBU data:', error);
        return NextResponse.json(
            { error: 'Failed to create GBU data' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const queryId = searchParams.get('id');

        // Zod schema for update - remove universityId as it shouldn't change
        const updateSchema = gbuDataSchema.omit({ universityId: true }).partial();

        const body = await request.json();
        const { id: bodyId, ...payload } = body ?? {};

        const validatedData = updateSchema.safeParse(payload);

        if (!validatedData.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: validatedData.error.format() },
                { status: 400 }
            );
        }

        const resolvedId = queryId ?? (bodyId ?? null);

        if (resolvedId === null || resolvedId === undefined) {
            return NextResponse.json(
                { error: 'ID is required' },
                { status: 400 }
            );
        }

        const numericId = Number(resolvedId);

        if (Number.isNaN(numericId)) {
            return NextResponse.json(
                { error: 'Invalid ID' },
                { status: 400 }
            );
        }

        // Fetch current record to get universityId and year if not provided
        const current = await prisma.gbu_data.findUnique({ where: { id: numericId } });
        if (!current) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        const targetYear = validatedData.data.year ?? current.year;

        // Recalculate if year changed or just to refresh
        const joinedThisYear = await calculateJoinedStudents(current.universityId, targetYear);

        const updatedData = await prisma.gbu_data.update({
            where: { id: numericId },
            data: {
                ...validatedData.data,
                joinedThisYear,
            },
            include: {
                university: true,
            },
        });
        return NextResponse.json(updatedData);
    } catch (error) {
        console.error('Error updating GBU data:', error);
        return NextResponse.json(
            { error: 'Failed to update GBU data' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'ID is required' },
                { status: 400 }
            );
        }

        await prisma.gbu_data.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting GBU data:', error);
        return NextResponse.json(
            { error: 'Failed to delete GBU data' },
            { status: 500 }
        );
    }
}
