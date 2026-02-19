import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserScope } from "@/lib/rls";

export async function GET(req: Request) {
    try {
        // Get user scope
        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Build where clause based on scope
        const where: any = { status: 'PENDING' };

        if (userScope.scope === 'region' && userScope.regionId) {
            where.invitationlink = {
                regionId: userScope.regionId
            };
        } else if (userScope.scope === 'university' && userScope.universityId) {
            // University Admins see requests from links associated with their university
            where.invitationlink = {
                university: {
                    some: {
                        id: userScope.universityId
                    }
                }
            };
        } else if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
            // No filter needed
        } else {
            // SmallGroup/GraduateGroup admins shouldn't see this list usually?
            // Or maybe they do. Let's return 403 for them to be safe if not intended.
            // But existing code allowed "admin" roles.
            // Let's strictly allow superadmin, national, region, university.
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Fetch pending requests
        const requests = await prisma.registrationrequest.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                invitationlink: {
                    select: { slug: true, description: true, regionId: true }
                }
            }
        });

        return NextResponse.json({
            requests: requests.map(({ invitationlink, ...rest }) => ({
                ...rest,
                invitationLink: invitationlink,
            }))
        });
    } catch (error) {
        console.error('Error fetching registration requests:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
