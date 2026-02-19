import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/locations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const parentId = searchParams.get("parentId");

    switch (type) {
      case "provinces":
        const provinces = await prisma.province.findMany({
          orderBy: { name: "asc" }
        });
        return NextResponse.json(provinces.map(p => ({
          id: p.id.toString(),
          name: p.name
        })));

      case "districts":
        if (!parentId) {
          return NextResponse.json({ error: "Parent ID required" }, { status: 400 });
        }
        const districts = await prisma.district.findMany({
          where: { provinceId: BigInt(parentId) },
          orderBy: { name: "asc" }
        });
        return NextResponse.json(districts.map(d => ({
          id: d.id.toString(),
          name: d.name
        })));

      case "sectors":
        if (!parentId) {
          return NextResponse.json({ error: "Parent ID required" }, { status: 400 });
        }
        const sectors = await prisma.sector.findMany({
          where: { districtId: BigInt(parentId) },
          orderBy: { name: "asc" }
        });
        return NextResponse.json(sectors.map(s => ({
          id: s.id.toString(),
          name: s.name
        })));

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
