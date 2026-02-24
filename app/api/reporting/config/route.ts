import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/rls";

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'reporting-config';

export async function GET(req: Request) {
    try {
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

        const preferPrimary = (req as any).headers?.get?.('x-read-after-write') === '1';

        if (!preferPrimary) {
            const cached = await cacheGet<any[]>(CACHE_KEY);
            if (cached) return NextResponse.json(cached);
        }

        const db = getPrismaClient('read', { preferPrimary });
        const priorities = await db.strategic_priority.findMany({
            include: {
                activity_category: {
                    include: {
                        activity_template: true,
                    },
                },
                evaluation_question: true,
            },
        });

        const formatted = priorities.map((priority) => ({
            id: priority.id,
            name: priority.name,
            description: priority.description ?? "",
            categories: priority.activity_category.map((category) => ({
                id: category.id,
                name: category.name,
                templates: category.activity_template.map((template) => ({
                    id: template.id,
                    name: template.name,
                })),
            })),
            questions: priority.evaluation_question.map((question) => ({
                id: question.id,
                statement: question.statement,
            })),
        }));

        if (!preferPrimary) {
            await cacheSet(CACHE_KEY, formatted, { ttlSeconds: 600 });
        }
        return NextResponse.json(formatted);
    } catch (error) {
        console.error("[/api/reporting/config] Error fetching config:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: "Internal Server Error", detail: message }, { status: 500 });
    }
}
