// Lógica central de sellos: la usan el cajero (QR) y el panel (manual).
// Actualiza la BD, audita en eventos y sincroniza el pase en el teléfono.
const { sql } = require("./db");
const { loadPassContext } = require("./passData");
const { notifyPass } = require("./apns");
const { updateStamps } = require("./googleWallet");

/**
 * @param {string} serial
 * @param {"sello"|"canjear"|"ajuste"|"reset"} accion
 * @param {{origen: "qr"|"manual", valor?: number}} opts  valor: sellos absolutos para 'ajuste'
 */
async function applyStampAction(serial, accion, { origen, valor } = { origen: "qr" }) {
  const ctx = await loadPassContext(serial);
  if (!ctx) return { error: "Tarjeta no encontrada", status: 404 };
  const goal = ctx.meta;
  let sellos = ctx.sellos;
  let mensaje;

  if (accion === "canjear") {
    if (sellos < goal) return { error: `Aún no completa: ${sellos}/${goal}`, status: 400 };
    sellos = 0;
    await sql`UPDATE pases SET sellos = 0, premios = premios + 1, actualizado_en = now() WHERE serial = ${serial}`;
    await sql`INSERT INTO eventos (serial, tipo, origen, delta) VALUES (${serial}, 'premio', ${origen}, ${-goal})`;
    mensaje = `Premio canjeado 🎉 La tarjeta de ${ctx.nombre} se reinició (0/${goal}).`;
  } else if (accion === "reset") {
    await sql`UPDATE pases SET sellos = 0, actualizado_en = now() WHERE serial = ${serial}`;
    await sql`INSERT INTO eventos (serial, tipo, origen, delta) VALUES (${serial}, 'reset', ${origen}, ${-sellos})`;
    sellos = 0;
    mensaje = `Tarjeta de ${ctx.nombre} reiniciada a 0/${goal}.`;
  } else if (accion === "ajuste") {
    const nuevo = Math.max(0, Math.min(goal, parseInt(valor, 10) || 0));
    const delta = nuevo - sellos;
    await sql`UPDATE pases SET sellos = ${nuevo}, actualizado_en = now() WHERE serial = ${serial}`;
    await sql`INSERT INTO eventos (serial, tipo, origen, delta) VALUES (${serial}, 'ajuste', ${origen}, ${delta})`;
    sellos = nuevo;
    mensaje = `Sellos de ${ctx.nombre} ajustados a ${nuevo}/${goal}.`;
  } else {
    // 'sello'
    if (sellos >= goal) {
      return {
        error: `Ya tiene el premio listo (${sellos}/${goal}). Usa "Canjear premio".`,
        status: 400,
      };
    }
    sellos += 1;
    await sql`UPDATE pases SET sellos = ${sellos}, actualizado_en = now() WHERE serial = ${serial}`;
    await sql`INSERT INTO eventos (serial, tipo, origen, delta) VALUES (${serial}, 'sello', ${origen}, 1)`;
    mensaje =
      sellos >= goal
        ? `¡${ctx.nombre} completó su tarjeta! (${sellos}/${goal}) → ${ctx.premio}`
        : `Sello agregado a ${ctx.nombre}: ${sellos}/${goal}`;
  }

  // Sincronizar el teléfono del cliente (best-effort)
  let sync = "ok";
  try {
    const fresh = { ...ctx, sellos };
    if (ctx.plataforma === "apple") {
      await notifyPass(sql, serial);
    } else {
      await updateStamps(fresh);
    }
  } catch (e) {
    console.error("sync error:", e);
    sync = "el pase se actualizará en la próxima apertura";
  }

  return { ok: true, sellos, meta: goal, mensaje, sync, nombre: ctx.nombre };
}

module.exports = { applyStampAction };
