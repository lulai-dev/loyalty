// Web service de Apple Wallet — los 5 endpoints que el iPhone llama solo.
// webServiceURL = BASE_URL/api → Apple agrega /v1/... y cae aquí.
import { NextResponse } from "next/server";
const { sql } = require("@/lib/db");
const { loadPassContext } = require("@/lib/passData");
const { buildPkpass } = require("@/lib/applePass");

async function authedPass(req, serial) {
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^ApplePass\s+/i, "");
  if (!token) return null;
  const ctx = await loadPassContext(serial);
  if (!ctx || ctx.auth_token !== token) return null;
  return ctx;
}

async function handle(req, params) {
  const parts = params.path || [];

  // POST /v1/log — errores que reportan los iPhones
  if (parts[0] === "log" && req.method === "POST") {
    try {
      console.log("Apple Wallet log:", JSON.stringify(await req.json()));
    } catch {}
    return new NextResponse(null, { status: 200 });
  }

  // GET /v1/passes/:passTypeId/:serial — descarga del pase actualizado
  if (parts[0] === "passes" && parts.length === 3 && req.method === "GET") {
    const ctx = await authedPass(req, parts[2]);
    if (!ctx) return new NextResponse(null, { status: 401 });

    const ims = req.headers.get("if-modified-since");
    const lastMod = new Date(ctx.actualizado_en);
    if (ims && new Date(ims) >= new Date(lastMod.toUTCString())) {
      return new NextResponse(null, { status: 304 });
    }
    const buffer = await buildPkpass(ctx);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Last-Modified": lastMod.toUTCString(),
      },
    });
  }

  // /v1/devices/:deviceId/registrations/:passTypeId[/:serial]
  if (parts[0] === "devices" && parts[2] === "registrations") {
    const deviceId = parts[1];
    const serial = parts[4];

    // Registro: AQUÍ LLEGA EL PUSH TOKEN.
    if (req.method === "POST" && serial) {
      const ctx = await authedPass(req, serial);
      if (!ctx) return new NextResponse(null, { status: 401 });
      let body = {};
      try {
        body = await req.json();
      } catch {}
      if (!body.pushToken) return new NextResponse(null, { status: 400 });

      const existing = await sql`
        SELECT 1 FROM apple_registros
        WHERE device_library_id = ${deviceId} AND serial = ${serial}
      `;
      await sql`
        INSERT INTO apple_registros (device_library_id, serial, push_token)
        VALUES (${deviceId}, ${serial}, ${body.pushToken})
        ON CONFLICT (device_library_id, serial) DO UPDATE SET push_token = ${body.pushToken}
      `;
      return new NextResponse(null, { status: existing.length ? 200 : 201 });
    }

    // El cliente quitó el pase de su Wallet.
    if (req.method === "DELETE" && serial) {
      const ctx = await authedPass(req, serial);
      if (!ctx) return new NextResponse(null, { status: 401 });
      await sql`
        DELETE FROM apple_registros
        WHERE device_library_id = ${deviceId} AND serial = ${serial}
      `;
      return new NextResponse(null, { status: 200 });
    }

    // ¿Qué pases de este dispositivo cambiaron desde X?
    if (req.method === "GET" && !serial) {
      const url = new URL(req.url);
      const sinceParam = url.searchParams.get("passesUpdatedSince");
      const since = sinceParam ? new Date(parseInt(sinceParam, 10) * 1000) : new Date(0);
      const rows = await sql`
        SELECT p.serial, p.actualizado_en
        FROM apple_registros r JOIN pases p ON p.serial = r.serial
        WHERE r.device_library_id = ${deviceId} AND p.actualizado_en > ${since.toISOString()}
      `;
      if (!rows.length) return new NextResponse(null, { status: 204 });
      const lastUpdated = Math.max(...rows.map((r) => new Date(r.actualizado_en).getTime()));
      return NextResponse.json({
        serialNumbers: rows.map((r) => r.serial),
        lastUpdated: String(Math.floor(lastUpdated / 1000)),
      });
    }
  }

  return new NextResponse(null, { status: 404 });
}

async function safeHandle(req, { params }) {
  try {
    return await handle(req, params);
  } catch (e) {
    console.error("apple web service error:", e);
    return new NextResponse(null, { status: 500 });
  }
}

export { safeHandle as GET, safeHandle as POST, safeHandle as DELETE };
