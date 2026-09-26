// GET /api/img/:programaId/:tipo  (tipo: logo | hero)
// Sirve las imágenes del diseño (guardadas como dataURL en la BD) como
// URLs públicas — Google Wallet exige URLs HTTPS para sus imágenes.
import { NextResponse } from "next/server";
const { sql } = require("@/lib/db");
const { dataUrlToBuffer } = require("@/lib/design");

export async function GET(_req, { params }) {
  const { programaId, tipo } = params;
  if (!["logo", "hero"].includes(tipo)) return new NextResponse(null, { status: 404 });

  const [row] = await sql`SELECT diseno FROM programas WHERE id = ${parseInt(programaId, 10) || 0}`;
  const dataUrl = row?.diseno?.[tipo];
  const buf = dataUrlToBuffer(dataUrl);
  if (!buf) return new NextResponse(null, { status: 404 });

  const mime = dataUrl.slice(5, dataUrl.indexOf(";")) || "image/png";
  return new NextResponse(buf, {
    status: 200,
    headers: { "Content-Type": mime, "Cache-Control": "public, max-age=300" },
  });
}
