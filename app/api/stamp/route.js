// POST /api/stamp  { serial, pin, accion: 'sello' | 'canjear' }
// Lo llama el cajero del negocio. El PIN es el del negocio dueño del pase.
import { NextResponse } from "next/server";
const { sql } = require("@/lib/db");
const { applyStampAction } = require("@/lib/stamps");

export async function POST(req) {
  try {
    const { serial, pin, accion } = await req.json();
    if (!serial) return NextResponse.json({ error: "Falta serial" }, { status: 400 });

    const [neg] = await sql`
      SELECT n.pin FROM pases p
      JOIN programas pr ON pr.id = p.programa_id
      JOIN negocios n ON n.id = pr.negocio_id
      WHERE p.serial = ${serial}
    `;
    if (!neg) return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
    if (pin !== neg.pin) return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });

    const result = await applyStampAction(serial, accion === "canjear" ? "canjear" : "sello", {
      origen: "qr",
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (e) {
    console.error("stamp error:", e);
    return NextResponse.json(
      { error: "Error interno", detail: String(e.message || e) },
      { status: 500 }
    );
  }
}
