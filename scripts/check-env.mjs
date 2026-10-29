// Antes de publicar: revisa que las variables estén bien cargadas y dice cuál falla y por qué,
// sin mostrar la contraseña. Corre en `npm run build` (también en Vercel).

const problems = [];

function hint(value) {
  // Lo justo para reconocerla: el principio, sin usuario ni contraseña.
  return JSON.stringify(value.replace(/\/\/[^@]*@/, "//***@").slice(0, 40) + (value.length > 40 ? "…" : ""));
}

function checkDbUrl(name, port) {
  const raw = process.env[name];
  if (!raw) return problems.push(`${name} no está cargada.`);
  const v = raw.trim();
  if (v !== raw) problems.push(`${name} tiene espacios o un salto de línea al principio o al final.`);
  if (/^["']|["']$/.test(v)) return problems.push(`${name} está entre comillas: en Vercel se pega sin comillas.`);
  if (/^[A-Z_]+=/.test(v)) return problems.push(`${name} empieza con "${v.split("=")[0]}=": pegá solo el valor, sin el nombre.`);
  if (/^https?:\/\//.test(v)) {
    return problems.push(`${name} es una URL https (${hint(v)}). Esa es la Project URL; acá va la de Connect → ORMs → Prisma, que empieza con postgresql://`);
  }
  if (!/^postgres(ql)?:\/\//.test(v)) return problems.push(`${name} tiene que empezar con postgresql:// (ahora empieza ${hint(v)}).`);
  if (/\[YOUR-PASSWORD\]|\[|\]/.test(v)) return problems.push(`${name} todavía tiene [YOUR-PASSWORD] o corchetes: poné tu contraseña, sin corchetes.`);
  let url;
  try {
    url = new URL(v);
  } catch {
    return problems.push(
      `${name} no se puede leer. Si la contraseña tiene símbolos (@ # / ? % : &), cambiala en Supabase por una de solo letras y números, o codificalos (@ → %40, # → %23, / → %2F).`,
    );
  }
  if (port && url.port && url.port !== port) {
    problems.push(`${name} usa el puerto ${url.port}; tiene que ser ${port}${port === "6543" ? " (el del pooler, con ?pgbouncer=true)" : " (conexión directa / session)"}.`);
  }
}

checkDbUrl("DATABASE_URL", "6543");
checkDbUrl("DIRECT_URL", "5432");
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
if (!supabaseUrl) {
  problems.push("NEXT_PUBLIC_SUPABASE_URL no está cargada.");
} else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  // La app la corrige sola, pero conviene dejarla bien.
  console.warn(
    `⚠ NEXT_PUBLIC_SUPABASE_URL debería ser solo https://xxxx.supabase.co (Project Settings → Data API), sin nada después. Ahora es ${JSON.stringify(supabaseUrl.slice(0, 60))}.`,
  );
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY no está cargada.");

if (problems.length) {
  console.error("\n✖ Variables de entorno con problemas:\n");
  for (const p of problems) console.error(`  • ${p}`);
  console.error("\nCorregilas en Vercel → Settings → Environment Variables y volvé a publicar (Redeploy).\n");
  process.exit(1);
}
console.log("✔ Variables de entorno OK");
