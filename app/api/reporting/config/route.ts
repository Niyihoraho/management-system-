import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const priorities = await prisma.strategic_priority.findMany({
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

        return NextResponse.json(formatted);
    } catch (error) {
        console.error("[/api/reporting/config] Error fetching config:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: "Internal Server Error", detail: message }, { status: 500 });
    }
}
