import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReportRLSConditions, getUserScope } from "@/lib/rls";
import type { Prisma } from "@/lib/generated/prisma";
import { format } from "date-fns";
import { readFile, access } from "fs/promises";
import path from "path";
import Mustache from "mustache";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

type MaturityLevel = "NA_OR_NOT_SURE" | "NOT_EVIDENT" | "BEGINNING" | "GROWING" | "MATURING";

const TAG_COLORS = ["#8b3a3a", "#3d6b5e", "#4a6fa5", "#6b4a8a", "#a06b3c"];

const RATING_META: Record<MaturityLevel, { label: string; ratingClass: string; labelClass: string; score: number }> = {
    NA_OR_NOT_SURE: { label: "N/A", ratingClass: "seg-na", labelClass: "r-na", score: 0 },
    NOT_EVIDENT: { label: "Not Evident", ratingClass: "seg-ne", labelClass: "r-ne", score: 1 },
    BEGINNING: { label: "Beginning", ratingClass: "seg-bg", labelClass: "r-bg", score: 2 },
    GROWING: { label: "Growing", ratingClass: "seg-gw", labelClass: "r-gw", score: 3 },
    MATURING: { label: "Maturing", ratingClass: "seg-mt", labelClass: "r-mt", score: 4 },
};

const LEGEND = [
    { label: "N/A", color: "#bbb" },
    { label: "Not Evident", color: "#e05a5a" },
    { label: "Beginning", color: "#e08a3a" },
    { label: "Growing", color: "#c9a84c" },
    { label: "Maturing", color: "#3d6b5e" },
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ExportRequestBody = {
    pillarIds?: number[];
};

const reportQuery = {
    include: {
        user: { select: { name: true, email: true } },
        strategic_priority: { select: { id: true, name: true, description: true } },
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
                imageUrlSecondary: true,
                activity_category: { select: { name: true } },
            },
        },
        evaluation_response: {
            select: {
                id: true,
                questionId: true,
                rating: true,
            },
        },
    },
} satisfies Prisma.report_submissionDefaultArgs;
type ReportWithRelations = Prisma.report_submissionGetPayload<typeof reportQuery>;

const priorityQuery = {
    include: {
        activity_category: true,
        evaluation_question: true,
    },
} satisfies Prisma.strategic_priorityDefaultArgs;
type PriorityWithRelations = Prisma.strategic_priorityGetPayload<typeof priorityQuery>;

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: ExportRequestBody = {};
    try {
        body = await req.json();
    } catch (error) {
        body = {};
    }

    const requestedIds = Array.isArray(body.pillarIds)
        ? body.pillarIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))
        : [];

    const userScope = await getUserScope();
    if (!userScope) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const baseConditions = getReportRLSConditions(userScope);
    if ("id" in baseConditions && baseConditions.id === -1) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let whereInput: Prisma.report_submissionWhereInput = baseConditions as Prisma.report_submissionWhereInput;
    if (requestedIds.length > 0) {
        whereInput = {
            AND: [baseConditions as Prisma.report_submissionWhereInput, { priorityId: { in: requestedIds } }],
        };
    }

    const reports = await prisma.report_submission.findMany({
        ...reportQuery,
        where: whereInput,
        orderBy: { createdAt: "asc" },
    });

    if (reports.length === 0) {
        return NextResponse.json({ error: "There are no submissions to export for the selected pillars." }, { status: 404 });
    }

    const pillarIds = Array.from(new Set(reports.map((report) => report.priorityId).filter((id): id is number => Boolean(id))));

    const priorities = await prisma.strategic_priority.findMany({
        ...priorityQuery,
        where: { id: { in: pillarIds } },
        orderBy: { id: "asc" },
    });

    const generatedAt = new Date();

    const coverLogos = await loadCoverLogos();

    const templateView = buildTemplateView({
        sessionUserName: session.user.name || session.user.email || "Authorized User",
        reports,
        priorities,
        generatedAt,
        logos: coverLogos,
    });

    try {
        const template = await loadTemplate();
        const html = Mustache.render(template, templateView, {}, {
            escape: (value) => value,
        });
        const pdfBuffer = await renderPdf(html);
        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("renderPdf returned an empty buffer");
        }
        const pdfSlice = pdfBuffer.subarray(0, 8).toString("utf-8");
        console.log(`[reports/export] generated pdf bytes: ${pdfBuffer.length}, signature: ${pdfSlice}`);

        const filename = `strategic-report-${format(generatedAt, "yyyyMMdd-HHmmss")}.pdf`;
        const pdfBytes = new Uint8Array(pdfBuffer.length);
        pdfBytes.set(pdfBuffer);
        const pdfArrayBuffer = pdfBytes.buffer;

        return new Response(pdfArrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
                "Content-Length": pdfBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("[reports/export] Failed to generate PDF", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}

async function loadTemplate() {
    const templatePath = path.join(process.cwd(), "templates", "pdf", "pillar-report.html");
    return readFile(templatePath, "utf-8");
}

function buildTemplateView({
    sessionUserName,
    reports,
    priorities,
    generatedAt,
    logos,
}: {
    sessionUserName: string;
    reports: ReportWithRelations[];
    priorities: PriorityWithRelations[];
    generatedAt: Date;
    logos: { primaryLogo: string | null; secondaryLogo: string | null };
}) {
    const priorityMeta = new Map(priorities.map((priority) => [priority.id, priority]));

    type Section = { label: string; activities: any[] };
    const grouped = new Map<number, { sections: Map<number | "uncategorized", Section>; evaluations: Map<number, MaturityLevel[]>; title: string; description: string }>();

    const totalActivities = reports.reduce((sum, report) => sum + report.activity_log.length, 0);

    for (const report of reports) {
        if (!report.priorityId || !report.strategic_priority) continue;
        const key = report.priorityId;
        if (!grouped.has(key)) {
            grouped.set(key, {
                sections: new Map(),
                evaluations: new Map(),
                title: report.strategic_priority.name,
                description: report.strategic_priority.description ?? "",
            });
        }

        const group = grouped.get(key)!;

        for (const activity of report.activity_log) {
            const catKey = activity.categoryId ?? "uncategorized";
            const label = activity.activity_category?.name || "General Activities";
            if (!group.sections.has(catKey)) {
                group.sections.set(catKey, {
                    label,
                    activities: [],
                });
            }

            const photos = buildPhotoSection(activity.imageUrl, activity.imageUrlSecondary, activity.activityName);

            group.sections.get(catKey)!.activities.push({
                name: activity.activityName || "Untitled Activity",
                beneficiaries: activity.beneficiaries || "—",
                participants:
                    typeof activity.participantCount === "number"
                        ? activity.participantCount.toLocaleString("en-US")
                        : "—",
                date: activity.dateOccurred ? format(activity.dateOccurred, "MMM d, yyyy") : "—",
                facilitators: activity.facilitators || "—",
                followUp: activity.followUpPractice || "—",
                impact: activity.impactSummary || undefined,
                impactText: activity.impactSummary || "—",
                photos,
            });
        }

        for (const evaluation of report.evaluation_response) {
            if (!evaluation.questionId || !evaluation.rating) continue;
            const rating = evaluation.rating as MaturityLevel;
            if (!group.evaluations.has(evaluation.questionId)) {
                group.evaluations.set(evaluation.questionId, []);
            }
            group.evaluations.get(evaluation.questionId)!.push(rating);
        }
    }

    const orderedPriorityIds = priorities.map((priority) => priority.id).filter((id) => grouped.has(id));

    const pillars = orderedPriorityIds.map((priorityId, index) => {
        const meta = priorityMeta.get(priorityId);
        const group = grouped.get(priorityId)!;
        const paletteColor = TAG_COLORS[index % TAG_COLORS.length];

        const sections: Section[] = [];
        const seenLabels = new Set<string>();

        if (meta?.activity_category?.length) {
            for (const category of meta.activity_category) {
                const catSection = group.sections.get(category.id);
                if (catSection && catSection.activities.length > 0) {
                    sections.push(catSection);
                    seenLabels.add(catSection.label);
                }
            }
        }

        // Include ad-hoc categories that might not exist in config
        for (const [catKey, section] of group.sections.entries()) {
            if (section.activities.length === 0) continue;
            if (typeof catKey === "number" && meta?.activity_category?.some((cat) => cat.id === catKey)) {
                continue;
            }
            if (!seenLabels.has(section.label)) {
                sections.push(section);
                seenLabels.add(section.label);
            }
        }

        const totalEvaluationResponses = Array.from(group.evaluations.values()).reduce((sum, ratings) => sum + ratings.length, 0);
        const evaluationQuestions = meta?.evaluation_question ?? [];
        const evaluation = totalEvaluationResponses > 0 && evaluationQuestions.length
            ? {
                title: "Pillar Evaluation",
                description: `Summary of evaluation submissions for ${meta?.name ?? "this pillar"}.`,
                legend: LEGEND,
                questions: evaluationQuestions
                    .map((question) => summarizeQuestion(group.evaluations.get(question.id) || [], question.statement))
                    .filter((question) => question.hasData),
            }
            : null;

        const filteredQuestions = evaluation?.questions ?? [];
        const hasEvaluationData = filteredQuestions.length > 0;
        const hasActivityData = sections.some((section) => section.activities.length > 0);

        if (!hasActivityData && !hasEvaluationData) {
            return null;
        }

        const finalEvaluation = hasEvaluationData
            ? {
                ...evaluation!,
                questions: filteredQuestions.map(({ hasData, ...rest }) => rest),
            }
            : null;

        return {
            id: priorityId,
            number: String(index + 1).padStart(2, "0"),
            tagColor: paletteColor,
            tagLabel: (meta?.name?.split(":")[0] || meta?.name || "Priority").trim(),
            title: meta?.name || group.title,
            subtitle: meta?.description || group.description || "Strategic Priority",
            vision: meta?.description || group.description || "This strategic priority does not have a description yet.",
            sections,
            evaluation: finalEvaluation,
            animationDelay: ((index + 1) * 0.1).toFixed(1),
            isLast: index === orderedPriorityIds.length - 1,
        };
    }).filter(Boolean) as Array<{ id: number; number: string; tagColor: string; tagLabel: string; title: string; subtitle: string; vision: string; sections: Section[]; evaluation: any; animationDelay: string; isLast: boolean }>;

    const coverStatement = pillars[0]?.vision
        || pillars[0]?.subtitle
        || "We want to see strategic initiatives thriving across every pillar.";

    return {
        organizationBadge: "GBUR Student Ministry",
        reportTitle: "Annual Report",
        reportTheme: "Thriving Together",
        reportSubtitle: `Strategic Reporting Export — ${format(generatedAt, "MMMM d, yyyy")}`,
        coverStatement,
        meta: [
            { label: "Prepared For", value: sessionUserName },
            logos.primaryLogo
                ? { logo: logos.primaryLogo, logoAlt: "GBUR Student Ministry" }
                : { label: "Total Submissions", value: reports.length.toString() },
            logos.secondaryLogo
                ? { logo: logos.secondaryLogo, logoAlt: "IFES" }
                : { label: "Pillars Included", value: pillars.length.toString() },
            { label: "Generated", value: format(generatedAt, "PPP") },
        ],
        pillars,
        footerLineOne: `GBUR Student Ministry · Strategic Reporting · ${format(generatedAt, "yyyy")}`,
        footerLineTwo: `${pillars.length} pillar${pillars.length === 1 ? "" : "s"}, ${totalActivities} activit${totalActivities === 1 ? "y" : "ies"} · Generated ${format(generatedAt, "PPP")}`,
    };
}

function buildPlaceholderActivity(message: string) {
    return {
        name: message,
        beneficiaries: "—",
        participants: "—",
        date: "—",
        facilitators: "—",
        followUp: "—",
        impactText: message,
    };
}

function buildPhotoSection(primary?: string | null, secondary?: string | null, caption?: string | null) {
    const urls = [primary, secondary]
        .map((url) => (url ?? "").trim())
        .filter((url) => url.length > 0);
    if (urls.length === 0) return undefined;
    return {
        countLabel: urls.length === 1 ? "1 photo" : `${urls.length} photos`,
        items: urls.map((src, index) => ({
            src,
            caption: caption ? `${caption} · View ${index + 1}` : `Evidence ${index + 1}`,
        })),
    };
}

function summarizeQuestion(ratings: MaturityLevel[], statement: string) {
    if (ratings.length === 0) {
        return {
            statement,
            ratingClass: "seg-na",
            labelClass: "r-na",
            ratingLabel: "Not Rated",
            hasData: false,
        };
    }

    const numericRatings = ratings.filter((rating) => rating !== "NA_OR_NOT_SURE");
    if (numericRatings.length === 0) {
        return {
            statement,
            ratingClass: "seg-na",
            labelClass: "r-na",
            ratingLabel: "N/A",
            hasData: false,
        };
    }

    const averageScore =
        numericRatings.reduce((sum, rating) => sum + RATING_META[rating].score, 0) / numericRatings.length;

    let closest: MaturityLevel = "NOT_EVIDENT";
    let smallestDiff = Number.POSITIVE_INFINITY;
    (Object.keys(RATING_META) as MaturityLevel[]).forEach((level) => {
        if (level === "NA_OR_NOT_SURE") return;
        const diff = Math.abs(RATING_META[level].score - averageScore);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closest = level;
        }
    });

    const meta = RATING_META[closest];
    return {
        statement,
        ratingClass: meta.ratingClass,
        labelClass: meta.labelClass,
        ratingLabel: meta.label,
        hasData: true,
    };
}

async function renderPdf(html: string) {
    const executablePath = await resolveExecutablePath();
    if (!executablePath) {
        throw new Error("Unable to locate a Chromium executable for PDF generation.");
    }

    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: true,
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle2" });
        await page.emulateMediaType("screen");
        const pdf = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0.5in", right: "0.5in", bottom: "0.7in", left: "0.5in" },
        });
        return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}

async function loadCoverLogos() {
    const [primaryLogo, secondaryLogo] = await Promise.all([
        loadAssetDataUri("logo-r.png"),
        loadAssetDataUri("ifeslogo.png"),
    ]);
    return {
        primaryLogo,
        secondaryLogo,
    };
}

async function loadAssetDataUri(fileName: string) {
    try {
        const filePath = path.join(process.cwd(), "public", fileName);
        const buffer = await readFile(filePath);
        const ext = path.extname(fileName).replace(".", "").toLowerCase();
        const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
        return `data:${mime};base64,${buffer.toString("base64")}`;
    } catch (error) {
        console.warn(`[reports/export] Unable to load asset ${fileName}`, error);
        return null;
    }
}

async function resolveExecutablePath() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    try {
        const exePath = await chromium.executablePath();
        if (exePath) return exePath;
    } catch (error) {
        console.warn("[reports/export] chromium-min executable unavailable, trying local browser");
    }

    const fallbacks = [
        // Windows Chrome / Edge
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        // macOS
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        // Linux
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
    ];

    for (const candidate of fallbacks) {
        try {
            await access(candidate);
            return candidate;
        } catch (error) {
            continue;
        }
    }

    return null;
}
