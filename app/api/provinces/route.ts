import { getPrismaClient } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/cache";

const CACHE_KEY = 'provinces:all';

export async function GET() {
    try {
        const cached = await cacheGet<any>(CACHE_KEY);
        if (cached) return NextResponse.json(cached);

        const db = getPrismaClient('read');
        const provinces = await db.province.findMany({ orderBy: { name: 'asc' } });

        const serialized = provinces.map(p => ({ ...p, id: p.id.toString() }));
        const wrapped = { provinces: serialized };
        await cacheSet(CACHE_KEY, wrapped, { ttlSeconds: 3600 });
        return NextResponse.json(wrapped);
    } catch (error) {
        console.error("Error fetching provinces:", error);
        return NextResponse.json({ error: "Failed to fetch provinces" }, { status: 500 });
    }
}
