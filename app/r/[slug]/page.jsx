// Página pública de registro de un negocio (por subdominio o /r/slug).
import RegisterForm from "./registerForm";
const { sql } = require("@/lib/db");
const { mergeDesign } = require("@/lib/design");

export const dynamic = "force-dynamic";

export default async function RegistroPage({ params }) {
  const [row] = await sql`
    SELECT n.nombre AS negocio, pr.meta, pr.premio, pr.diseno
    FROM negocios n
    JOIN programas pr ON pr.negocio_id = n.id AND pr.activo = true
    WHERE n.slug = ${params.slug}
    ORDER BY pr.id LIMIT 1
  `;
  if (!row) {
    return (
      <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: 16 }}>
        <div className="card">Negocio no encontrado.</div>
      </main>
    );
  }
  const design = mergeDesign(row.diseno);
  return (
    <RegisterForm
      slug={params.slug}
      negocio={row.negocio}
      meta={row.meta}
      premio={row.premio}
      design={design}
    />
  );
}
