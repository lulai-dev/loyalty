function b64(name) {
  const v = process.env[name];
  return v ? Buffer.from(v, "base64").toString("utf8") : null;
}

module.exports = {
  BASE_URL: (process.env.BASE_URL || "").replace(/\/$/, ""),
  ROOT_DOMAIN: process.env.ROOT_DOMAIN || "",
  SESSION_SECRET: process.env.SESSION_SECRET || "cambia-este-secreto",

  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  PASS_TYPE_ID: process.env.PASS_TYPE_ID,
  appleWwdr: () => b64("APPLE_WWDR_B64"),
  appleSignerCert: () => b64("APPLE_SIGNER_CERT_B64"),
  appleSignerKey: () => b64("APPLE_SIGNER_KEY_B64"),
  APPLE_SIGNER_KEY_PASSPHRASE: process.env.APPLE_SIGNER_KEY_PASSPHRASE || "",

  GOOGLE_ISSUER_ID: process.env.GOOGLE_ISSUER_ID,
  GOOGLE_SA_EMAIL: process.env.GOOGLE_SA_EMAIL,
  googleSaKey: () => b64("GOOGLE_SA_KEY_B64"),
};
