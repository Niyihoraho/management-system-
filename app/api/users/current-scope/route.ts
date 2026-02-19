import { NextResponse } from "next/server";
import { getUserScope } from "@/lib/rls";

export async function GET() {
    try {
        const scope = await getUserScope();
        return NextResponse.json({ scope });
    } catch (error) {
        console.error("Error fetching user scope:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
