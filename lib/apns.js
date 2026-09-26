// Push a APNs para pases de Apple Wallet (payload vacío: solo avisa
// que hay versión nueva; el iPhone viene por ella a /api/v1/passes/...).
const http2 = require("http2");
const cfg = require("./config");

const APNS_HOST = "https://api.push.apple.com";

function pushToPass(pushToken) {
  return new Promise((resolve, reject) => {
    const client = http2.connect(APNS_HOST, {
      cert: cfg.appleSignerCert(),
      key: cfg.appleSignerKey(),
      passphrase: cfg.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
    });
    client.on("error", reject);

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": cfg.PASS_TYPE_ID,
      "apns-push-type": "background",
      "content-type": "application/json",
    });

    let status = 0;
    let body = "";
    req.on("response", (h) => (status = h[":status"]));
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      client.close();
      resolve({ status, body });
    });
    req.on("error", (e) => {
      client.close();
      reject(e);
    });
    req.end(JSON.stringify({}));
  });
}

async function notifyPass(sql, serial) {
  const registros = await sql`
    SELECT push_token FROM apple_registros WHERE serial = ${serial}
  `;
  const resultados = [];
  for (const r of registros) {
    try {
      resultados.push(await pushToPass(r.push_token));
    } catch (e) {
      resultados.push({ status: 0, body: String(e) });
    }
  }
  if (resultados.some((r) => r.status !== 200)) {
    console.log("APNs resultados:", JSON.stringify(resultados));
  }
  return resultados;
}

module.exports = { pushToPass, notifyPass };
