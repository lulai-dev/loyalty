// GET /api/pass/:serial → descarga el .pkpass firmado con sellos actuales.
import { NextResponse } from "next/server";
const { loadPassContext } = require("@/lib/passData");
const { buildPkpass } = require("@/lib/applePass");

export async function GET(_req, { params }) {
  try {
    const ctx = await loadPassContext(params.serial);
    if (!ctx) return new NextResponse("Pase no encontrado", { status: 404 });
    const buffer = await buildPkpass(ctx);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename=${params.serial}.pkpass`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("pass error:", e);
    return new NextResponse("Error generando el pase", { status: 500 });
  }
}
