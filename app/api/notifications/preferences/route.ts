import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { notificationPreferencesSchema } from "../../validation/notification";
import { getUserScope } from "@/lib/rls";

export async function GET(request: NextRequest) {
    try {
        // Get user scope for RLS
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || userScope.userId;

        // Apply RLS - users can only view their own preferences unless superadmin
        if (userScope.scope !== 'superadmin' && userId !== userScope.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        let preferences = await (prisma as any).notificationpreferences.findUnique({
          where: { userId }
        });

        // Create default preferences if they don't exist
        if (!preferences) {
          preferences = await (prisma as any).notificationpreferences.create({
                data: {
                    userId,
                    attendanceAlerts: true,
                    eventReminders: true,
                    inAppEnabled: true
                }
            });
        }

        return NextResponse.json(preferences, { status: 200 });

    } catch (error) {
        console.error("Error fetching notification preferences:", error);
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
        const validation = notificationPreferencesSchema.safeParse(body);
        
        if (!validation.success) {
            return NextResponse.json(
                { error: "Validation failed", details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Apply RLS - users can only update their own preferences
        const userId = userScope.userId;

        // Upsert preferences (create or update)
        const preferences = await (prisma as any).notificationpreferences.upsert({
            where: { userId },
            update: {
                attendanceAlerts: data.attendanceAlerts,
                eventReminders: data.eventReminders,
                inAppEnabled: data.inAppEnabled,
                updatedAt: new Date()
            },
            create: {
                userId,
                attendanceAlerts: data.attendanceAlerts,
                eventReminders: data.eventReminders,
                inAppEnabled: data.inAppEnabled
            }
        });

        return NextResponse.json(preferences, { status: 200 });

    } catch (error) {
        console.error("Error updating notification preferences:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
