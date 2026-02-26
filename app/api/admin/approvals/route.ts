import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/rls";
import { prisma } from "@/lib/prisma";
import { RegistrationStatus, RegistrationRequestType } from "@/lib/generated/prisma";
import { cacheDel } from '@/lib/cache';
import { z } from "zod";

const parseNumericId = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

// Schema for approval action
const actionSchema = z.object({
    requestId: z.number().int(), // Using Int ID as per schema
    action: z.enum(["approve", "reject"]),
    reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get user scope
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json(
                { error: "No valid role found" },
                { status: 403 }
            );
        }

        // Other scopes (smallgroup, graduatesmallgroup) don't have access to approvals
        if (!['superadmin', 'national', 'region', 'university'].includes(userScope.scope)) {
            return NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            );
        }

        const requestsRaw = await prisma.registrationrequest.findMany({
            where: { status: RegistrationStatus.PENDING },
            include: {
                invitationlink: {
                    include: {
                        region: true,
                        university: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
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
                const fromInvitation = request.invitationlink?.university?.some((u) => u.id === userScope.universityId);
                return Boolean(fromInvitation) || payloadUniversityId === userScope.universityId;
            }

            return false;
        });

        return NextResponse.json(requests);
    } catch (error) {
        console.error("Failed to fetch requests", error);
        return NextResponse.json(
            { error: "Failed to fetch requests" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get user scope
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json(
                { error: "No valid role found" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { requestId, action, reason } = actionSchema.parse(body);

        // Fetch the registration request with invitation link to verify access
        const registration = await prisma.registrationrequest.findUnique({
            where: { id: requestId },
            include: {
                invitationlink: {
                    include: {
                        region: true,
                        university: true,
                    },
                },
            },
        });

        if (!registration) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Verify user has permission to act on this request
        let hasAccess = false;

        if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
            hasAccess = true;
        } else if (userScope.scope === 'region' && userScope.regionId) {
            // Region admin can only approve requests from their region
            const reg = registration as any;
            const payloadRegionId = parseNumericId(reg.payload?.regionId);
            hasAccess = reg.invitationlink?.regionId === userScope.regionId || payloadRegionId === userScope.regionId;
        } else if (userScope.scope === 'university' && userScope.universityId) {
            // University admin can only approve requests from their university
            const reg = registration as any;
            const payloadUniversityId = parseNumericId(reg.payload?.universityId);
            hasAccess = reg.invitationlink?.university?.some(
                (u: any) => u.id === userScope.universityId
            ) || payloadUniversityId === userScope.universityId || false;
        }

        if (!hasAccess) {
            return NextResponse.json(
                { error: "You don't have permission to process this request" },
                { status: 403 }
            );
        }

        if (registration.status !== RegistrationStatus.PENDING) {
            return NextResponse.json(
                { error: "Request already processed" },
                { status: 400 }
            );
        }

        if (action === "reject") {
            await prisma.registrationrequest.update({
                where: { id: requestId },
                data: {
                    status: RegistrationStatus.REJECTED,
                    reviewedById: session.user.id,
                    processedAt: new Date(),
                },
            });
            await cacheDel('registrations:*');
            return NextResponse.json({ message: "Request rejected" });
        }

        // ACTION: APPROVE
        const payload = registration.payload as any; // Typed as Json in Prisma

        return await prisma.$transaction(async (tx) => {
            // 1. Create the actual record
            if (registration.type === RegistrationRequestType.student) {
                // Create Student
                await tx.student.create({
                    data: {
                        fullName: payload.fullName,
                        email: payload.email,
                        phone: payload.phone,
                        universityId: Number(payload.universityId) || 1, // Fallback need actual ID
                        // We need to resolve Relations like University, SmallGroup from names or IDs
                        // The payload usually contains IDs if coming from the form selection
                        smallGroupId: payload.smallGroupId ? Number(payload.smallGroupId) : null,
                        course: payload.course,
                        yearOfStudy: Number(payload.yearOfStudy),
                        placeOfBirthProvince: payload.location?.province,
                        placeOfBirthDistrict: payload.location?.district,
                        placeOfBirthSector: payload.location?.sector,
                        status: "active",
                        updatedAt: new Date(),
                    },
                });
            } else {
                // Create Graduate
                let provinceId = null;
                const provinceName = payload.residenceProvince || payload.location?.province || payload.residence?.province;
                const residenceDistrict = payload.residenceDistrict || payload.location?.district || payload.residence?.district;
                const residenceSector = payload.residenceSector || payload.location?.sector || payload.residence?.sector;
                const graduateGroupId = parseNumericId(payload.graduateGroupId);
                const isNewCellMember = payload.attendGraduateCell === false || Boolean(payload.noCellAvailable);

                if (provinceName) {
                    const province = await tx.province.findFirst({
                        where: { name: { equals: provinceName, mode: 'insensitive' } }
                    });
                    if (province) {
                        provinceId = province.id;
                    }
                }

                await tx.graduate.create({
                    data: {
                        fullName: payload.fullName,
                        email: payload.email,
                        phone: payload.phone,
                        university: payload.university, // Free text for graduates
                        course: payload.course,
                        graduationYear: Number(payload.graduationYear),
                        residenceProvince: provinceName,
                        residenceDistrict,
                        residenceSector,
                        isDiaspora: payload.isDiaspora || false,
                        servingPillars: payload.servingPillars || [],
                        status: "active",
                        graduateGroupId,
                        noCellAvailable: isNewCellMember,
                        provinceId: provinceId,
                        updatedAt: new Date(),
                    },
                });
            }

            // 2. Mark Request as Approved
            const updated = await tx.registrationrequest.update({
                where: { id: requestId },
                data: {
                    status: RegistrationStatus.APPROVED,
                    reviewedById: session.user.id,
                    processedAt: new Date(),
                },
            });

            await Promise.all([
                cacheDel('graduates:list:*'),
                cacheDel('graduates:*'),
                cacheDel('financial-support:*'),
                cacheDel('stats:*'),
                cacheDel('registrations:*'),
            ]);

            return NextResponse.json({ message: "Request approved", data: updated });
        });

    } catch (error) {
        console.error("Processing error", error);
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 }
        );
    }
}
