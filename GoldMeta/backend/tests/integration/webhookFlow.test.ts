import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import strongBuyFixture from "../fixtures/strongBuy.json";
import { freshPayload } from "../helpers";
import { createApp } from "../../src";
import { AiExplainer } from "../../src/services/ai/explainer";
import { InMemoryStore } from "../../src/services/storage/inMemoryStore";
import { DedupeStore } from "../../src/services/webhook/dedupe";
import { resetRateLimits } from "../../src/middleware/rateLimit";

describe("webhook flow", () => {
  let store: InMemoryStore;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    resetRateLimits();
    store = new InMemoryStore();
    app = createApp({
      store,
      dedupe: new DedupeStore(60_000),
      aiExplainer: new AiExplainer()
    });
  });

  it("accepts a TradingView alert, stores a BUY decision, and dedupes replay", async () => {
    const payload = freshPayload(strongBuyFixture);

    const first = await request(app)
      .post("/webhooks/tradingview/test-webhook-id")
      .send(payload)
      .expect(202);
    expect(first.body).toMatchObject({
      accepted: true,
      duplicate: false,
      decision: "BUY"
    });

    const duplicate = await request(app)
      .post("/webhooks/tradingview/test-webhook-id")
      .send(payload)
      .expect(202);
    expect(duplicate.body).toMatchObject({
      accepted: true,
      duplicate: true
    });

    const latest = await request(app)
      .get("/v1/decisions/latest")
      .set("x-test-user-id", "default-user")
      .expect(200);
    expect(latest.body.decision.decision).toBe("BUY");
    expect(store.listDecisions()).toHaveLength(1);
  });
});
