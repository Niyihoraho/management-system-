import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';
import { z } from 'zod';

const campusDataSchema = z.object({
    universityId: z.number(),
    year: z.number().int().min(2000).max(2100).default(new Date().getFullYear()),
    studentsCount: z.number().min(0),
    faculties: z.string().optional(),
    associations: z.string().optional(),
    cults: z.string().optional(),
});

export async function GET(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { scope: role, universityId, regionId } = userScope;
        const { searchParams } = new URL(request.url);

        let uniId = searchParams.get('universityId');
        let regId = searchParams.get('regionId');
        const year = searchParams.get('year') || new Date().getFullYear().toString();

        // RLS Enforcement
        if (role === 'university') {
            uniId = universityId?.toString() || uniId;
        } else if (role === 'region') {
            regId = regionId?.toString() || regId;
        }

        const whereClause: any = { year: parseInt(year) };
        if (uniId) whereClause.universityId = parseInt(uniId);
        if (regId) whereClause.university = { regionId: parseInt(regId) };

        const data = await prisma.campusData.findMany({
            where: whereClause,
            include: {
                university: {
                    select: { name: true, region: { select: { id: true, name: true } } }
                }
            },
            orderBy: [
                { university: { regionId: 'asc' } },
                { university: { name: 'asc' } }
            ]
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch campus data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { scope: role, universityId, regionId } = userScope;
        if (!['superadmin', 'national', 'region', 'university'].includes(role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = campusDataSchema.parse({
            ...body,
            universityId: Number(body.universityId),
            year: Number(body.year),
            studentsCount: Number(body.studentsCount),
        });

        // RLS enforcement for creation
        if (role === 'university' && validatedData.universityId !== universityId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        if (role === 'region') {
            const uni = await prisma.university.findUnique({ where: { id: validatedData.universityId } });
            if (!uni || uni.regionId !== regionId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
            }
        }

        // Check for existing record
        const existingData = await prisma.campusData.findUnique({
            where: {
                universityId_year: {
                    universityId: validatedData.universityId,
                    year: validatedData.year,
                },
            },
        });

        if (existingData) {
            return NextResponse.json(
                { error: 'Campus data for this university and year already exists' },
                { status: 400 }
            );
        }

        const data = await prisma.campusData.create({
            data: validatedData,
            include: {
                university: { select: { name: true } }
            }
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to create campus data:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { scope: role, universityId, regionId } = userScope;
        if (!['superadmin', 'national', 'region', 'university'].includes(role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const existingRecord = await prisma.campusData.findUnique({
            where: { id: Number(id) },
            include: { university: true }
        });

        if (!existingRecord) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // RLS enforcement for update
        if (role === 'university' && existingRecord.universityId !== universityId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
        if (role === 'region' && existingRecord.university.regionId !== regionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const validatedData = campusDataSchema.partial().parse({
            ...updateData,
            universityId: updateData.universityId ? Number(updateData.universityId) : undefined,
            year: updateData.year ? Number(updateData.year) : undefined,
            studentsCount: updateData.studentsCount !== undefined ? Number(updateData.studentsCount) : undefined,
        });

        const data = await prisma.campusData.update({
            where: { id: Number(id) },
            data: validatedData,
            include: {
                university: { select: { name: true } }
            }
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to update campus data:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const userScope = await getUserScope();
        if (!userScope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { scope: role, universityId, regionId } = userScope;
        if (!['superadmin', 'national', 'region'].includes(role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const existingRecord = await prisma.campusData.findUnique({
            where: { id: parseInt(id) },
            include: { university: true }
        });

        if (!existingRecord) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // RLS enforcement for delete (university leaders can't delete by design, only region/admin)
        if (role === 'region' && existingRecord.university.regionId !== regionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.campusData.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete campus data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
