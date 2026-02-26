import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserScope } from "@/lib/rls";

const parseNumericId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get user scope for permissions
        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const { id } = await req.json();

        const request = await prisma.registrationrequest.findUnique({
            where: { id },
            include: {
                invitationlink: {
                    include: {
                        university: true
                    }
                }
            },
        });

        const payload = request?.payload as Record<string, unknown> | null;
        const isStudentMigration = payload?.source === 'student_migration';

        if (!request || request.status !== 'PENDING') {
            return new NextResponse('Request not found or already processed', { status: 404 });
        }

        // Authorization Check
        if (userScope.scope === 'region') {
            const requestRegionId = request.invitationlink?.regionId ?? parseNumericId(payload?.regionId);
            if (!requestRegionId || requestRegionId !== userScope.regionId) {
                return new NextResponse('Forbidden: You can only reject requests for your region', { status: 403 });
            }
        } else if (userScope.scope === 'university') {
            // University admins can reject if the invitation link includes their university
            const payloadUniversityId = parseNumericId(payload?.universityId);
            const hasUniversity = request.invitationlink?.university?.some(u => u.id === userScope.universityId)
                || payloadUniversityId === userScope.universityId;
            if (!hasUniversity) {
                return new NextResponse('Forbidden: You can only reject requests for your university', { status: 403 });
            }
        } else if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
            // Allowed
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }

        await prisma.registrationrequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewedById: session.user.id,
                processedAt: new Date(),
            }
        });

        // If this was a migration request, reactivate the source student on rejection
        const payloadData = (payload ?? {}) as Record<string, unknown>;
        if (isStudentMigration && typeof payloadData.sourceStudentId === 'number') {
            await prisma.student.updateMany({
                where: { id: payloadData.sourceStudentId },
                data: {
                    status: 'active',
                    updatedAt: new Date(),
                },
            });
        }

        return new NextResponse('Rejected successfully', { status: 200 });

    } catch (error) {
        console.error('Rejection error:', error);
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const code = String((error as { code?: unknown }).code);
            if (code === 'P2024') {
                return new NextResponse('Database is busy. Please retry in a few seconds.', { status: 503 });
            }
        }
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
