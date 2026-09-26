// Genera y firma el .pkpass de un cliente, con el diseño del programa.
const path = require("path");
const { PKPass } = require("passkit-generator");
const cfg = require("./config");
const { hexToRgb, dataUrlToBuffer, textoComo } = require("./design");

/**
 * @param {object} ctx Contexto de loadPassContext()
 * @returns {Promise<Buffer>}
 */
async function buildPkpass(ctx) {
  const goal = ctx.meta;
  const s = Math.min(ctx.sellos, goal);
  const completo = s >= goal;
  const d = ctx.design;

  const pass = await PKPass.from(
    {
      model: path.join(process.cwd(), "model.pass"),
      certificates: {
        wwdr: cfg.appleWwdr(),
        signerCert: cfg.appleSignerCert(),
        signerKey: cfg.appleSignerKey(),
        signerKeyPassphrase: cfg.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
      },
    },
    {
      serialNumber: ctx.serial,
      passTypeIdentifier: cfg.PASS_TYPE_ID,
      teamIdentifier: cfg.APPLE_TEAM_ID,
      organizationName: ctx.negocio_nombre,
      description: `Tarjeta de lealtad de ${ctx.negocio_nombre}`,
      webServiceURL: `${cfg.BASE_URL}/api`,
      authenticationToken: ctx.auth_token,
      logoText: ctx.negocio_nombre,
      foregroundColor: hexToRgb(d.fg),
      backgroundColor: hexToRgb(d.bg),
      labelColor: hexToRgb(d.label),
    }
  );

  // Logo del negocio (subido en el diseñador). Si no hay, queda el default
  // del modelo. logo.png aparece arriba-izquierda del pase.
  const logoBuf = dataUrlToBuffer(d.logo);
  if (logoBuf) {
    pass.addBuffer("logo.png", logoBuf);
    pass.addBuffer("logo@2x.png", logoBuf);
  }

  pass.setBarcodes({
    message: ctx.serial,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: ctx.serial.slice(0, 8),
  });

  pass.headerFields.push({
    key: "sellos",
    label: "SELLOS",
    value: `${s}/${goal}`,
    changeMessage: "Sellos: %@",
  });

  pass.primaryFields.push({
    key: "estado",
    label: completo ? "¡PREMIO LISTO!" : "PROGRESO",
    value: completo ? ctx.premio : "●".repeat(s) + "○".repeat(goal - s),
  });

  pass.secondaryFields.push({
    key: "cliente",
    label: "CLIENTE",
    value: ctx.nombre,
  });

  pass.backFields.push(
    {
      key: "como",
      label: "¿Cómo funciona?",
      value: textoComo(d, goal, ctx.premio),
    },
    { key: "id", label: "ID de tarjeta", value: ctx.serial }
  );

  return pass.getAsBuffer();
}

module.exports = { buildPkpass };
