import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAdminClient();

  const { data: blocked, error } = await supabase
    .from("gacha_event_blocked_users")
    .select("*")
    .eq("event_id", Number(id));

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch user details for each blocked user
  const userIds = (blocked ?? []).map((b) => b.user_id);
  let usersMap: Record<
    string,
    { id: string; email: string; full_name: string | null }
  > = {};

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, email, first_name, last_name")
      .in("id", userIds);

    if (users) {
      usersMap = Object.fromEntries(
        users.map((u) => [
          u.id,
          {
            id: u.id,
            email: u.email,
            full_name:
              [u.first_name, u.last_name].filter(Boolean).join(" ") || null,
          },
        ])
      );
    }
  }

  const result = (blocked ?? []).map((b) => ({
    ...b,
    users: usersMap[b.user_id] ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user_id } = await req.json();
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("gacha_event_blocked_users")
    .insert({ event_id: Number(id), user_id })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
