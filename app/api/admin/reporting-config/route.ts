import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cacheDel } from "@/lib/cache";

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    // The session.user object seems to have a customized 'roles' property based on lib/auth.ts
    // @ts-ignore
    const userRoles = session.user.roles || [];
    const isSuperAdmin = userRoles.some((role: any) => role.scope === "superadmin");

    if (!isSuperAdmin) {
        return NextResponse.json({ error: "Forbidden: Superadmin access required" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { action, data } = body;

        const CACHE_KEY = 'reporting-config';

        if (action === "create_priority") {
            const priority = await prisma.strategic_priority.create({
                data: {
                    name: data.name,
                    description: data.description,
                },
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json(priority);
        }

        if (action === "create_category") {
            const category = await prisma.activity_category.create({
                data: {
                    name: data.name,
                    priorityId: parseInt(data.priorityId),
                }
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json(category);
        }

        if (action === "create_template") {
            const template = await prisma.activity_template.create({
                data: {
                    name: data.name,
                    categoryId: parseInt(data.categoryId),
                }
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json(template);
        }

        if (action === "create_question") {
            const question = await prisma.evaluation_question.create({
                data: {
                    statement: data.statement,
                    priorityId: parseInt(data.priorityId),
                }
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json(question);
        }

        if (action === "delete_priority") {
            await prisma.strategic_priority.delete({
                where: { id: parseInt(data.id) }
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json({ success: true });
        }

        if (action === "delete_category") {
            await prisma.activity_category.delete({
                where: { id: parseInt(data.id) }
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json({ success: true });
        }

        if (action === "delete_template") {
            await prisma.activity_template.delete({
                where: { id: parseInt(data.id) }
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json({ success: true });
        }

        if (action === "delete_question") {
            await prisma.evaluation_question.delete({
                where: { id: parseInt(data.id) }
            });
            await cacheDel(CACHE_KEY);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error in reporting-config:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
