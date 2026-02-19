import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const provinces = await prisma.province.findMany({
            orderBy: { name: 'asc' }
        });

        // Serialize BigInt to string for JSON
        const serialized = provinces.map(p => ({
            ...p,
            id: p.id.toString(),
            // If there are other BigInt fields in Province/District relations, handle them too if included
        }));

        return NextResponse.json(serialized);
    } catch (error) {
        console.error("Error fetching provinces:", error);
        return NextResponse.json({ error: "Failed to fetch provinces" }, { status: 500 });
    }
}
