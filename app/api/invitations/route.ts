import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma';
import { getUserScope } from '@/lib/rls';
import { z } from 'zod';

// Schema for creating an invitation link
const createInvitationSchema = z.object({
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    type: z.enum(['student', 'graduate']),
    expiration: z.string().datetime(),
    description: z.string().optional(),
    regionId: z.number().optional(),
    universityIds: z.array(z.number()).optional(),
    isMigration: z.boolean().optional(),
});

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const canCreate = ['superadmin', 'region', 'university'].includes(userScope.scope);
        if (!canCreate) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const body = await req.json();
        const validatedData = createInvitationSchema.parse(body);

        if (validatedData.type === 'graduate' && userScope.scope !== 'superadmin') {
            return new NextResponse('Forbidden: Only superadmin can create graduate invitation links', { status: 403 });
        }

        if (validatedData.isMigration && validatedData.type !== 'graduate') {
            return new NextResponse('Migration links must target graduate registration', { status: 400 });
        }

        // Check if slug already exists
        const existing = await prisma.invitationlink.findUnique({
            where: { slug: validatedData.slug },
        });

        if (existing) {
            return new NextResponse('Slug already exists', { status: 409 });
        }

        let scopedRegionId = validatedData.regionId;
        let scopedUniversityIds = validatedData.universityIds;

        if (userScope.scope === 'region') {
            if (!userScope.regionId) {
                return new NextResponse('Forbidden: Region scope is not configured', { status: 403 });
            }

            scopedRegionId = userScope.regionId;

            if (Array.isArray(scopedUniversityIds) && scopedUniversityIds.length > 0) {
                const allowedUniversities = await prisma.university.findMany({
                    where: {
                        id: { in: scopedUniversityIds },
                        regionId: userScope.regionId,
                    },
                    select: { id: true },
                });

                if (allowedUniversities.length !== scopedUniversityIds.length) {
                    return new NextResponse('Forbidden: One or more universities are outside your region', { status: 403 });
                }
            }
        }

        if (userScope.scope === 'university') {
            if (!userScope.universityId) {
                return new NextResponse('Forbidden: University scope is not configured', { status: 403 });
            }

            scopedUniversityIds = [userScope.universityId];
            scopedRegionId = userScope.regionId ?? scopedRegionId;
        }

        const invitation = await prisma.invitationlink.create({
            data: {
                id: randomUUID(),
                slug: validatedData.slug,
                type: validatedData.type,
                expiration: new Date(validatedData.expiration),
                description: validatedData.description,
                isMigration: validatedData.isMigration ?? false,
                createdBy: session.user.id,
                regionId: scopedRegionId,
                updatedAt: new Date(),
                InvitationUniversities: scopedUniversityIds ? {
                    create: scopedUniversityIds.map(id => ({ A: id }))
                } : undefined,
            },
        });

        return NextResponse.json(invitation);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 400 });
        }
        console.error('Error creating invitation link:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const canView = ['superadmin', 'region', 'university'].includes(userScope.scope);
        if (!canView) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const where: Prisma.invitationlinkWhereInput = {};
        if (userScope.scope === 'region' && userScope.regionId) {
            where.regionId = userScope.regionId;
        } else if (userScope.scope === 'university' && userScope.universityId) {
            where.InvitationUniversities = {
                some: { A: userScope.universityId }
            };
        }

        const [linksRaw, total] = await Promise.all([
            prisma.invitationlink.findMany({
                skip,
                take: limit,
                where,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { registrationrequest: true },
                    },
                    user: {
                        select: { name: true, email: true },
                    },
                    region: {
                        select: { name: true },
                    },
                    InvitationUniversities: {
                        include: { university: { select: { name: true } } }
                    },
                },
            }),
            prisma.invitationlink.count({ where }),
        ]);

        const links = linksRaw.map(({ user, InvitationUniversities, _count, ...rest }) => ({
            ...rest,
            creator: user,
            universities: InvitationUniversities.map(iu => iu.university),
            _count: {
                requests: _count.registrationrequest
            }
        }));

        return NextResponse.json({
            links: links,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: page,
            },
        });
    } catch (error) {
        console.error('Error fetching invitation links:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const isSuperAdmin = session.user.roles?.some(role => role.scope === 'superadmin');
        if (!isSuperAdmin) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return new NextResponse('ID required', { status: 400 });
        }

        await prisma.invitationlink.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 200 });
    } catch (error) {
        console.error('Error deleting invitation link:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// Schema for updating expiration
const updateExpirationSchema = z.object({
    id: z.string().uuid(),
    expiration: z.string().datetime(),
});

export async function PATCH(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const canUpdate = ['superadmin', 'region', 'university'].includes(userScope.scope);
        if (!canUpdate) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const body = await req.json();
        const validatedData = updateExpirationSchema.parse(body);

        // Verify invitation exists
        const invitation = await prisma.invitationlink.findUnique({
            where: { id: validatedData.id },
        });

        if (!invitation) {
            return new NextResponse('Invitation not found', { status: 404 });
        }

        // Scope check: region users can only extend their region's links
        if (userScope.scope === 'region' && invitation.regionId !== userScope.regionId) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Scope check: university users can only extend their own created links
        if (userScope.scope === 'university' && invitation.createdBy !== session.user.id) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const updated = await prisma.invitationlink.update({
            where: { id: validatedData.id },
            data: {
                expiration: new Date(validatedData.expiration),
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid request data', { status: 400 });
        }
        console.error('Error updating invitation expiration:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
