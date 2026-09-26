// POST /api/register  { slug, nombre, telefono?, plataforma }
// Alta de un cliente final en el programa activo del negocio `slug`.
import crypto from "crypto";
import { NextResponse } from "next/server";
const { sql } = require("@/lib/db");
const { loadPassContext } = require("@/lib/passData");
const { createSaveLink } = require("@/lib/googleWallet");

export async function POST(req) {
  try {
    const { slug, nombre, telefono, plataforma } = await req.json();
    if (!slug || !nombre || !["apple", "google"].includes(plataforma)) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const [programa] = await sql`
      SELECT pr.id FROM programas pr
      JOIN negocios n ON n.id = pr.negocio_id
      WHERE n.slug = ${slug} AND pr.activo = true
      ORDER BY pr.id LIMIT 1
    `;
    if (!programa) {
      return NextResponse.json({ error: "Negocio o programa no encontrado" }, { status: 404 });
    }

    const serial = crypto.randomUUID();
    const authToken = crypto.randomBytes(24).toString("hex");
    await sql`
      INSERT INTO pases (serial, programa_id, nombre, telefono, plataforma, auth_token)
      VALUES (${serial}, ${programa.id}, ${nombre.trim()}, ${telefono || null}, ${plataforma}, ${authToken})
    `;

    if (plataforma === "google") {
      const ctx = await loadPassContext(serial);
      const url = await createSaveLink(ctx);
      return NextResponse.json({ url, serial });
    }
    return NextResponse.json({ url: `/api/pass/${serial}`, serial });
  } catch (e) {
    console.error("register error:", e);
    return NextResponse.json(
      { error: "Error interno", detail: String(e.message || e) },
      { status: 500 }
    );
  }
}
