import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';

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
        const session = await auth();
        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope || userScope.scope !== 'superadmin') {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'PENDING'; // PENDING, APPROVED, REJECTED
        const year = searchParams.get('year');
        const university = searchParams.get('university');

        // Fetch all migration-related registration requests
        const allRequests = await prisma.registrationrequest.findMany({
            where: {
                status: status as any,
                ...(year ? {
                    processedAt: {
                        gte: new Date(`${year}-01-01`),
                        lt: new Date(`${parseInt(year) + 1}-01-01`),
                    }
                } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                invitationlink: {
                    select: {
                        isMigration: true,
                    }
                }
            }
        });

        // Filter for migration sources (JSON payload check + isMigration flag)
        const migrationRequests = allRequests.filter(req => {
            const payload = req.payload as Record<string, unknown> | null;
            const source = payload?.source as string | undefined;
            const isMigrationLink = req.invitationlink?.isMigration === true;
            return source === 'student_migration' || source === 'migrate_registration' || isMigrationLink;
        });

        // Apply university filter (from payload)
        let filtered = migrationRequests;
        if (university) {
            filtered = migrationRequests.filter(req => {
                const payload = req.payload as Record<string, unknown> | null;
                const uni = (payload?.university as string) || '';
                return uni.toLowerCase().includes(university.toLowerCase());
            });
        }

        // Parse each request to extract display-friendly data
        const requestItems: any[] = filtered.map(req => {
            const payload = req.payload as Record<string, unknown> | null;
            const sourceStudentId = parseNumericId(payload?.sourceStudentId);
            return {
                id: req.id,
                requestId: req.id,
                sourceStudentId,
                fullName: req.fullName || (payload?.fullName as string) || 'N/A',
                email: req.email || (payload?.email as string) || 'N/A',
                phone: req.phone || (payload?.phone as string) || 'N/A',
                fromUniversity: (payload?.university as string) || 'N/A',
                source: (payload?.source as string) || 'unknown',
                status: req.status,
                workflowStatus: req.status === 'PENDING' ? 'ready_for_final_approval' : null,
                createdAt: req.createdAt,
                processedAt: req.processedAt,
            };
        });

        let items: any[] = requestItems;

        if (status === 'PENDING') {
            const migratingStudents = await prisma.student.findMany({
                where: { status: 'migrating' },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    updatedAt: true,
                    university: { select: { name: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            const pendingStudentIds = new Set<number>();
            const pendingPhones = new Set<string>();
            const pendingEmails = new Set<string>();

            for (const item of requestItems) {
                if (typeof item.sourceStudentId === 'number') pendingStudentIds.add(item.sourceStudentId);
                if (item.phone && item.phone !== 'N/A') pendingPhones.add(item.phone.trim());
                if (item.email && item.email !== 'N/A') pendingEmails.add(item.email.trim().toLowerCase());
            }

            const pendingStudentCompletionItems = migratingStudents
                .filter((student) => {
                    if (pendingStudentIds.has(student.id)) return false;
                    if (student.phone && pendingPhones.has(student.phone.trim())) return false;
                    if (student.email && pendingEmails.has(student.email.trim().toLowerCase())) return false;
                    return true;
                })
                .map((student) => ({
                    id: student.id,
                    requestId: null,
                    sourceStudentId: student.id,
                    fullName: student.fullName,
                    email: student.email || 'N/A',
                    phone: student.phone || 'N/A',
                    fromUniversity: student.university?.name || 'N/A',
                    source: 'student_migration',
                    status: 'PENDING' as const,
                    workflowStatus: 'pending_student_completion',
                    createdAt: student.updatedAt,
                    processedAt: null,
                }));

            items = [...requestItems, ...pendingStudentCompletionItems]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        // Get total approved count for stats
        const allApproved = await prisma.registrationrequest.findMany({
            where: { status: 'APPROVED' },
            include: {
                invitationlink: { select: { isMigration: true } }
            }
        });
        const totalApproved = allApproved.filter(req => {
            const payload = req.payload as Record<string, unknown> | null;
            const source = payload?.source as string | undefined;
            const isMigrationLink = req.invitationlink?.isMigration === true;
            return source === 'student_migration' || source === 'migrate_registration' || isMigrationLink;
        }).length;

        // Extract unique universities for the filter dropdown
        const allUniversities = [...new Set(
            migrationRequests
                .map(req => {
                    const payload = req.payload as Record<string, unknown> | null;
                    return (payload?.university as string) || '';
                })
                .filter(u => u && u !== '')
        )].sort();

        // Extract available years for the filter dropdown
        const availableYears = [...new Set(
            allApproved
                .filter(req => {
                    const payload = req.payload as Record<string, unknown> | null;
                    const source = payload?.source as string | undefined;
                    const isMigrationLink = req.invitationlink?.isMigration === true;
                    return source === 'student_migration' || source === 'migrate_registration' || isMigrationLink;
                })
                .filter(req => req.processedAt)
                .map(req => req.processedAt!.getFullYear())
        )].sort((a, b) => b - a);

        return NextResponse.json({
            items,
            totalApproved,
            universities: allUniversities,
            availableYears,
        });
    } catch (error) {
        console.error('Migrations API error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
