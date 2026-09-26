// GET  /api/panel/negocios         → negocios del usuario con sus programas
// POST /api/panel/negocios         → crear negocio { nombre, slug, giro, pin }
// PATCH /api/panel/negocios        → editar { id, nombre?, giro?, pin? }
import { NextResponse } from "next/server";
const { sql } = require("@/lib/db");
const { getSession } = require("@/lib/session");

export async function GET() {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const negocios = await sql`
    SELECT n.id, n.nombre, n.slug, n.giro, n.pin,
      COALESCE(json_agg(json_build_object(
        'id', pr.id, 'nombre', pr.nombre, 'meta', pr.meta, 'premio', pr.premio,
        'activo', pr.activo
      ) ORDER BY pr.id) FILTER (WHERE pr.id IS NOT NULL), '[]') AS programas
    FROM negocios n
    LEFT JOIN programas pr ON pr.negocio_id = n.id
    WHERE n.usuario_id = ${ses.uid}
    GROUP BY n.id ORDER BY n.id
  `;
  return NextResponse.json({ negocios });
}

export async function POST(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const { nombre, slug, giro, pin } = await req.json();
    const cleanSlug = String(slug || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!nombre || !cleanSlug) {
      return NextResponse.json({ error: "Faltan nombre o slug" }, { status: 400 });
    }
    if (["www", "panel", "api", "app"].includes(cleanSlug)) {
      return NextResponse.json({ error: "Ese slug está reservado" }, { status: 400 });
    }
    const [n] = await sql`
      INSERT INTO negocios (usuario_id, nombre, slug, giro, pin)
      VALUES (${ses.uid}, ${nombre.trim()}, ${cleanSlug}, ${giro || null}, ${pin || "1234"})
      RETURNING id, nombre, slug
    `;
    // Cada negocio nace con un programa de sellos por defecto.
    await sql`
      INSERT INTO programas (negocio_id, nombre) VALUES (${n.id}, 'Tarjeta de sellos')
    `;
    return NextResponse.json({ negocio: n });
  } catch (e) {
    if (String(e).includes("negocios_slug_key")) {
      return NextResponse.json({ error: "Ese slug ya está ocupado" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const ses = await getSession();
  if (!ses) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, nombre, giro, pin } = await req.json();
  const [n] = await sql`
    UPDATE negocios SET
      nombre = COALESCE(${nombre || null}, nombre),
      giro   = COALESCE(${giro || null}, giro),
      pin    = COALESCE(${pin || null}, pin)
    WHERE id = ${id} AND usuario_id = ${ses.uid}
    RETURNING id, nombre, slug, giro, pin
  `;
  if (!n) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  return NextResponse.json({ negocio: n });
}
