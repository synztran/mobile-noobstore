import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "./route";

const SECRET = "test-webhook-secret";
const URL = "https://noobstore.xyz/api/webhooks/vercel";

function post(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (signature) headers["x-vercel-signature"] = signature;
  return new NextRequest(URL, { method: "POST", headers, body });
}

function sign(body: string, algorithm: "sha1" | "sha256", secret = SECRET) {
  return createHmac(algorithm, secret).update(body).digest("hex");
}

const originalSecret = process.env.VERCEL_WEBHOOK_SECRET;

beforeEach(() => {
  process.env.VERCEL_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.VERCEL_WEBHOOK_SECRET;
  } else {
    process.env.VERCEL_WEBHOOK_SECRET = originalSecret;
  }
});

describe("POST /api/webhooks/vercel", () => {
  it("fails CLOSED (503) when the secret is not configured", async () => {
    delete process.env.VERCEL_WEBHOOK_SECRET;

    // Previously this path skipped verification entirely and processed the
    // body, so an unconfigured deploy let anyone drive the incident API.
    const res = await POST(post(JSON.stringify({ type: "deployment.error" })));
    expect(res.status).toBe(503);
  });

  it("rejects a request with no signature (401)", async () => {
    const res = await POST(post(JSON.stringify({ type: "deployment.error" })));
    expect(res.status).toBe(401);
  });

  it("rejects a forged signature (401)", async () => {
    const body = JSON.stringify({ type: "deployment.error" });
    const res = await POST(post(body, sign(body, "sha1", "wrong-secret")));
    expect(res.status).toBe(401);
  });

  it("rejects a signature that is a different algorithm of the right secret", async () => {
    const body = JSON.stringify({ type: "deployment.error" });
    const otherAlg = createHmac("sha512", SECRET).update(body).digest("hex");
    const res = await POST(post(body, otherAlg));
    expect(res.status).toBe(401);
  });

  it("accepts a valid HMAC-SHA1 signature (Vercel's documented scheme)", async () => {
    // A valid signature over a non-JSON body reaches the JSON parse and fails
    // there with 400 — which proves the signature passed, without needing to
    // mock the Better Stack client that the happy path calls into.
    const body = "not-json";
    const res = await POST(post(body, sign(body, "sha1")));
    expect(res.status).toBe(400);
  });

  it("accepts a valid HMAC-SHA256 signature", async () => {
    const body = "not-json";
    const res = await POST(post(body, sign(body, "sha256")));
    expect(res.status).toBe(400);
  });
});
