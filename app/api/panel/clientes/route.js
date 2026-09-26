// GET   /api/panel/clientes?programa=N&q=texto  → clientes del programa
// PATCH /api/panel/clientes                     → editar { serial, nombre?, telefono? }
// POST  /api/panel/clientes                     → acción manual
//        { serial, accion: 'sello' | 'canjear' | 'ajuste' | 'reset', valor? }
import { NextResponse } from "next/server";
const { sql } = require("@/lib/db");
const { getSession } = require("@/lib/session");
const { applyStampAction } = require("@/lib/stamps");

async function ownsSerial(uid, serial) {
  const [row] = await sql`
    SELECT 1 FROM pases p
    JOIN programas pr ON pr.id = p.programa_id
    JOIN negocios n ON n.id = pr.negocio_id
    WHERE p.serial = ${serial} AND n.usuario_id = ${uid}
  `;
  return !!row;
}

export async function GET(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(req.url);
  const programaId = parseInt(url.searchParams.get("programa"), 10) || 0;
  const q = (url.searchParams.get("q") || "").trim();

  const [own] = await sql`
    SELECT 1 FROM programas pr JOIN negocios n ON n.id = pr.negocio_id
    WHERE pr.id = ${programaId} AND n.usuario_id = ${ses.uid}
  `;
  if (!own) return NextResponse.json({ error: "Programa no encontrado" }, { status: 404 });

  const like = `%${q}%`;
  const clientes = q
    ? await sql`
        SELECT serial, nombre, telefono, plataforma, sellos, premios, creado_en, actualizado_en
        FROM pases WHERE programa_id = ${programaId}
          AND (nombre ILIKE ${like} OR telefono ILIKE ${like} OR serial ILIKE ${like})
        ORDER BY actualizado_en DESC LIMIT 200
      `
    : await sql`
        SELECT serial, nombre, telefono, plataforma, sellos, premios, creado_en, actualizado_en
        FROM pases WHERE programa_id = ${programaId}
        ORDER BY actualizado_en DESC LIMIT 200
      `;
  return NextResponse.json({ clientes });
}

export async function PATCH(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { serial, nombre, telefono } = await req.json();
  if (!(await ownsSerial(ses.uid, serial))) {
    return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
  }
  await sql`
    UPDATE pases SET
      nombre = COALESCE(${nombre || null}, nombre),
      telefono = COALESCE(${telefono ?? null}, telefono),
      actualizado_en = now()
    WHERE serial = ${serial}
  `;
  return NextResponse.json({ ok: true });
}

export async function POST(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { serial, accion, valor } = await req.json();
  if (!(await ownsSerial(ses.uid, serial))) {
    return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
  }
  if (!["sello", "canjear", "ajuste", "reset"].includes(accion)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }
  const result = await applyStampAction(serial, accion, { origen: "manual", valor });
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
