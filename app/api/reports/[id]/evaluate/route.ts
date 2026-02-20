import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const reportId = parseInt(id);
        const body = await req.json();
        const { evaluations } = body;

        if (!Array.isArray(evaluations)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Verify report exists
        const report = await prisma.report_submission.findUnique({
            where: { id: reportId }
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // Transaction: Delete old evaluations for this report (if any) and insert new ones
        await prisma.$transaction([
            prisma.evaluation_response.deleteMany({
                where: { reportId }
            }),
            prisma.evaluation_response.createMany({
                data: evaluations.map((e: any) => ({
                    reportId,
                    questionId: parseInt(e.questionId),
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
