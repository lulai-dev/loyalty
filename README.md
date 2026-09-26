# Plataforma de tarjetas de lealtad — multi-negocio (v2)

Evolución del proyecto de un solo café a plataforma: **usuarios (dueños) → negocios →
programas → clientes**, con panel de administración, diseñador de tarjetas con preview
de iPhone y Android, y los certificados de Apple/Google **de la plataforma** (los tuyos
firman todo — tus clientes-negocio no necesitan cuentas de Apple ni Google).

## Qué incluye

| Área | Ruta | Qué hace |
|---|---|---|
| Registro público | `/r/{slug}` o `{slug}.tudominio.com` | El cliente final obtiene su tarjeta (Apple/Google se detecta solo) |
| Cajero | `/r/{slug}/cajero` | Escáner QR + PIN del negocio: +1 sello / canjear |
| Panel del dueño | `/panel` | Login, negocios, programas |
| Clientes | `/panel/programa/{id}` | Buscar, editar, +1, ajustar a N, canjear, reset (todo auditado en `eventos`) |
| Diseñador | misma página, pestaña "Diseño" | Colores, logo, banner, textos, meta y premio, con previews en vivo |
| Motor de pases | `/api/*` | .pkpass firmado, web service de Apple (push tokens), clase por programa en Google |

## Migración desde la v1 (el proyecto del café)

Misma cuenta de Vercel, mismo Neon, mismos certificados. Pasos:

1. **Base de datos**: corre `schema.sql` en el SQL Editor de Neon. Crea tablas nuevas
   (usuarios, negocios, programas) y las tablas `pases`/`apple_registros`/`eventos`
   tienen columnas distintas a las de v1. Si tus datos actuales son solo pruebas,
   lo limpio es borrar las tablas viejas antes:
   ```sql
   DROP TABLE IF EXISTS apple_registros, eventos, pases, clientes CASCADE;
   ```
   y luego pegar `schema.sql`. (Los pases ya emitidos en pruebas morirán: los
   clientes se registran de nuevo. Para producción real haríamos migración.)
2. **Repo**: reemplaza el contenido de tu repo con esta carpeta (o crea un repo nuevo
   e importa un proyecto nuevo en Vercel, y luego borras el viejo).
3. **Variables en Vercel**: las mismas de antes MENOS `BUSINESS_NAME`, `STAMPS_GOAL`,
   `REWARD_TEXT`, `ADMIN_PIN`, `GOOGLE_CLASS_SUFFIX` (ahora viven en la base de datos,
   por negocio/programa) y MÁS estas dos:
   - `SESSION_SECRET` → genera uno: `openssl rand -hex 32`
   - `ROOT_DOMAIN` → tu dominio raíz (ej. `tudominio.com`) si usarás subdominios
4. **Deploy**: push → Vercel detecta Next.js solo.
5. **Tu primer usuario** (dueño): desde tu máquina,
   ```bash
   DATABASE_URL="postgres://...neon..." npm run crear-usuario -- tu@correo.com tuPassword "Tu Nombre"
   ```
6. Entra a `/panel`, crea tu negocio (ej. slug `cafe-irving`), ajusta el diseño, y
   prueba el registro en `/r/cafe-irving`.

## Subdominios wildcard (una sola vez)

1. En Vercel → tu proyecto → Settings → **Domains**: agrega `tudominio.com` y
   `*.tudominio.com`.
2. En tu proveedor de DNS: apunta el dominio según lo que Vercel te indique
   (normalmente `A 76.76.21.21` para la raíz y `CNAME cname.vercel-dns.com` para `*`).
3. Pon `ROOT_DOMAIN=tudominio.com` y `BASE_URL=https://tudominio.com` en las variables.

Desde entonces, **cada negocio nuevo funciona al instante** en
`su-slug.tudominio.com` sin tocar nada: el middleware lee el subdominio y lo mapea
al negocio en la base.

## Decisiones de diseño (para tu yo del futuro)

- **Certificados de plataforma**: un solo Apple Developer ($99/año, el tuyo) y un
  emisor de Google firman los pases de todos los negocios. El pase muestra el nombre
  y branding de cada negocio (`organizationName` / `issuerName`). El certificado de
  Apple expira CADA AÑO: renuévalo y actualiza las 2 variables o todos los pases
  nuevos fallarán en silencio.
- **Google**: una clase (`programa_{id}`) por programa, creada/actualizada
  automáticamente al registrar clientes o guardar el diseño. Cuando quieras salir del
  modo demo, pide publicación en la Wallet Console.
- **Imágenes**: el logo/banner se guardan como PNG dataURL en `programas.diseno`
  (el diseñador los convierte y reduce en el navegador). Google exige URLs públicas:
  `/api/img/{programa}/logo` las sirve desde la BD. Si algún día pesan mucho,
  múdalas a Vercel Blob.
- **Auditoría**: todo movimiento queda en `eventos` con `origen` ('qr' = cajero,
  'manual' = panel) y `delta`. Consultas útiles:
  ```sql
  -- actividad de un negocio por día
  SELECT date_trunc('day', e.creado_en) dia, count(*) sellos
  FROM eventos e JOIN pases p ON p.serial = e.serial
  JOIN programas pr ON pr.id = p.programa_id
  WHERE pr.negocio_id = 1 AND e.tipo = 'sello'
  GROUP BY 1 ORDER BY 1 DESC;
  ```
- **PIN por negocio**: el cajero usa el PIN del negocio (tabla `negocios.pin`),
  editable desde el panel/API.

## Pendientes conocidos (v2.1+)

- Programas de **puntos** y **cashback** (la columna `tipo` ya existe).
- Notificaciones push de campaña ("hace 2 semanas que no vienes").
- Estadísticas en el panel (los datos ya están en `eventos`).
- Migración de datos reales v1→v2 si algún día hace falta.
- Cobro a los negocios (Stripe) si lo vuelves SaaS self-service.
