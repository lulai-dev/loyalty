// Google Wallet multi-programa: UNA clase por programa (del emisor de la
// plataforma), objetos por cliente, link de guardado (JWT) y updates.
const jwt = require("jsonwebtoken");
const { JWT } = require("google-auth-library");
const cfg = require("./config");
const { textoComo } = require("./design");

const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

const classId = (programaId) => `${cfg.GOOGLE_ISSUER_ID}.programa_${programaId}`;
const objectId = (serial) =>
  `${cfg.GOOGLE_ISSUER_ID}.${serial.replace(/[^a-zA-Z0-9_.-]/g, "")}`;

async function authClient() {
  const client = new JWT({
    email: cfg.GOOGLE_SA_EMAIL,
    key: cfg.googleSaKey(),
    scopes: [SCOPE],
  });
  await client.authorize();
  return client;
}

function classPayload(ctx) {
  return {
    id: classId(ctx.programa_id),
    issuerName: ctx.negocio_nombre,
    programName: `${ctx.programa_nombre} · ${ctx.negocio_nombre}`,
    programLogo: {
      sourceUri: { uri: `${cfg.BASE_URL}/api/img/${ctx.programa_id}/logo` },
      contentDescription: {
        defaultValue: { language: "es", value: ctx.negocio_nombre },
      },
    },
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: ctx.design.bg,
    countryCode: "MX",
  };
}

/** Crea o actualiza la clase del programa (se llama en registro y al guardar diseño). */
async function ensureClass(ctx) {
  const client = await authClient();
  const id = classId(ctx.programa_id);
  const payload = classPayload(ctx);
  const res = await client.request({
    url: `${API}/loyaltyClass/${id}`,
    method: "GET",
    validateStatus: () => true,
  });
  if (res.status === 200) {
    await client.request({ url: `${API}/loyaltyClass/${id}`, method: "PUT", data: payload });
  } else {
    await client.request({ url: `${API}/loyaltyClass`, method: "POST", data: payload });
  }
  return id;
}

function buildObject(ctx) {
  const goal = ctx.meta;
  const s = Math.min(ctx.sellos, goal);
  const completo = s >= goal;
  const visual = ("● ".repeat(s) + "○ ".repeat(goal - s)).trim();
  const obj = {
    id: objectId(ctx.serial),
    classId: classId(ctx.programa_id),
    state: "ACTIVE",
    accountId: ctx.serial,
    accountName: ctx.nombre,
    barcode: { type: "QR_CODE", value: ctx.serial, alternateText: ctx.serial.slice(0, 8) },
    loyaltyPoints: {
      label: completo ? "¡PREMIO LISTO! 🎉" : "Tus sellos",
      balance: { string: completo ? ctx.premio : visual },
    },
    secondaryLoyaltyPoints: {
      label: "Progreso",
      balance: { string: `${s} de ${goal}` },
    },
    textModulesData: [
      {
        id: "como",
        header: "¿Cómo funciona?",
        body: textoComo(ctx.design, goal, ctx.premio),
      },
    ],
  };
  if (ctx.design.hero) {
    obj.heroImage = {
      sourceUri: { uri: `${cfg.BASE_URL}/api/img/${ctx.programa_id}/hero` },
      contentDescription: {
        defaultValue: { language: "es", value: ctx.negocio_nombre },
      },
    };
  }
  return obj;
}

async function createSaveLink(ctx) {
  await ensureClass(ctx);
  const client = await authClient();
  const obj = buildObject(ctx);

  const res = await client.request({
    url: `${API}/loyaltyObject`,
    method: "POST",
    data: obj,
    validateStatus: () => true,
  });
  if (res.status === 409) {
    await client.request({ url: `${API}/loyaltyObject/${obj.id}`, method: "PUT", data: obj });
  } else if (res.status >= 400) {
    throw new Error(`Google Wallet ${res.status}: ${JSON.stringify(res.data)}`);
  }

  const claims = {
    iss: cfg.GOOGLE_SA_EMAIL,
    aud: "google",
    typ: "savetowallet",
    payload: { loyaltyObjects: [{ id: obj.id }] },
  };
  const token = jwt.sign(claims, cfg.googleSaKey(), { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}

async function updateStamps(ctx) {
  const client = await authClient();
  const obj = buildObject(ctx);
  await client.request({ url: `${API}/loyaltyObject/${obj.id}`, method: "PUT", data: obj });
}

module.exports = { createSaveLink, updateStamps, ensureClass };
