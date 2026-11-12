import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Internal bridge for the admin app to purge the web app's Next.js Data
 * Cache / ISR entries. Admin and web are separate Next runtimes sharing one
 * Upstash Redis: admin's Redis sweep clears the REST-level cache, but
 * `revalidateTag()` called from admin only marks admin's own cache entries —
 * the web app's `unstable_cache({ tags: ["products"] })` results and the
 * ISR'd /shop/[slug] pages would stay stale for their full `revalidate`
 * window. Admin POSTs here after product and Home testimonial mutations so
 * both apps purge in lockstep.
 *
 * Auth: `x-internal-secret` must match NOTIFICATION_INTERNAL_SECRET (shared
 * by both apps).
 */
export async function POST(req: Request) {
  const secret = process.env.NOTIFICATION_INTERNAL_SECRET;
  const provided = req.headers.get("x-internal-secret");

  if (!secret || !provided || provided !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const requested = Array.isArray(body.tags) ? body.tags : ["products"];
  // Allowlist — callers may only purge tags this app actually uses.
  const allowed = new Set(["products", "testimonials"]);
  const revalidated: string[] = [];
  for (const tag of requested) {
    if (typeof tag === "string" && allowed.has(tag)) {
      revalidateTag(tag);
      revalidated.push(tag);
    }
  }

  return Response.json({ revalidated });
}
