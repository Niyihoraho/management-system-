import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getUserScope } from "@/lib/rls";

const parseNumericId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

export async function GET(_req: Request) {
    try {
        // Get user scope
        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (
            !['superadmin', 'national', 'region', 'university'].includes(userScope.scope)
        ) {
            // SmallGroup/GraduateGroup admins shouldn't see this list usually?
            // Or maybe they do. Let's return 403 for them to be safe if not intended.
            // But existing code allowed "admin" roles.
            // Let's strictly allow superadmin, national, region, university.
            return new NextResponse('Forbidden', { status: 403 });
        }

        const preferPrimary = true;
        const db = getPrismaClient('read', { preferPrimary });

        // Fetch pending requests then apply scope-specific filtering.
        // This keeps migration requests (without invitation links) visible to the right approvers.
        const requestsRaw = await db.registrationrequest.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 300,
            include: {
                invitationlink: {
                    select: {
                        slug: true,
                        description: true,
                        regionId: true,
                        InvitationUniversities: { select: { university: { select: { id: true } } } },
                    }
                }
            }
        });

        const requests = requestsRaw.filter((request) => {
            if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
                return true;
            }

            const payload = (request.payload ?? {}) as Record<string, unknown>;

            if (userScope.scope === 'region' && userScope.regionId) {
                const payloadRegionId = parseNumericId(payload.regionId);
                return request.invitationlink?.regionId === userScope.regionId || payloadRegionId === userScope.regionId;
            }

            if (userScope.scope === 'university' && userScope.universityId) {
                const payloadUniversityId = parseNumericId(payload.universityId);
                const fromInvitation = request.invitationlink?.InvitationUniversities?.some(
                    (assoc) => assoc.university?.id === userScope.universityId
                );
                return Boolean(fromInvitation) || payloadUniversityId === userScope.universityId;
            }

            return false;
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
