// Da de alta a un dueño de negocio (tú operas el alta).
// Uso:  DATABASE_URL=postgres://... node scripts/crear-usuario.js correo@x.com password "Nombre Apellido"
// (o con .env.local cargado:  npm run crear-usuario -- correo@x.com password "Nombre")
const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");

async function main() {
  const [email, password, nombre] = process.argv.slice(2);
  if (!email || !password || !nombre) {
    console.log('Uso: node scripts/crear-usuario.js correo@x.com password "Nombre"');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.log("Falta DATABASE_URL en el entorno.");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const hash = bcrypt.hashSync(password, 10);
  const [u] = await sql`
    INSERT INTO usuarios (email, password_hash, nombre)
    VALUES (${email.toLowerCase().trim()}, ${hash}, ${nombre})
    ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}, nombre = ${nombre}
    RETURNING id, email
  `;
  console.log(`Usuario listo: #${u.id} ${u.email} (si ya existía, se actualizó su contraseña)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
