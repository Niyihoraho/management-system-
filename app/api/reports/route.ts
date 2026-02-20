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
        const userScope = await getUserScope();
        if (!userScope) {
            return NextResponse.json({ error: "Access Denied: Unable to determine user scope." }, { status: 403 });
        }

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
                    select: { id: true, name: true, description: true }
                },
                activity_log: {
                    select: {
                        id: true,
                        categoryId: true,
                        activityName: true,
                        beneficiaries: true,
                        participantCount: true,
                        dateOccurred: true,
                        facilitators: true,
                        followUpPractice: true,
                        impactSummary: true,
                        imageUrl: true,
                        activity_category: {
                            select: { name: true }
                        }
                    }
                },
                evaluation_response: {
                    select: {
                        id: true,
                        questionId: true,
                        rating: true
                    }
                }
            },
            take: 100, // Limit
            orderBy: { createdAt: 'desc' }
        });

        const normalized = reports.map((report) => ({
            id: report.id,
            createdAt: report.createdAt.toISOString(),
            priorityId: report.priorityId,
            priority: report.strategic_priority
                ? {
                    id: report.strategic_priority.id,
                    name: report.strategic_priority.name,
                    description: report.strategic_priority.description ?? "",
                }
                : null,
            user: {
                name: report.user?.name ?? null,
                email: report.user?.email ?? null,
            },
            activities: report.activity_log.map((activity) => ({
                id: activity.id,
                categoryId: activity.categoryId,
                categoryName: activity.activity_category?.name ?? null,
                activityName: activity.activityName,
                beneficiaries: activity.beneficiaries ?? "",
                participantCount: activity.participantCount,
                dateOccurred: activity.dateOccurred ? activity.dateOccurred.toISOString() : null,
                facilitators: activity.facilitators ?? "",
                followUpPractice: activity.followUpPractice ?? "",
                impactSummary: activity.impactSummary ?? "",
                imageUrl: activity.imageUrl ?? "",
            })),
            evaluations: report.evaluation_response.map((evaluation) => ({
                id: evaluation.id,
                questionId: evaluation.questionId,
                rating: evaluation.rating,
            })),
        }));

        return NextResponse.json(normalized);
    } catch (error) {
        console.error("Error fetching reports:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
