import { NextResponse } from "next/server";
import { getCalls } from "@/lib/supabase";

export async function GET() {
  try {
    const calls = await getCalls();
    return NextResponse.json({ calls });
  } catch (error) {
    console.error("Failed to fetch calls", error);
    return NextResponse.json({ calls: [] }, { status: 500 });
  }
}
