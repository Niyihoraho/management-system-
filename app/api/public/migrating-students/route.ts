import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const universityIdParam = searchParams.get('universityId');

        if (!universityIdParam) {
            return NextResponse.json({ error: 'universityId is required' }, { status: 400 });
        }

        const universityId = Number(universityIdParam);
        if (!Number.isFinite(universityId)) {
            return NextResponse.json({ error: 'Invalid universityId' }, { status: 400 });
        }

        const students = await prisma.student.findMany({
            where: {
                universityId,
                status: 'migrating',
            },
            orderBy: { fullName: 'asc' },
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                sex: true,
                course: true,
                university: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({ students });
    } catch (error) {
        console.error('Error fetching migrating students:', error);
        return NextResponse.json({ error: 'Failed to fetch migrating students' }, { status: 500 });
    }
}
