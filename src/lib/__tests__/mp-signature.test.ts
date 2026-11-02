import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ rawDb: {} }));

describe("firma de los avisos de Mercado Pago", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("acepta la firma correcta y rechaza una inventada", async () => {
    vi.stubEnv("MP_WEBHOOK_SECRET", "secreto");
    const { validWebhookSignature } = await import("@/server/mercadopago");
    const v1 = createHmac("sha256", "secreto").update("id:abc123;request-id:req-1;ts:1700000000;").digest("hex");
    expect(validWebhookSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: "req-1", dataId: "ABC123" })).toBe(true);
    expect(validWebhookSignature({ signature: `ts=1700000000,v1=${"0".repeat(64)}`, requestId: "req-1", dataId: "abc123" })).toBe(false);
    expect(validWebhookSignature({ signature: null, requestId: "req-1", dataId: "abc123" })).toBe(false);
  });
});
