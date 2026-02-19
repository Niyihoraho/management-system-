import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for creating an invitation link
const createInvitationSchema = z.object({
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    type: z.enum(['student', 'graduate']),
    expiration: z.string().datetime(),
    description: z.string().optional(),
    regionId: z.number().optional(),
    universityIds: z.array(z.number()).optional(),
});

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Check if user is superadmin
        const isSuperAdmin = session.user.roles?.some(role => role.scope === 'superadmin');

        if (!isSuperAdmin) {
            return new NextResponse('Forbidden: Only Superadmins can create invitation links', { status: 403 });
        }

        const body = await req.json();
        const validatedData = createInvitationSchema.parse(body);

        // Check if slug already exists
        const existing = await prisma.invitationlink.findUnique({
            where: { slug: validatedData.slug },
        });

        if (existing) {
            return new NextResponse('Slug already exists', { status: 409 });
        }

        const invitation = await prisma.invitationlink.create({
            data: {
                id: randomUUID(),
                slug: validatedData.slug,
                type: validatedData.type,
                expiration: new Date(validatedData.expiration),
                description: validatedData.description,
                createdBy: session.user.id,
                regionId: validatedData.regionId,
                updatedAt: new Date(),
                university: validatedData.universityIds ? {
                    connect: validatedData.universityIds.map(id => ({ id }))
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

        // Check if user is superadmin
        const isSuperAdmin = session.user.roles?.some(role => role.scope === 'superadmin');

        if (!isSuperAdmin) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [linksRaw, total] = await Promise.all([
            prisma.invitationlink.findMany({
                skip,
                take: limit,
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
                    university: {
                        select: { name: true },
                    },
                },
            }),
            prisma.invitationlink.count(),
        ]);

        const links = linksRaw.map(({ user, university, _count, ...rest }) => ({
            ...rest,
            creator: user,
            universities: university,
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
