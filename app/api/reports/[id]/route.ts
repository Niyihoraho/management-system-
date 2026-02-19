import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const report = await prisma.report_submission.findUnique({
            where: { id: parseInt(params.id) },
            include: {
                user: { select: { name: true, email: true } },
                strategic_priority: { select: { name: true, description: true } },
                activity_log: {
                    include: {
                        activity_category: { select: { name: true } }
                    }
                },
                evaluation_response: {
                    include: {
                        evaluation_question: { select: { statement: true } }
                    }
                }
            }
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        return NextResponse.json(report);
    } catch (error) {
        console.error("Error fetching report details:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
