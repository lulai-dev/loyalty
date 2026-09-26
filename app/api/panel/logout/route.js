import { NextResponse } from "next/server";
const { clearSession } = require("@/lib/session");

export async function POST() {
  clearSession();
  return NextResponse.json({ ok: true });
}
