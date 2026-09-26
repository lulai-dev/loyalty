// GET   /api/panel/programas?id=N   → un programa (con diseño) del usuario
// POST  /api/panel/programas        → crear { negocio_id, nombre }
// PATCH /api/panel/programas        → editar { id, nombre?, meta?, premio?, activo?, diseno? }
import { NextResponse } from "next/server";
const { sql } = require("@/lib/db");
const { getSession } = require("@/lib/session");
const { loadPassContext } = require("@/lib/passData");
const { ensureClass } = require("@/lib/googleWallet");

async function ownedPrograma(uid, id) {
  const [pr] = await sql`
    SELECT pr.*, n.nombre AS negocio_nombre, n.slug
    FROM programas pr JOIN negocios n ON n.id = pr.negocio_id
    WHERE pr.id = ${id} AND n.usuario_id = ${uid}
  `;
  return pr || null;
}

export async function GET(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = parseInt(new URL(req.url).searchParams.get("id"), 10);
  const pr = await ownedPrograma(ses.uid, id || 0);
  if (!pr) return NextResponse.json({ error: "Programa no encontrado" }, { status: 404 });
  return NextResponse.json({ programa: pr });
}

export async function POST(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { negocio_id, nombre } = await req.json();
  const [n] = await sql`
    SELECT id FROM negocios WHERE id = ${negocio_id} AND usuario_id = ${ses.uid}
  `;
  if (!n) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  const [pr] = await sql`
    INSERT INTO programas (negocio_id, nombre)
    VALUES (${negocio_id}, ${nombre || "Tarjeta de sellos"})
    RETURNING id, nombre
  `;
  return NextResponse.json({ programa: pr });
}

export async function PATCH(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, nombre, meta, premio, activo, diseno } = await req.json();
  const pr = await ownedPrograma(ses.uid, id || 0);
  if (!pr) return NextResponse.json({ error: "Programa no encontrado" }, { status: 404 });

  const [updated] = await sql`
    UPDATE programas SET
      nombre = COALESCE(${nombre ?? null}, nombre),
      meta   = COALESCE(${meta ?? null}, meta),
      premio = COALESCE(${premio ?? null}, premio),
      activo = COALESCE(${activo ?? null}, activo),
      diseno = COALESCE(${diseno ? JSON.stringify(diseno) : null}::jsonb, diseno)
    WHERE id = ${id}
    RETURNING *
  `;

  // Si cambió el diseño, refleja la clase de Google (branding/color/logo)
  // para que las tarjetas ya emitidas también lo tomen. Best-effort.
  if (diseno || nombre) {
    try {
      const [anyPass] = await sql`SELECT serial FROM pases WHERE programa_id = ${id} AND plataforma = 'google' LIMIT 1`;
      if (anyPass) {
        const ctx = await loadPassContext(anyPass.serial);
        await ensureClass(ctx);
      }
    } catch (e) {
      console.error("ensureClass tras diseño:", e);
    }
  }

  return NextResponse.json({ programa: updated });
}
