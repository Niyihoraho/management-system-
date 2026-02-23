import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";

// GET /api/locations — provinces / districts / sectors (reference data, 1h TTL)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parentId = searchParams.get("parentId");

    const cacheKey = `locations:${type}:${parentId ?? 'all'}`;
    const cached = await cacheGet<any[]>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const db = getPrismaClient('read');

    switch (type) {
      case "provinces": {
        const provinces = await db.province.findMany({ orderBy: { name: "asc" } });
        const result = provinces.map(p => ({ id: p.id.toString(), name: p.name }));
        await cacheSet(cacheKey, result, { ttlSeconds: 3600 });
        return NextResponse.json(result);
      }
      case "districts": {
        if (!parentId) return NextResponse.json({ error: "Parent ID required" }, { status: 400 });
        const districts = await db.district.findMany({
          where: { provinceId: BigInt(parentId) },
          orderBy: { name: "asc" }
        });
        const result = districts.map(d => ({ id: d.id.toString(), name: d.name }));
        await cacheSet(cacheKey, result, { ttlSeconds: 3600 });
        return NextResponse.json(result);
      }
      case "sectors": {
        if (!parentId) return NextResponse.json({ error: "Parent ID required" }, { status: 400 });
        const sectors = await db.sector.findMany({
          where: { districtId: BigInt(parentId) },
          orderBy: { name: "asc" }
        });
        const result = sectors.map(s => ({ id: s.id.toString(), name: s.name }));
        await cacheSet(cacheKey, result, { ttlSeconds: 3600 });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
