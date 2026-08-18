import type { ProfileAddressInput } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROFILE_SELECT =
  "id, email, first_name, last_name, phone_number, points_balance, role, created_at, addresses:user_addresses(id, user_id, full_name, address, phone_number, city, city_code, district, ward, district_code, ward_code, is_default)";

async function getProfileWithAddresses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile, error } = await supabase
    .from("users")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  return { profile, error };
}

function withAddressesArray<T extends Record<string, unknown>>(profile: T) {
  return {
    ...profile,
    addresses: Array.isArray(profile.addresses) ? profile.addresses : [],
  };
}

function splitFullName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { first_name: null, last_name: null };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: null };
  }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

async function ensureSyncedUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authUser: User
) {
  const metadata = authUser.user_metadata ?? {};
  const fullName = String(metadata.full_name ?? "");
  const names = splitFullName(fullName);

  const { data: byId, error: byIdError } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (byIdError) {
    return { appUserId: null as string | null, error: byIdError };
  }

  if (byId?.id) {
    return { appUserId: String(byId.id), error: null };
  }

  const { data: byEmail, error: byEmailError } = await supabase
    .from("users")
    .select("id")
    .eq("email", authUser.email ?? "")
    .maybeSingle();

  if (byEmailError) {
    return { appUserId: null as string | null, error: byEmailError };
  }

  if (byEmail?.id) {
    return { appUserId: String(byEmail.id), error: null };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      id: authUser.id,
      email: authUser.email ?? "",
      first_name: names.first_name,
      last_name: names.last_name,
      phone_number: authUser.phone ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    return { appUserId: null as string | null, error: insertError };
  }

  return { appUserId: String(inserted.id), error: null };
}

// ─── GET /api/user/profile ────────────────────────────────────────────────────
// Returns the authenticated user's record from the users table.

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appUserId, error: syncError } = await ensureSyncedUser(
      supabase,
      user
    );

    if (syncError || !appUserId) {
      return NextResponse.json(
        { error: syncError?.message ?? "Failed to sync user" },
        { status: 500 }
      );
    }

    const { profile, error } = await getProfileWithAddresses(
      supabase,
      appUserId
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Append token balances for all active events this user is part of
    const { data: eventTokens } = await supabase
      .from("user_event_tokens")
      .select("event_id, token_count, last_free_token_at")
      .eq("user_id", user.id);

    return NextResponse.json({
      ...withAddressesArray(profile),
      event_tokens: eventTokens ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/user/profile ───────────────────────────────────────────────────
// Replaces the authenticated user's addresses.
// Accepted body fields: addresses[] or address[]

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appUserId, error: syncError } = await ensureSyncedUser(
      supabase,
      user
    );

    if (syncError || !appUserId) {
      return NextResponse.json(
        { error: syncError?.message ?? "Failed to sync user" },
        { status: 500 }
      );
    }

    const body = await req.json();

    type AddressPayload = ProfileAddressInput & {
      full_name?: string;
      fullName?: string;
      city_code?: string;
      cityCode?: string;
      phone_number?: string;
      phoneNumber?: string;
      district?: string;
      ward?: string;
      district_code?: string;
      ward_code?: string;
      is_default?: boolean;
      isDefault?: boolean;
    };

    const rawAddresses = Array.isArray(body.addresses)
      ? (body.addresses as AddressPayload[])
      : Array.isArray(body.address)
        ? (body.address as AddressPayload[])
        : null;

    if (!rawAddresses) {
      return NextResponse.json(
        {
          error: "Body must include address[] or addresses[]",
        },
        { status: 400 }
      );
    }

    type NormalizedAddress = {
      full_name: string;
      address: string;
      phone_number: string;
      city: string;
      city_code: string;
      district: string;
      ward: string;
      district_code: string;
      ward_code: string;
      is_default: boolean;
    };

    const normalized: NormalizedAddress[] = rawAddresses.map(
      (item: AddressPayload) => {
        const rawWardDistrict = String(item.district ?? "").trim();
        const [firstPart, secondPart] = rawWardDistrict
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        const explicitWard = String(item.ward ?? "").trim();
        const explicitDistrict = String(item.district ?? "").trim();

        return {
          full_name: String(item.full_name ?? item.fullName ?? "").trim(),
          address: String(item.address ?? "").trim(),
          phone_number: String(
            item.phone_number ?? item.phoneNumber ?? ""
          ).trim(),
          city: String(item.city ?? "").trim(),
          city_code: String(item.city_code ?? item.cityCode ?? "").trim(),
          district: explicitDistrict || secondPart || firstPart || "",
          ward:
            explicitWard || (secondPart ? firstPart : rawWardDistrict) || "",
          district_code: String(
            item.district_code ?? item.districtCode ?? ""
          ).trim(),
          ward_code: String(item.ward_code ?? item.wardCode ?? "").trim(),
          is_default: Boolean(item.is_default ?? item.isDefault ?? false),
        };
      }
    );

    const hasInvalid = normalized.some(
      (a) =>
        !a.full_name ||
        !a.address ||
        !a.phone_number ||
        !a.city ||
        !a.city_code ||
        !a.district ||
        !a.ward ||
        !a.district_code
    );

    if (hasInvalid) {
      return NextResponse.json(
        {
          error:
            "Each address must include full_name, address, phone_number, city, city_code, district, ward, district_code",
        },
        { status: 400 }
      );
    }

    const defaultIndex = normalized.findIndex((a) => a.is_default);
    const addressesToInsert = normalized.map((a, index) => ({
      user_id: appUserId,
      full_name: a.full_name,
      address: a.address,
      // Legacy columns kept for compatibility on older schemas
      address_line: a.address,
      phone_number: a.phone_number,
      city: a.city,
      city_code: a.city_code,
      district: a.district,
      ward: a.ward,
      district_code: a.district_code,
      ward_code: a.ward_code,
      country: a.district,
      is_default: defaultIndex >= 0 ? defaultIndex === index : index === 0,
    }));

    const { error: deleteError } = await supabase
      .from("user_addresses")
      .delete()
      .eq("user_id", appUserId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (addressesToInsert.length > 0) {
      const userAddressesQuery = supabase.from("user_addresses") as any;
      const { error: insertError } =
        await userAddressesQuery.insert(addressesToInsert);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    const { profile, error } = await getProfileWithAddresses(
      supabase,
      appUserId
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(withAddressesArray(profile));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/user/profile ──────────────────────────────────────────────────
// Updates the authenticated user's profile.
// Accepted body fields: first_name, last_name, phone_number

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appUserId, error: syncError } = await ensureSyncedUser(
      supabase,
      user
    );

    if (syncError || !appUserId) {
      return NextResponse.json(
        { error: syncError?.message ?? "Failed to sync user" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const allowedFields = ["first_name", "last_name", "phone_number"] as const;
    type UserUpdate = {
      first_name?: string | null;
      last_name?: string | null;
      phone_number?: string | null;
    };
    const updates: UserUpdate = {};
    for (const field of allowedFields) {
      if (field in body) {
        (updates as Record<string, unknown>)[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", appUserId)
      .select(PROFILE_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
