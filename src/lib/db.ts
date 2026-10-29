import "server-only";
import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { requireUserId } from "@/lib/auth/server";

// Un solo cliente en desarrollo (Next recarga módulos en caliente).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Cliente sin filtro de dueño. Solo para lo que no es de una cuenta (o que ya trae el userId
 * resuelto, como restaurar un backup). Para todo lo demás: `userDb()`.
 */
export const rawDb = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = rawDb;

type Delegate = "supply" | "laborProfile" | "machine" | "product" | "quote" | "sale" | "salesChannel";

/** Tablas con columna `userId`. */
const OWNED = new Set([
  "Supply",
  "LaborProfile",
  "MarketRate",
  "FixedCost",
  "Machine",
  "Product",
  "SalesChannel",
  "VolumeTier",
  "Quote",
  "PrintInk",
  "InvestmentMovement",
  "Sale",
]);

/** Columnas de tablas con dueño que apuntan a otra fila con dueño (la venta → su canal y su presupuesto). */
const OWNED_REFS: Record<string, Record<string, Delegate>> = {
  Sale: { channelId: "salesChannel", quoteId: "quote" },
};

/**
 * Tablas hijas: el dueño es el de la fila padre (`parent`). `refs` son las columnas que apuntan a
 * filas con dueño: al escribir se revisa que todas sean de la misma cuenta.
 */
const CHILDREN: Record<string, { parent: Delegate; refs: Record<string, Delegate> }> = {
  SupplyPriceHistory: { parent: "supply", refs: { supplyId: "supply" } },
  ProductSupply: { parent: "product", refs: { productId: "product", supplyId: "supply" } },
  ProductLabor: { parent: "product", refs: { productId: "product", profileId: "laborProfile" } },
  ProductMachine: { parent: "product", refs: { productId: "product", machineId: "machine" } },
  QuoteItem: { parent: "quote", refs: { quoteId: "quote", productId: "product" } },
  SaleItem: { parent: "sale", refs: { saleId: "sale", productId: "product" } },
};

/** Relaciones que se escriben anidadas desde el padre (ej: la receta al guardar un producto). */
const NESTED: Record<string, Record<string, string>> = {
  Supply: { priceHistory: "SupplyPriceHistory" },
  Product: { supplies: "ProductSupply", labor: "ProductLabor", machines: "ProductMachine" },
  Quote: { items: "QuoteItem" },
  Sale: { items: "SaleItem" },
};

const WHERE_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);

type Row = Record<string, unknown>;
const list = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

export class ForbiddenRefError extends Error {
  constructor() {
    super("Hay datos que no son de tu cuenta.");
  }
}

/** Revisa que cada id referenciado exista y sea de la cuenta. */
async function checkRefs(userId: string, rows: Row[], refs: Record<string, Delegate>) {
  for (const [field, model] of Object.entries(refs)) {
    const ids = [...new Set(rows.map((r) => r[field]).filter((v): v is string => typeof v === "string"))];
    if (ids.length === 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = rawDb[model] as any;
    const found: number = await delegate.count({ where: { id: { in: ids }, userId } });
    if (found !== ids.length) throw new ForbiddenRefError();
  }
}

/** Filas creadas anidadas dentro del `data` de un padre (solo create / createMany). */
async function checkNested(userId: string, model: string, data: Row | undefined) {
  const relations = NESTED[model];
  if (!relations || !data) return;
  for (const [relation, child] of Object.entries(relations)) {
    const write = data[relation] as Row | undefined;
    if (!write) continue;
    for (const op of Object.keys(write)) {
      if (op !== "create" && op !== "createMany" && op !== "deleteMany") {
        throw new Error(`Escritura anidada no soportada en ${model}.${relation}: ${op}`);
      }
    }
    const rows = [...list(write.create as Row | Row[]), ...list((write.createMany as Row | undefined)?.data as Row[])];
    const { parent, refs } = CHILDREN[child];
    // La columna del padre la completa Prisma con la fila que se está escribiendo.
    const others = Object.fromEntries(Object.entries(refs).filter(([, m]) => m !== parent));
    await checkRefs(userId, rows, others);
  }
}

function scopeFor(model: string, userId: string): Row | null {
  if (model === "Business") return { id: userId };
  if (OWNED.has(model)) return { userId };
  const child = CHILDREN[model];
  if (child) return { [child.parent]: { userId } };
  return null;
}

/** Saca el dueño de lo que manda el código: nunca se puede cambiar ni elegir. */
function withoutOwner(model: string, data: Row): Row {
  const { userId: _u, ...rest } = data;
  void _u;
  if (model !== "Business") return rest;
  const { id: _id, ...noId } = rest;
  void _id;
  return noId;
}

function withOwner(model: string, data: Row, userId: string): Row {
  const clean = withoutOwner(model, data);
  if (model === "Business") return { ...clean, id: userId };
  if (OWNED.has(model)) return { ...clean, userId };
  return clean;
}

/**
 * Cliente de Prisma que solo ve y escribe filas de una cuenta. Agrega el filtro por `userId`
 * a toda lectura, actualización y borrado; completa el `userId` al crear; y revisa que las
 * referencias (insumo de una receta, producto de un presupuesto…) sean de la misma cuenta.
 */
export function scopedDb(userId: string) {
  return rawDb.$extends({
    name: "cuenta",
    // Para completar `userId` al crear (TypeScript lo pide; igual se pisa abajo) y el id del emprendimiento.
    client: { $userId: userId },
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const scope = scopeFor(model, userId);
          if (!scope) return query(args);
          const a = { ...(args as Row) };

          if (WHERE_OPS.has(operation)) {
            const where = (a.where ?? {}) as Row;
            a.where =
              model === "Business"
                ? { ...where, ...scope }
                : { ...where, AND: [...list(where.AND as Row | Row[]), scope] };
          }

          const child = CHILDREN[model];
          const refs = child?.refs ?? OWNED_REFS[model];
          switch (operation) {
            case "create":
              a.data = withOwner(model, a.data as Row, userId);
              if (refs) await checkRefs(userId, [a.data as Row], refs);
              await checkNested(userId, model, a.data as Row);
              break;
            case "createMany":
            case "createManyAndReturn": {
              const rows = list(a.data as Row | Row[]).map((r) => withOwner(model, r, userId));
              if (refs) await checkRefs(userId, rows, refs);
              for (const r of rows) await checkNested(userId, model, r);
              a.data = rows;
              break;
            }
            case "update":
            case "updateMany":
            case "updateManyAndReturn":
              a.data = withoutOwner(model, a.data as Row);
              if (refs) await checkRefs(userId, [a.data as Row], refs);
              await checkNested(userId, model, a.data as Row);
              break;
            case "upsert":
              a.create = withOwner(model, a.create as Row, userId);
              a.update = withoutOwner(model, a.update as Row);
              if (refs) await checkRefs(userId, [a.create as Row, a.update as Row], refs);
              await checkNested(userId, model, a.create as Row);
              await checkNested(userId, model, a.update as Row);
              break;
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type UserDb = ReturnType<typeof scopedDb>;

/** El cliente de la cuenta que inició sesión (si no hay sesión, manda a ingresar). */
export const userDb = cache(async (): Promise<UserDb> => scopedDb(await requireUserId()));
