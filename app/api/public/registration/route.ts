import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const submissionSchema = z.object({
    fullName: z.string(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string(),
    type: z.enum(['student', 'graduate']),
    invitationLinkId: z.string(),
    role_description: z.string().optional(), // Honeypot
    // Allow other fields loosely for initial capture, strict validation happens on approval
    universityId: z.string().optional(),
    yearOfStudy: z.string().optional(),
    province: z.string().optional(),
    district: z.string().optional(),
    sector: z.string().optional(),
    university: z.string().optional(), // for graduate
    graduationYear: z.string().optional(),
    profession: z.string().optional(),
    isDiaspora: z.boolean().optional(),
    residenceDistrict: z.string().optional(),
    // New fields
    course: z.string().optional(),
    residenceProvince: z.string().optional(),
    residenceSector: z.string().optional(),
    servingPillars: z.array(z.string()).optional(),
    financialSupport: z.boolean().optional(),
    // Financial support details
    supportStatus: z.enum(['want_to_support', 'already_supporting', 'later']).optional(),
    supportFrequency: z.enum(['monthly', 'half_year', 'full_year']).optional(),
    supportAmount: z.string().optional(),
    enableReminder: z.boolean().optional(),
    // Graduate Cell details
    attendGraduateCell: z.boolean().optional(),
    graduateGroupId: z.string().optional(),
    noCellAvailable: z.boolean().optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const result = submissionSchema.safeParse(body);

        if (!result.success) {
            return new NextResponse('Invalid data', { status: 400 });
        }

        const data = result.data;

        if (data.role_description) {
            // Bot detected, pretend success
            return new NextResponse('Submitted', { status: 200 });
        }

        // Check invitation validity again
        const invitation = await prisma.invitationlink.findUnique({
            where: { id: data.invitationLinkId },
        });

        if (!invitation || !invitation.isActive || new Date(invitation.expiration) < new Date()) {
            return new NextResponse('Invalid or expired invitation', { status: 400 });
        }

        // Deduplication / Reactivation Check
        const userOrConditions: any[] = [{ contact: data.phone }];
        if (data.email && data.email.length > 0) {
            userOrConditions.push({ email: data.email });
        }


        // Check if phone or email already exists in User table
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: userOrConditions
            }
        });

        let matchType = 'new_user';

        if (existingUser) {
            if (existingUser.status === 'inactive' || existingUser.status === 'suspended') {
                matchType = 're_activation';
            } else {
                return NextResponse.json({
                    error: 'USER_ALREADY_EXISTS',
                    message: 'It looks like you are already a registered member. no need to register again.',
                    details: {
                        phone: existingUser.contact,
                        email: existingUser.email,
                    }
                }, { status: 409 });
            }
        }

        // Check specifics tables based on type
        if (data.type === 'student') {
            const studentOrConditions: any[] = [{ phone: data.phone }];
            if (data.email && data.email.length > 0) {
                studentOrConditions.push({ email: data.email });
            }

            const existingStudent = await prisma.student.findFirst({
                where: { OR: studentOrConditions }
            });

            if (existingStudent) {
                return NextResponse.json({
                    error: 'MEMBER_ALREADY_EXISTS',
                    message: 'You are already registered as a student.',
                    details: {
                        phone: existingStudent.phone,
                        email: existingStudent.email
                    }
                }, { status: 409 });
            }
        } else if (data.type === 'graduate') {
            const graduateOrConditions: any[] = [{ phone: data.phone }];
            if (data.email && data.email.length > 0) {
                graduateOrConditions.push({ email: data.email });
            }

            const existingGraduate = await prisma.graduate.findFirst({
                where: { OR: graduateOrConditions }
            });

            if (existingGraduate) {
                return NextResponse.json({
                    error: 'MEMBER_ALREADY_EXISTS',
                    message: 'You are already registered as a graduate.',
                    details: {
                        phone: existingGraduate.phone,
                        email: existingGraduate.email
                    }
                }, { status: 409 });
            }
        }

        // Check if there is already a PENDING request for this phone/email
        const requestOrConditions: any[] = [{ phone: data.phone }];

        if (data.email && data.email.length > 0) {
            requestOrConditions.push({ email: data.email });
        }

        const existingRequest = await prisma.registrationrequest.findFirst({
            where: {
                status: 'PENDING',
                OR: requestOrConditions
            }
        });

        if (existingRequest) {
            return NextResponse.json({
                error: 'PENDING_REGISTRATION_EXISTS',
                message: 'You have already submitted a registration request. Our team is reviewing your application and will contact you shortly.',
                details: {
                    phone: existingRequest.phone,
                    email: existingRequest.email,
                    existingRequestId: existingRequest.id,
                    existingRequestCreatedAt: existingRequest.createdAt
                }
            }, { status: 409 });
        }


        // Create Registration Request
        await prisma.registrationrequest.create({
            data: {
                type: data.type,
                status: 'PENDING',
                invitationLinkId: data.invitationLinkId,
                fullName: data.fullName,
                updatedAt: new Date(),
                phone: data.phone,
                email: data.email || null,
                payload: {
                    ...data,
                    location: {
                        province: data.province,
                        district: data.district,
                        sector: data.sector
                    }
                }, // Store full JSON with structured location
            },
        });

        return new NextResponse('Submitted successfully', { status: 201 });

    } catch (error) {
        console.error('Registration submission error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
