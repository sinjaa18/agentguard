import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    error: "ENDPOINT_RETIRED",
    message: "Direct client-supplied simulation is disabled. Start an authenticated evaluation through /api/evaluations/run.",
  }, { status: 410 });
}
