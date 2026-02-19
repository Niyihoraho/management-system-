import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserScope } from "@/lib/rls";

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

        if (!request || request.status !== 'PENDING') {
            return new NextResponse('Request not found or already processed', { status: 404 });
        }

        // Authorization Check
        if (userScope.scope === 'region') {
            if (!request.invitationlink?.regionId || request.invitationlink.regionId !== userScope.regionId) {
                return new NextResponse('Forbidden: You can only reject requests for your region', { status: 403 });
            }
        } else if (userScope.scope === 'university') {
            // University admins can reject if the invitation link includes their university
            const hasUniversity = request.invitationlink?.university?.some(u => u.id === userScope.universityId);
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

        return new NextResponse('Rejected successfully', { status: 200 });

    } catch (error) {
        console.error('Rejection error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
