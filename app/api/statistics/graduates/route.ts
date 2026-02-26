import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getUserScope } from "@/lib/rls";
import { cacheGet, cacheSet } from "@/lib/cache";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const userScope = await getUserScope();
        if (!userScope) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        if (!["superadmin", "national"].includes(userScope.scope)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const yearParam = searchParams.get('year');
        const year = yearParam ? parseInt(yearParam) : null;

        const preferPrimaryRead = req.headers.get('x-read-after-write') === '1';
        const db = getPrismaClient('read', { preferPrimary: preferPrimaryRead });

        const cacheKey = `stats_graduates:${session.user.id ?? 'anonymous'}:${year || 'all'}`;
        if (!preferPrimaryRead) {
            const cached = await cacheGet<any>(cacheKey);
            if (cached) {
                return NextResponse.json(cached);
            }
        }

        // Calculate start and end date if a year is provided to filter graduates
        let dateFilter = {};
        if (year) {
            const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
            const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
            dateFilter = {
                createdAt: {
                    gte: startDate,
                    lt: endDate,
                }
            };
        }

        // Fetch all provinces with their graduates and small groups
        const provinces = await db.province.findMany({
            include: {
                graduate: {
                    where: dateFilter,
                    select: {
                        id: true,
                        sex: true,
                    }
                },
                graduatesmallgroup: {
                    include: {
                        graduate: {
                            where: dateFilter,
                            select: {
                                id: true,
                            }
                        }
                    }
                }
            }
        }) as any[];

        const stats = provinces.map(province => {
            const totalGraduates = province.graduate.length;
            const maleGraduates = province.graduate.filter((g: any) => g.sex === 'Male').length;
            const femaleGraduates = province.graduate.filter((g: any) => g.sex === 'Female').length;
            const totalSmallGroups = province.graduatesmallgroup.length;

            const smallGroupStats = province.graduatesmallgroup.map((group: any) => ({
                id: group.id,
                name: group.name,
                totalGraduates: group.graduate.length,
            }));

            return {
                id: Number(province.id),
                name: province.name,
                totalGraduates,
                maleGraduates,
                femaleGraduates,
                totalSmallGroups,
                smallGroupStats,
            };
        });

        const payload = { stats };

        if (!preferPrimaryRead) {
            await cacheSet(cacheKey, payload, { ttlSeconds: 300 });
        }

        return NextResponse.json(payload);

    } catch (error) {
        console.error("[STATISTICS_GRADUATES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
