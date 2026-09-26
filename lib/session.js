// Sesiones del panel: JWT firmado (HS256) en una cookie httpOnly.
const { SignJWT, jwtVerify } = require("jose");
const { cookies } = require("next/headers");
const cfg = require("./config");

const COOKIE = "sesion";
const secret = () => new TextEncoder().encode(cfg.SESSION_SECRET);

async function createSession(usuario) {
  const token = await new SignJWT({ uid: usuario.id, nombre: usuario.nombre })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function getSession() {
  try {
    const token = cookies().get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return payload; // { uid, nombre }
  } catch {
    return null;
  }
}

function clearSession() {
  cookies().delete(COOKIE);
}

module.exports = { createSession, getSession, clearSession };
