import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";

// GET /api/courses
export async function GET() {
    try {
        const cacheKey = "all_distinct_courses";
        const cached = await cacheGet<string[]>(cacheKey);
        if (cached) return NextResponse.json(cached);

        const db = getPrismaClient('read');

        // Fetch distinct courses from Students and Graduates
        const studentCourses = await db.student.findMany({
            select: { course: true },
            distinct: ['course'],
            where: {
                course: { not: null, notIn: ["", " "] }
            }
        });

        const graduateCourses = await db.graduate.findMany({
            select: { course: true },
            distinct: ['course'],
            where: {
                course: { not: null, notIn: ["", " "] }
            }
        });

        const allCourses = new Set<string>();

        studentCourses.forEach(s => {
            if (s.course) allCourses.add(s.course.trim().replace(/\s+/g, ' '));
        });

        graduateCourses.forEach(g => {
            if (g.course) allCourses.add(g.course.trim().replace(/\s+/g, ' '));
        });

        const result = Array.from(allCourses).sort((a, b) => a.localeCompare(b));

        await cacheSet(cacheKey, result, { ttlSeconds: 3600 }); // cache for 1 hour
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
