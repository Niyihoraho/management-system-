import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaturityLevel } from "@/lib/generated/prisma";
import { getUserScope } from "@/lib/rls";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userScope = await getUserScope();
    if (!userScope) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!["superadmin", "national", "region"].includes(userScope.scope)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { id } = await context.params;
        const reportId = parseInt(id);
        const body = await req.json();
        const { evaluations } = body;

        if (!Array.isArray(evaluations)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const parsedEvaluations = evaluations
            .map((e: { questionId: number | string; rating: unknown }) => ({
                questionId: Number(e.questionId),
                rating: e.rating,
            }))
            .filter(
                (e): e is { questionId: number; rating: MaturityLevel } =>
                    Number.isInteger(e.questionId) &&
                    Object.values(MaturityLevel).includes(e.rating as MaturityLevel)
            );

        if (parsedEvaluations.length !== evaluations.length) {
            return NextResponse.json({ error: "Invalid evaluation values" }, { status: 400 });
        }

        // Verify report exists
        const report = await prisma.report_submission.findUnique({
            where: { id: reportId },
            select: {
                id: true,
                regionId: true,
                userId: true,
            },
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        if (
            userScope.scope === "region" &&
            userScope.regionId &&
            report.regionId !== userScope.regionId &&
            report.userId !== session.user.id
        ) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // Transaction: Delete old evaluations for this report (if any) and insert new ones
        await prisma.$transaction([
            prisma.evaluation_response.deleteMany({
                where: { reportId }
            }),
            prisma.evaluation_response.createMany({
                data: parsedEvaluations.map((e) => ({
                    reportId,
                    questionId: e.questionId,
                    rating: e.rating
                }))
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error submitting evaluation:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
