import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope, getReportRLSConditions } from "@/lib/rls";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { priorityId, regionId, activities, evaluations } = body;

        const userId = session.user.id;

        const report = await prisma.report_submission.create({
            data: {
                userId,
                priorityId: parseInt(priorityId),
                regionId: regionId ? parseInt(regionId) : null,
                activity_log: {
                    create: activities.map((act: any) => ({
                        categoryId: parseInt(act.categoryId),
                        activityName: act.activityName,
                        beneficiaries: act.beneficiaries,
                        participantCount: parseInt(act.participantCount),
                        dateOccurred: new Date(act.dateOccurred),
                        facilitators: act.facilitators,
                        followUpPractice: act.followUpPractice,
                        impactSummary: act.impactSummary,
                        imageUrl: act.imageUrl,
                    })),
                },
                evaluation_response: {
                    create: evaluations.map((evalResponse: any) => ({
                        questionId: parseInt(evalResponse.questionId),
                        rating: evalResponse.rating,
                    })),
                },
            },
        });

        return NextResponse.json(report);
    } catch (error) {
        console.error("Error submitting report:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // @ts-ignore
        const userScope = await getUserScope(session.user.id);
        const whereConditions = getReportRLSConditions(userScope);

        // Check for explicit block (id: -1)
        if (whereConditions.id === -1) {
            return NextResponse.json({ error: "Access Denied: You do not have permission to view reports." }, { status: 403 });
        }

        const reports = await prisma.report_submission.findMany({
            where: whereConditions,
            include: {
                user: {
                    select: { name: true, email: true }
                },
                strategic_priority: {
                    select: { name: true }
                },
                activity_log: {
                    select: { id: true, participantCount: true, followUpPractice: true }
                },
                evaluation_response: {
                    select: { id: true }
                }
            },
            take: 100, // Limit
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(reports);
    } catch (error) {
        console.error("Error fetching reports:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
