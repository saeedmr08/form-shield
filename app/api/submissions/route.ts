import { NextResponse } from "next/server";
import { listLiveSubmissions } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ submissions: listLiveSubmissions() });
}
