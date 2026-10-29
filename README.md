# Calculadora de Insumos · Alas de Ángel

Una herramienta de [Alas de Ángel](https://alasdeangel.com.ar) · WhatsApp 343 404-2410 · Instagram [@alasdeangel.papeleria](https://instagram.com/alasdeangel.papeleria)

Desarrollado por Agustina Waigel.

App web para emprendedores argentinos (imprenta, sublimación, laminado, manualidades…) que calcula **costos de producción** y **precios de venta** por canal, y arma **presupuestos**. Cada persona crea su cuenta y ve solo sus datos.

- Insumos con costo por unidad, historial de precios y gráfico de evolución (ARS y USD).
- Mano de obra con perfiles, calculadora de valor hora y comparación con valores de referencia.
- Costos fijos prorrateados por unidad y amortización de máquinas por uso.
- Productos con receta (BOM): fracciones, rinde por lote, merma y gráfico de torta del costo.
- Cuentas propias: registro con mail y contraseña, confirmación por mail y recuperación de contraseña.
- Precio sugerido por canal (directa, tienda online, mayorista…) manteniendo la ganancia neta, con IVA, comisiones, pasarela, cuotas y envío.
- Descuentos por volumen, punto de equilibrio y simulador "¿cuánto me queda si vendo a $X?".
- Presupuestos con PDF y envío por WhatsApp.
- Calculadora de impresión: costo de tinta por hoja según el precio de tus botes, su rendimiento y cuánta tinta lleva la hoja.
- Dashboard, calculadora rápida, alertas de precios desactualizados (+30 días), backup JSON/CSV, modo oscuro y PWA instalable.

## Stack

Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS 4 + shadcn/ui · React Hook Form + Zod · Prisma + Postgres (Supabase) · Recharts · @react-pdf/renderer · decimal.js · Vitest.

## Publicar en Vercel (todo desde la web)

1. En [vercel.com](https://vercel.com) → **Add New → Project** → importá este repositorio de GitHub.
2. Antes de **Deploy**, en **Environment Variables** cargá las 5 variables de abajo.
3. **Deploy**. Al construir, `npm run build` crea o actualiza las tablas en Supabase (`prisma migrate deploy`), así que no hace falta correr nada a mano.

## Instalación

Requisitos: Node.js 20 o superior.

```bash
npm install                 # también corre `prisma generate`
cp .env.example .env        # en Windows: copy .env.example .env
npx prisma migrate deploy   # crea las tablas en Supabase
npm run dev                 # http://localhost:3000
```

Después configurá las cuentas (abajo) y entrá a http://localhost:3000/registro.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run typecheck` | Chequeo de tipos |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Nueva migración de Prisma |
| `npm run db:seed` | Carga los datos de ejemplo en una cuenta (`SEED_USER_ID`) |
| `npm run db:reset` | Borra **toda** la base y aplica las migraciones (cuidado: borra todas las cuentas) |
| `npm run db:studio` | Prisma Studio, para ver la base |

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string de Supabase por el pooler (puerto 6543, con `?pgbouncer=true`). Lo usa la app. |
| `DIRECT_URL` | Connection string directo (puerto 5432). Lo usan las migraciones de Prisma. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase (el mismo de la base). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave publicable (anon) del proyecto. No es secreta. |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app. Se usa en los links de los mails. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Opcional. Site Key de Cloudflare Turnstile para el captcha. |

Al construir, `scripts/check-env.mjs` revisa las variables y dice cuál está mal (sin mostrar la contraseña).

## Cuentas (Supabase Auth)

1. En Supabase: **Authentication → Sign In / Providers → Email**: dejá activado *Enable email provider* y *Confirm email*.
2. **Authentication → URL Configuration**: en *Site URL* poné la URL de la app (ej: `https://tu-dominio.com`) y en *Redirect URLs* agregá `https://tu-dominio.com/auth/confirmar` (y `http://localhost:3000/auth/confirmar` para desarrollo).
3. Listo: cualquiera puede crear su cuenta en `/registro`. Al confirmar el mail entra directo; la primera vez se le arma su emprendimiento con canales de venta y descuentos por cantidad por defecto.
4. Los mails de Supabase de prueba tienen un límite bajo por hora. Para producción conviene configurar un SMTP propio (**Authentication → Emails → SMTP Settings**).

### Seguridad

- **Captcha** en ingresar, registrarse y recuperar la contraseña (Cloudflare Turnstile, gratis). Para activarlo: creá un widget en Cloudflare → Turnstile con tu dominio, poné la *Site Key* en `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y la *Secret Key* en Supabase → **Authentication → Attack Protection → Enable Captcha protection** (proveedor Turnstile). Activá los dos juntos: si Supabase lo pide y la app no lo muestra, nadie puede entrar.
- **Límites de intentos**: los pone Supabase (Authentication → Rate Limits).
- **Encabezados de seguridad** en todas las páginas: CSP, no se puede meter en un iframe, HSTS, nosniff.
- **Logo**: solo se acepta una imagen embebida (PNG/JPG/WebP); nunca una dirección, porque el PDF la cargaría desde el servidor.
- Contraseñas de al menos 8 caracteres; el mensaje de "recuperar" no revela si el mail tiene cuenta.

### Cómo se separan los datos

- Cada tabla con dueño tiene `userId` (el id de `auth.users`); el emprendimiento (`Business`) usa ese id como clave. Las tablas hijas (recetas, ítems de presupuesto, historial de precios) cuelgan de una fila con dueño.
- Todo el acceso a la base pasa por `userDb()` ([`src/lib/db.ts`](src/lib/db.ts)): una extensión de Prisma que agrega el filtro por cuenta a cada lectura, actualización y borrado, completa el `userId` al crear y revisa que las referencias (el insumo de una receta, el producto de un presupuesto) sean de la misma cuenta.
- La migración activa RLS en todas las tablas sin políticas: la API pública de Supabase (con la clave anon) no puede leer ni escribir nada. La app entra con Prisma, como dueña de las tablas.
- El middleware deja pasar sin sesión solo a `/ingresar`, `/registro`, `/recuperar` y los links de los mails (`/auth/*`).
- Hay un test que lo prueba contra una base real: `TEST_DATABASE_URL=postgresql://… npm test` (sin esa variable se saltea).

## Tests

```bash
npm test
```

La lógica de cálculo vive en funciones puras en [`src/lib/calc`](src/lib/calc), con tests en `src/lib/calc/__tests__`. Incluye el caso del seed:

> **Foto plastificada A4** = 1 pouch ($28.949 / 100 = $289,49) + 1 hoja fotográfica ($300) + 1 impresión ($600) → **$1.189,49**

También hay tests de formato de moneda es-AR, parseo de montos tipeados ("28.949", "0,25"), CSV, presupuestos y el mensaje de WhatsApp.

## Decisiones de diseño

- **Plata sin floats.** Montos y cantidades se guardan como `Decimal` de Prisma (funciona igual en SQLite y Postgres) y se calculan con `decimal.js`. Se redondea a centavos solo al mostrar o al congelar un precio en un presupuesto. Los Decimal se pasan como `string` de Server a Client Components.
- **Validación compartida.** Los mismos schemas Zod (`src/lib/schemas`) validan el formulario en el navegador y la Server Action en el servidor.
- **Fórmula por canal.** `precio = (costo + ganancia + cargo fijo + envío) ÷ (1/(1+IVA) − comisiones%)`. Las comisiones se cobran sobre el precio final, así la ganancia neta queda igual en todos los canales. El IVA solo aplica si sos Responsable Inscripto.
- **Margen vs. markup.** Margen = ganancia ÷ precio. Markup = ganancia ÷ costo. Se elige en Ajustes y se puede pisar por producto.
- **Merma.** Se aplica sobre los materiales.
- **Costos fijos.** Se prorratean entre la producción mensual estimada. Las máquinas se amortizan por uso (precio ÷ vida útil).
- **Presupuestos.** Guardan una copia de la descripción y el precio: si después sube un insumo, el presupuesto enviado no cambia.
- **Dólar.** Viene de [dolarapi.com](https://dolarapi.com), cacheado 15 minutos. Cada cambio de precio guarda la cotización MEP del día, para comparar la evolución en USD y detectar insumos que subieron más que el dólar.
- **Multiusuario.** Cada cuenta tiene su emprendimiento, insumos, productos y presupuestos (numeración propia).

## Calculadora de impresión

En **Impresión** cargás cada tinta con el precio del bote o cartucho y su **rendimiento en páginas**. Es el dato del fabricante, que siempre se mide en hojas A4 al 5% de cobertura (norma ISO/IEC 24711).

Después elegís qué vas a imprimir: cantidad de hojas, **blanco y negro o color**, la **ocupación de tinta** (10%, 25%, 50%, 75% o 100% de la hoja), tamaño, doble cara, merma por limpiezas de cabezal y papel. La ocupación se reparte en partes iguales entre las tintas que se usan (en blanco y negro, solo las negras), que es lo mismo que costear con el promedio de las tintas.

```
tinta por hoja = Σ (precio ÷ rendimiento) × (cobertura ÷ 5%) × (área ÷ A4) × caras × (1 + merma)
```

Ejemplo: botes CMYK de $12.000 (negro rinde 7.500 páginas, colores 6.000), hoja A4 a color con 50% de ocupación y 10% de merma → 12,5% por tinta → **$20,90 de tinta por hoja**.

El resultado se guarda como insumo (servicio) para usarlo en las recetas. Si ya existe un insumo con el mismo nombre, se actualiza su precio.

## Base de datos (Supabase)

1. En Supabase: **Connect → ORMs → Prisma** y copiá `DATABASE_URL` y `DIRECT_URL` al `.env` (con tu contraseña, sin corchetes).
2. Corré `npx prisma migrate dev` para crear las tablas.
3. Para pasar datos entre cuentas o bases: exportá el backup JSON desde **Ajustes** y restauralo en la otra. Al restaurar se generan ids nuevos, así que el mismo backup se puede cargar en varias cuentas. También acepta backups de la versión anterior (con Mercado Libre).
4. Datos de ejemplo para probar en tu cuenta: `SEED_USER_ID=<tu id de Authentication → Users> npm run db:seed`.

## Estructura

```
prisma/              schema, migraciones y seed
public/              íconos PWA, service worker, página offline
src/app/             páginas (App Router) y Route Handlers (api/dolar, api/backup, api/presupuestos, auth/confirmar)
src/actions/         Server Actions (mutaciones)
src/components/      ui (shadcn) + componentes por módulo
src/lib/calc/        lógica de cálculo pura + tests
src/lib/auth/        sesión de Supabase Auth
src/lib/schemas/     schemas Zod compartidos
src/server/          consultas y armado de datos del lado del servidor
src/stores/          Zustand (preferencia ARS/USD)
```
