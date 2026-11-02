import "server-only";
import { notFound } from "next/navigation";
import { rawDb } from "@/lib/db";
import { sessionUser } from "@/lib/auth/server";
import { PLAN, accessFor } from "@/lib/billing";
import { industryLabel } from "@/lib/industries";

/** Quién ve el panel: los mails de ADMIN_EMAILS (separados por coma). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "agustinawaigel0@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdmin() {
  const email = (await sessionUser())?.email?.toLowerCase();
  return Boolean(email && adminEmails().includes(email));
}

/** Para las páginas del panel: si no es admin, la página "no existe". */
export async function requireAdmin() {
  if (!(await isAdmin())) notFound();
}

interface AuthUser {
  id: string;
  email: string | null;
  created_at: Date | null;
  email_confirmed_at: Date | null;
  last_sign_in_at: Date | null;
}

const DAY = 86_400_000;
const WEEKS = 8;

/** Números de todas las cuentas, para el panel. */
export async function getAdminStats(now = new Date()) {
  const [users, businesses, supplies, products, quotes, sales] = await Promise.all([
    // Las cuentas viven en Supabase Auth (schema auth): de ahí salen el alta y el último ingreso.
    rawDb.$queryRaw<AuthUser[]>`select id::text, email, created_at, email_confirmed_at, last_sign_in_at from auth.users`,
    rawDb.business.findMany({
      select: { id: true, name: true, industry: true, industryName: true, plan: true, subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true },
    }),
    rawDb.supply.groupBy({ by: ["userId"], _count: true }),
    rawDb.product.groupBy({ by: ["userId"], _count: true }),
    rawDb.quote.groupBy({ by: ["userId"], _count: true }),
    rawDb.sale.groupBy({ by: ["userId"], _count: true }),
  ]);

  const count = (rows: { userId: string; _count: number }[]) => new Map(rows.map((r) => [r.userId, r._count]));
  const bySupply = count(supplies);
  const byProduct = count(products);
  const byQuote = count(quotes);
  const bySale = count(sales);
  const businessById = new Map(businesses.map((b) => [b.id, b]));
  const since = (days: number) => new Date(now.getTime() - days * DAY);

  // Planes
  const plans = { founder: 0, trial: 0, free: 0, paying: 0, cancelling: 0, pending: 0 };
  for (const b of businesses) {
    const a = accessFor(b, now);
    if (a.kind === "founder") plans.founder++;
    else if (a.kind === "trial") plans.trial++;
    else if (a.kind === "free") plans.free++;
    else if (a.ending) plans.cancelling++;
    else plans.paying++;
    if (b.subscriptionStatus === "PENDING" && a.kind !== "active") plans.pending++;
  }

  // Altas por semana (de la más vieja a la más nueva)
  const weekStart = (k: number) => new Date(now.getTime() - (WEEKS - k) * 7 * DAY);
  const weekly = Array.from({ length: WEEKS }, (_, k) => {
    const from = weekStart(k);
    const to = weekStart(k + 1);
    return { from, count: users.filter((u) => u.created_at && u.created_at >= from && u.created_at < to).length };
  });

  // Rubros
  const industries = new Map<string, number>();
  for (const b of businesses) {
    const label = industryLabel(b.industry, b.industryName);
    industries.set(label, (industries.get(label) ?? 0) + 1);
  }

  const withAny = (m: Map<string, number>) => [...m.values()].filter((n) => n > 0).length;
  const recent = [...users]
    .sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0))
    .slice(0, 15)
    .map((u) => {
      const b = businessById.get(u.id);
      return {
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
        confirmed: Boolean(u.email_confirmed_at),
        business: b?.name ?? null,
        industry: b ? industryLabel(b.industry, b.industryName) : null,
        access: b ? accessFor(b, now).kind : null,
        supplies: bySupply.get(u.id) ?? 0,
        products: byProduct.get(u.id) ?? 0,
        quotes: byQuote.get(u.id) ?? 0,
      };
    });

  return {
    accounts: {
      total: users.length,
      confirmed: users.filter((u) => u.email_confirmed_at).length,
      new7: users.filter((u) => u.created_at && u.created_at >= since(7)).length,
      new30: users.filter((u) => u.created_at && u.created_at >= since(30)).length,
      active7: users.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= since(7)).length,
      active30: users.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= since(30)).length,
    },
    plans,
    monthlyRevenue: (plans.paying + plans.cancelling) * PLAN.price,
    activation: {
      businesses: businesses.length,
      withSupplies: withAny(bySupply),
      withProducts: withAny(byProduct),
      withQuotes: withAny(byQuote),
      withSales: withAny(bySale),
    },
    weekly,
    industries: [...industries.entries()].sort((a, b) => b[1] - a[1]),
    recent,
  };
}
