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

export async function GET(req: Request) {
    try {
        // Get user scope
        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        if (
            !['superadmin', 'national', 'region', 'university'].includes(userScope.scope)
        ) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const filterUniversityId = searchParams.get('universityId')
            ? Number(searchParams.get('universityId'))
            : null;
        const filterType = searchParams.get('type') as 'student' | 'graduate' | null;

        const preferPrimary = true;
        const db = getPrismaClient('read', { preferPrimary });

        const whereClause: Record<string, unknown> = { status: 'PENDING' };
        if (filterType) {
            whereClause.type = filterType;
        }

        // Fetch pending requests then apply scope-specific filtering.
        // This keeps migration requests (without invitation links) visible to the right approvers.
        const requestsRaw = await db.registrationrequest.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 300,
            include: {
                invitationlink: {
                    select: {
                        slug: true,
                        description: true,
                        isMigration: true,
                        regionId: true,
                        InvitationUniversities: { select: { university: { select: { id: true } } } },
                    }
                }
            }
        });

        const requests = requestsRaw.filter((request) => {
            const payload = (request.payload ?? {}) as Record<string, unknown>;

            // Scope-based filtering
            if (userScope.scope === 'region' && userScope.regionId) {
                const payloadRegionId = parseNumericId(payload.regionId);
                const inScope = request.invitationlink?.regionId === userScope.regionId || payloadRegionId === userScope.regionId;
                if (!inScope) return false;
            } else if (userScope.scope === 'university' && userScope.universityId) {
                const payloadUniversityId = parseNumericId(payload.universityId);
                const fromInvitation = request.invitationlink?.InvitationUniversities?.some(
                    (assoc) => assoc.university?.id === userScope.universityId
                );
                if (!Boolean(fromInvitation) && payloadUniversityId !== userScope.universityId) return false;
            }
            // superadmin and national see all — no scope filter

            // Migration flow: student-completed migrations should proceed to main Registrations approval.
            // Keep excluding legacy migration-link registrations that have not gone through
            // the student lookup completion flow.
            const source = typeof payload.source === 'string' ? payload.source : null;
            const isLegacyMigrationOnly =
                source === 'migrate_registration' ||
                (request.invitationlink?.isMigration === true && source !== 'student_migration');
            if (isLegacyMigrationOnly) return false;

            // University filter (from query param)
            if (filterUniversityId) {
                const payloadUniversityId = parseNumericId(payload.universityId);
                const fromInvitation = request.invitationlink?.InvitationUniversities?.some(
                    (assoc) => assoc.university?.id === filterUniversityId
                );
                if (!Boolean(fromInvitation) && payloadUniversityId !== filterUniversityId) return false;
            }

            return true;
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
