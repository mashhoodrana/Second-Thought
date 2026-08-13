import { NextResponse } from "next/server";

/**
 * GET /api/health — Next.js health route for Vercel.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
