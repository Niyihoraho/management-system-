import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activityId = Number(params.id);
    if (Number.isNaN(activityId)) {
        return NextResponse.json({ error: "Invalid activity id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data: any = {};
    if (typeof body.activityName === "string") data.activityName = body.activityName.trim();
    if (typeof body.beneficiaries === "string" || body.beneficiaries === null) data.beneficiaries = body.beneficiaries;
    if (typeof body.facilitators === "string" || body.facilitators === null) data.facilitators = body.facilitators;
    if (typeof body.followUpPractice === "string" || body.followUpPractice === null) data.followUpPractice = body.followUpPractice;
    if (typeof body.impactSummary === "string" || body.impactSummary === null) data.impactSummary = body.impactSummary;
    if (typeof body.imageUrl === "string" || body.imageUrl === null) data.imageUrl = body.imageUrl;
    if (typeof body.imageUrlSecondary === "string" || body.imageUrlSecondary === null) {
        data.imageUrlSecondary = body.imageUrlSecondary;
    }

    if (typeof body.participantCount !== "undefined") {
        const count = Number(body.participantCount);
        if (!Number.isNaN(count)) {
            data.participantCount = Math.max(0, Math.floor(count));
        }
    }

    if (typeof body.dateOccurred === "string") {
        const date = new Date(body.dateOccurred);
        if (!Number.isNaN(date.valueOf())) {
            data.dateOccurred = date;
        }
    } else if (body.dateOccurred === null) {
        data.dateOccurred = null;
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    try {
        const updated = await prisma.activity_log.update({
            where: { id: activityId },
            data,
            include: {
                activity_category: { select: { name: true } },
                report_submission: {
                    select: {
                        user: { select: { name: true, email: true } },
                        createdAt: true,
                    },
                },
            },
        });

        return NextResponse.json({
            id: updated.id,
            reportId: updated.reportId,
            categoryName: updated.activity_category?.name ?? null,
            activityName: updated.activityName,
            beneficiaries: updated.beneficiaries ?? "",
            participantCount: updated.participantCount,
            dateOccurred: updated.dateOccurred?.toISOString() ?? null,
            facilitators: updated.facilitators ?? "",
            followUpPractice: updated.followUpPractice ?? "",
            impactSummary: updated.impactSummary ?? "",
            imageUrl: updated.imageUrl ?? "",
            imageUrlSecondary: updated.imageUrlSecondary ?? "",
            user: {
                name: updated.report_submission.user?.name ?? null,
                email: updated.report_submission.user?.email ?? null,
            },
            reportCreatedAt: updated.report_submission.createdAt.toISOString(),
        });
    } catch (error) {
        console.error("[PATCH] activity_log", error);
        return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activityId = Number(params.id);
    if (Number.isNaN(activityId)) {
        return NextResponse.json({ error: "Invalid activity id" }, { status: 400 });
    }

    try {
        await prisma.activity_log.delete({ where: { id: activityId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE] activity_log", error);
        return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
    }
}
