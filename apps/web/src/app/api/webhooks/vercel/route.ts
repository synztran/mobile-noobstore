import { createHash, createHmac, timingSafeEqual } from "crypto";
import {
  bsTrigger,
  bsResolve,
  bsFindBySource,
} from "@/lib/betterstack";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEPLOY_SOURCE = "noobstore-vercel-deploy";

/**
 * Constant-time string comparison. Both operands are hashed first so the
 * comparison is length-independent — `timingSafeEqual` throws on buffers of
 * different lengths, which would otherwise leak the expected length.
 */
function safeEqual(a: string, b: string): boolean {
  const hashedA = createHash("sha256").update(a).digest();
  const hashedB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashedA, hashedB);
}

/**
 * Receives Vercel Outgoing Webhooks and creates a Better Stack incident on
 * deploy failure. Resolves on successful production deploys.
 *
 * Setup: Vercel Dashboard → Project Settings → Outgoing Webhooks
 *   → Add webhook → URL: https://<your-domain>/api/webhooks/vercel
 *   → copy the signing secret into VERCEL_WEBHOOK_SECRET.
 *
 * Auth is fail-closed, mirroring lib/auth/requireCronSecret: this endpoint can
 * open AND resolve incidents, so an unauthenticated caller could either spam
 * the on-call channel or, worse, silently resolve a real deploy-failure
 * incident. Without the secret configured we refuse every request rather than
 * accept them all.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;

  if (!secret) {
    console.error(
      "[vercel webhook] VERCEL_WEBHOOK_SECRET is not configured — failing closed.",
    );
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("x-vercel-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await req.text();

  // Vercel documents x-vercel-signature as an HMAC-SHA1 of the raw body
  // (https://vercel.com/docs/headers/request-headers). SHA-256 is accepted as
  // well so a hand-rolled webhook configured with the stronger digest still
  // verifies. Both are keyed HMACs over the same secret, so accepting either
  // does not weaken the check — a caller still has to know the secret.
  const candidates = ["sha1", "sha256"].map((algorithm) =>
    createHmac(algorithm, secret).update(rawBody).digest("hex"),
  );

  if (!candidates.some((expected) => safeEqual(signature, expected))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: VercelWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as VercelWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  return handleWebhook(payload);
}

interface VercelWebhookPayload {
  type: string;
  payload: {
    target?: string;
    errorMessage?: string;
    deployment?: {
      url?: string;
      name?: string;
      id?: string;
    };
  };
}

async function handleWebhook(payload: VercelWebhookPayload) {
  const { type, payload: data } = payload;

  if (data.target !== "production") {
    return NextResponse.json({ ignored: true, reason: "non-production" });
  }

  switch (type) {
    case "deployment.error": {
      const existing = await bsFindBySource(DEPLOY_SOURCE);
      const result = existing
        ? { data: { id: existing } }
        : await bsTrigger({
            summary: `Vercel deploy failed: ${data.errorMessage ?? "Unknown error"}`,
            cause: `Production deployment failed on Vercel.`,
            metadata: {
              Source: { value: DEPLOY_SOURCE },
              DeploymentUrl: { value: data.deployment?.url ?? "" },
              DeploymentName: { value: data.deployment?.name ?? "" },
            },
          });
      return NextResponse.json({ alert: "triggered", incident: result });
    }

    case "deployment.succeeded": {
      const id = await bsFindBySource(DEPLOY_SOURCE);
      const result = id ? await bsResolve(id) : { data: { id: undefined } };
      return NextResponse.json({ alert: "resolved", incident: result });
    }

    default:
      return NextResponse.json({ ignored: true, reason: `unhandled type: ${type}` });
  }
}
