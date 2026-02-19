import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { updateNotificationSchema } from "../../validation/notification";
import { getUserScope } from "@/lib/rls";
import { NotificationService } from "@/lib/notification-service";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notificationId = parseInt(params.id);
        if (isNaN(notificationId)) {
            return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
        }

        // Build where clause with RLS
        const where: any = { id: notificationId };
        if (userScope.scope !== 'superadmin') {
            where.userId = userScope.userId;
            
            // Role-based notification type filtering with direct hierarchy fields
            if (userScope.scope === 'smallgroup') {
                // Small group leaders only see attendance_miss notifications for their specific small group
                where.eventType = 'attendance_miss';
                
                // Direct hierarchy filtering - much more efficient than JSON metadata
                if (userScope.smallGroupId) {
                    where.smallGroupId = userScope.smallGroupId;
                }
                
            } else if (userScope.scope === 'university') {
                // University users only see university_acknowledgment notifications for their university
                where.eventType = 'university_acknowledgment';
                
                // Direct hierarchy filtering
                if (userScope.universityId) {
                    where.universityId = userScope.universityId;
                }
                
            } else if (userScope.scope === 'region') {
                // Region users can see notifications for their region
                if (userScope.regionId) {
                    where.regionId = userScope.regionId;
                }
            }
        }

        const notification = await prisma.notification.findFirst({
            where,
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

        if (!notification) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        return NextResponse.json(notification, { status: 200 });

    } catch (error) {
        console.error("Error fetching notification:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notificationId = parseInt(params.id);
        if (isNaN(notificationId)) {
            return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
        }

        const body = await request.json();
        const validation = updateNotificationSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Build where clause with RLS
        const where: any = { id: notificationId };
        if (userScope.scope !== 'superadmin') {
            where.userId = userScope.userId;
            
            // Role-based notification type filtering with direct hierarchy fields
            if (userScope.scope === 'smallgroup') {
                // Small group leaders only see attendance_miss notifications for their specific small group
                where.eventType = 'attendance_miss';
                
                // Direct hierarchy filtering - much more efficient than JSON metadata
                if (userScope.smallGroupId) {
                    where.smallGroupId = userScope.smallGroupId;
                }
                
            } else if (userScope.scope === 'university') {
                // University users only see university_acknowledgment notifications for their university
                where.eventType = 'university_acknowledgment';
                
                // Direct hierarchy filtering
                if (userScope.universityId) {
                    where.universityId = userScope.universityId;
                }
                
            } else if (userScope.scope === 'region') {
                // Region users can see notifications for their region
                if (userScope.regionId) {
                    where.regionId = userScope.regionId;
                }
            }
        }

        // Check if notification exists and user has access
        const existingNotification = await prisma.notification.findFirst({
            where
        });

        if (!existingNotification) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        // Prepare update data
        const updateData: any = {
            ...(data.status && { status: data.status }),
            ...(data.readAt !== undefined && { readAt: data.readAt }),
        };

        // If notification is being marked as read by a small group leader, change status to 'marked'
        if (data.readAt && userScope.scope === 'smallgroup' && existingNotification.eventType === 'attendance_miss') {
            updateData.status = 'marked';
        }

        // Update notification with all changes in a single operation
        const updatedNotification = await prisma.notification.update({
            where: { id: notificationId },
            data: updateData,
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

        // If notification is being marked as read and user is a small group leader, send university notification
        if (data.readAt && userScope.scope === 'smallgroup' && existingNotification.eventType === 'attendance_miss') {
            try {
                await NotificationService.sendUniversityNotificationOnMarkRead(notificationId, userScope.userId);
            } catch (notificationError) {
                console.error('Error sending university notification:', notificationError);
                // Don't fail the request if university notification fails
            }
        }

        return NextResponse.json(updatedNotification, { status: 200 });

    } catch (error) {
        console.error("Error updating notification:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const notificationId = parseInt(params.id);
        if (isNaN(notificationId)) {
            return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
        }

        // Build where clause with RLS
        const where: any = { id: notificationId };
        if (userScope.scope !== 'superadmin') {
            where.userId = userScope.userId;
            
            // Role-based notification type filtering with direct hierarchy fields
            if (userScope.scope === 'smallgroup') {
                // Small group leaders only see attendance_miss notifications for their specific small group
                where.eventType = 'attendance_miss';
                
                // Direct hierarchy filtering - much more efficient than JSON metadata
                if (userScope.smallGroupId) {
                    where.smallGroupId = userScope.smallGroupId;
                }
                
            } else if (userScope.scope === 'university') {
                // University users only see university_acknowledgment notifications for their university
                where.eventType = 'university_acknowledgment';
                
                // Direct hierarchy filtering
                if (userScope.universityId) {
                    where.universityId = userScope.universityId;
                }
                
            } else if (userScope.scope === 'region') {
                // Region users can see notifications for their region
                if (userScope.regionId) {
                    where.regionId = userScope.regionId;
                }
            }
        }

        // Check if notification exists and user has access
        const existingNotification = await prisma.notification.findFirst({
            where
        });

        if (!existingNotification) {
            return NextResponse.json({ error: "Notification not found" }, { status: 404 });
        }

        // Delete notification
        await prisma.notification.delete({
            where: { id: notificationId }
        });

        return NextResponse.json({ message: "Notification deleted successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error deleting notification:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
