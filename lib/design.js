// Diseño por defecto de una tarjeta y utilidades para combinarlo con el
// JSON guardado en programas.diseno. Un solo objeto alimenta el pase de
// Apple, el de Google y los previews del diseñador.
const DEFAULTS = {
  bg: "#3c2d23",     // fondo
  fg: "#ffffff",     // texto principal
  label: "#ebdcc8",  // etiquetas
  logo: null,        // dataURL PNG (subido en el diseñador)
  hero: null,        // dataURL PNG banner Google (opcional)
  como: null,        // texto "¿cómo funciona?" personalizado
};

function mergeDesign(diseno) {
  return { ...DEFAULTS, ...(diseno || {}) };
}

function hexToRgb(hex) {
  const h = (hex || "#000000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  const base64 = dataUrl.split(",")[1];
  return base64 ? Buffer.from(base64, "base64") : null;
}

function textoComo(design, meta, premio) {
  return (
    design.como ||
    `Junta ${meta} sellos y llévate ${premio}. Muestra este pase al pagar para recibir tu sello.`
  );
}

module.exports = { DEFAULTS, mergeDesign, hexToRgb, dataUrlToBuffer, textoComo };
