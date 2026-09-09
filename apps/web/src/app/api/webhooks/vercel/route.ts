import { createHmac } from "crypto";
import {
  bsTrigger,
  bsResolve,
  bsFindBySource,
} from "@/lib/betterstack";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEPLOY_SOURCE = "noobstore-vercel-deploy";

/**
 * Receives Vercel Outgoing Webhooks and creates a Better Stack incident on
 * deploy failure. Resolves on successful production deploys.
 *
 * Setup: Vercel Dashboard → Project Settings → Outgoing Webhooks
 *   → Add webhook → URL: https://<your-domain>/api/webhooks/vercel
 */
export async function POST(req: NextRequest) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers.get("x-vercel-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const rawBody = await req.text();
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    return handleWebhook(JSON.parse(rawBody) as VercelWebhookPayload);
  }

  return handleWebhook((await req.json()) as VercelWebhookPayload);
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
