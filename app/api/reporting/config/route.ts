import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const priorities = await prisma.strategicPriority.findMany({
            include: {
                categories: {
                    include: {
                        templates: true,
                    },
                },
                questions: true,
            },
        });
        return NextResponse.json(priorities);
    } catch (error) {
        console.error("[/api/reporting/config] Error fetching config:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: "Internal Server Error", detail: message }, { status: 500 });
    }
}
