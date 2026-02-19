import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get graduates who either:
        // 1. Don't have any FinancialSupport record, OR
        // 2. Have a record with supportStatus = 'later'
        const graduates = await prisma.graduate.findMany({
            where: {
                OR: [
                    { financialsupport: { is: null } },
                    { financialsupport: { is: { supportStatus: 'later' } } }
                ],
                status: 'active'
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                residenceProvince: true,
                residenceDistrict: true,
                profession: true,
            },
            orderBy: { fullName: 'asc' }
        });

        return NextResponse.json({ graduates });

    } catch (error) {
        console.error('Error fetching eligible graduates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch eligible graduates' },
            { status: 500 }
        );
    }
}
