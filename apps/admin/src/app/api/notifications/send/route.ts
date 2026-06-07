import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface SendBody {
  title: string;
  body: string;
  deepLink?: string;
  /** target: 'all' | 'single' | 'users' */
  target?: string;
  userId?: string;
  userIds?: string[];
  type?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SendBody>;

    if (!body.title || !body.body) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // verify caller is admin
    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = getAdminClient();

    // resolve target user ids
    let targetUserIds: string[] = [];
    if (!body.target || body.target === "all") {
      // send only to users who have active subscriptions
      const { data: rows } = await admin
        .from("push_subscriptions")
        .select("user_id")
        .eq("is_active", true);

      targetUserIds = Array.from(
        new Set((rows ?? []).map((r: any) => r.user_id))
      );
    } else if (body.target === "single") {
      if (body.userId) targetUserIds = [body.userId];
    } else if (body.target === "users") {
      targetUserIds = body.userIds ?? [];
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: "No target users found" },
        { status: 400 }
      );
    }

    // fetch subscriptions for target users
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", targetUserIds)
      .eq("is_active", true);

    const subsByUser = new Map<
      string,
      Array<{ endpoint: string; p256dh: string; auth: string }>
    >();
    for (const s of subs ?? []) {
      if (!s.user_id) continue;
      const arr = subsByUser.get(s.user_id) ?? [];
      arr.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
      subsByUser.set(s.user_id, arr);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.NOTIFICATION_INTERNAL_SECRET;

    let sent = 0;
    let failed = 0;

    for (const userId of targetUserIds) {
      const userSubs = subsByUser.get(userId) ?? [];
      // create notification row for the user
      const { data: inserted, error: insErr } = await admin
        .from("user_notifications")
        .insert({
          user_id: userId,
          title: body.title,
          body: body.body,
          type: body.type ?? "admin",
          deep_link: body.deepLink ?? "/profile/notifications",
        })
        .select("id")
        .single();

      if (insErr || !inserted) {
        console.error("[admin/notifications/send] insert error:", insErr);
        // count these subscriptions as failed
        failed += userSubs.length;
        continue;
      }

      if (userSubs.length === 0) continue;

      if (!supabaseUrl || !secret) {
        console.warn(
          "[admin/notifications/send] missing SUPABASE url or internal secret, created notifications but did not send pushes"
        );
        continue;
      }

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-notification-secret": secret,
          },
          body: JSON.stringify({
            subscriptions: userSubs,
            payload: {
              title: body.title,
              body: body.body,
              deepLink: body.deepLink ?? "/profile/notifications",
              notificationId: inserted.id,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
            },
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error(
            "[admin/notifications/send] send-web-push failed:",
            txt
          );
          failed += userSubs.length;
          continue;
        }

        const json = await res.json();
        sent += json.sent ?? 0;
        failed += json.failed ?? 0;
      } catch (err) {
        console.error("[admin/notifications/send] unexpected send error:", err);
        failed += userSubs.length;
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (err) {
    console.error("[admin/notifications/send] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
