import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const session = await auth();

    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                userRole: {
                    include: {
                        region: true,
                        university: true,
                        smallGroup: true,
                        graduateSmallGroup: true,
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Transform to simplified scope object for frontend
        // Taking the first role as primary for now, or determining based on priority
        const primaryRole = (user as any).userRole?.[0];

        const scope = primaryRole ? {
            scope: primaryRole.scope,
            region: primaryRole.region ? { id: primaryRole.region.id, name: primaryRole.region.name } : null,
            university: primaryRole.university ? { id: primaryRole.university.id, name: primaryRole.university.name } : null,
            smallGroup: primaryRole.smallGroup ? { id: primaryRole.smallGroup.id, name: primaryRole.smallGroup.name } : null,
            graduateSmallGroup: primaryRole.graduateSmallGroup ? { id: primaryRole.graduateSmallGroup.id, name: primaryRole.graduateSmallGroup.name } : null,
        } : null;

        return NextResponse.json({ user, scope });
    } catch (error) {
        console.error("Failed to fetch user details", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
