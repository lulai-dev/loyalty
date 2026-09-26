// Carga todo lo que un pase necesita: pase + programa + negocio + diseño.
const { sql } = require("./db");
const { mergeDesign } = require("./design");

async function loadPassContext(serial) {
  const [row] = await sql`
    SELECT p.serial, p.nombre, p.telefono, p.plataforma, p.sellos, p.premios,
           p.auth_token, p.actualizado_en,
           pr.id AS programa_id, pr.nombre AS programa_nombre, pr.meta,
           pr.premio, pr.diseno, pr.activo,
           n.id AS negocio_id, n.nombre AS negocio_nombre, n.slug
    FROM pases p
    JOIN programas pr ON pr.id = p.programa_id
    JOIN negocios n  ON n.id = pr.negocio_id
    WHERE p.serial = ${serial}
  `;
  if (!row) return null;
  return { ...row, design: mergeDesign(row.diseno) };
}

module.exports = { loadPassContext };
