import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createNotificationSchema, updateNotificationSchema } from "../validation/notification";
import { getUserScope, getTableRLSConditions } from "@/lib/rls";

export async function GET(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status");
        const eventType = searchParams.get("eventType");
        const unreadOnly = searchParams.get("unreadOnly") === "true";

        // Build where clause
        const where: any = {};

        // Apply RLS - users can only see their own notifications and specific notification types
        if (userScope.scope !== 'superadmin') {
            where.userId = userScope.userId;

            // Debug logging for RLS filtering
            console.log('RLS Filtering - User Scope:', {
                scope: userScope.scope,
                userId: userScope.userId,
                smallGroupId: userScope.smallGroupId,
                universityId: userScope.universityId,
                regionId: userScope.regionId
            });

            // Additional debug for small group users
            if (userScope.scope === 'smallgroup') {
                console.log('Small group user details:', {
                    userId: userScope.userId,
                    smallGroupId: userScope.smallGroupId
                });
            }

            // Role-based notification type filtering with direct hierarchy fields
            if (userScope.scope === 'smallgroup') {
                // Small group leaders only see attendance_miss notifications for their specific small group
                where.eventType = 'attendance_miss';

                // Direct hierarchy filtering - much more efficient than JSON metadata
                if (userScope.smallGroupId) {
                    where.smallGroupId = userScope.smallGroupId;
                    console.log('Small group filtering applied (direct):', {
                        smallGroupId: userScope.smallGroupId
                    });
                }

            } else if (userScope.scope === 'university') {
                // University users only see university_acknowledgment notifications for their university
                where.eventType = 'university_acknowledgment';

                // Direct hierarchy filtering
                if (userScope.universityId) {
                    where.universityId = userScope.universityId;
                    console.log('University filtering applied (direct):', {
                        universityId: userScope.universityId
                    });
                }

            } else if (userScope.scope === 'region') {
                // Region users can see notifications for their region
                if (userScope.regionId) {
                    where.regionId = userScope.regionId;
                    console.log('Region filtering applied (direct):', {
                        regionId: userScope.regionId
                    });
                }
            }
            // National users can see all notifications within their scope
        } else {
            // Super admin can see all notifications, but can filter by userId
            const userId = searchParams.get("userId");
            if (userId) {
                where.userId = userId;
            }
        }

        // Status filter
        if (status && status !== "all") {
            where.status = status;
        }

        // Event type filter (only apply if not already set by role-based filtering)
        if (eventType && eventType !== "all" && userScope.scope === 'superadmin') {
            where.eventType = eventType;
        }

        // Unread only filter
        if (unreadOnly) {
            where.readAt = null;
        }

        // Debug logging for final where clause
        console.log('Final where clause for notifications query:', JSON.stringify(where, null, 2));

        // Get notifications with pagination
        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            username: true
                        }
                    }
                }
            }),
            prisma.notification.count({ where })
        ]);

        // Debug logging for results
        console.log('Notifications query results:', {
            totalFound: total,
            notificationsReturned: notifications.length,
            notificationIds: notifications.map(n => n.id),
            notificationSubjects: notifications.map(n => n.subject)
        });

        return NextResponse.json({
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const validation = createNotificationSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Check if user exists and has access
        const targetUser = await prisma.user.findUnique({
            where: { id: data.userId }
        });

        if (!targetUser) {
            return NextResponse.json(
                { error: "Target user not found" },
                { status: 404 }
            );
        }

        // Apply RLS - users can only create notifications for themselves or their subordinates
        if (userScope.scope !== 'superadmin' && data.userId !== userScope.userId) {
            // Check if the target user is within the current user's scope
            const targetUserRoles = await prisma.userRole.findMany({
                where: { userId: data.userId }
            });

            const hasAccess = targetUserRoles.some(role => {
                // Check if target user is within current user's scope
                if (userScope.scope === 'region' && userScope.regionId) {
                    return role.regionId === userScope.regionId;
                }
                if (userScope.scope === 'university' && userScope.universityId) {
                    return role.universityId === userScope.universityId;
                }
                if (userScope.scope === 'smallgroup' && userScope.smallGroupId) {
                    return role.smallGroupId === userScope.smallGroupId;
                }
                return false;
            });

            if (!hasAccess) {
                return NextResponse.json(
                    { error: "You can only create notifications for users in your scope" },
                    { status: 403 }
                );
            }
        }

        // Create notification
        const notification = await prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                subject: data.subject,
                message: data.message,
                eventType: data.eventType,
                eventId: data.eventId,
                metadata: data.metadata,
                status: 'pending',
                sentAt: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true
                    }
                }
            }
        });

        return NextResponse.json(notification, { status: 201 });

    } catch (error) {
        console.error("Error creating notification:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
