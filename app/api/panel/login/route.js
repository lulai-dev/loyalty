// POST /api/panel/login  { email, password }
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
const { sql } = require("@/lib/db");
const { createSession } = require("@/lib/session");

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const [u] = await sql`
      SELECT id, email, password_hash, nombre FROM usuarios
      WHERE email = ${String(email || "").toLowerCase().trim()}
    `;
    if (!u || !bcrypt.compareSync(password || "", u.password_hash)) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    }
    await createSession(u);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
