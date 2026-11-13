import { createClient } from "@/lib/supabase/server";
import { canUserReviewProduct } from "./eligibility";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REVIEW_CRITERIA = ["packaging", "description", "delivery"] as const;
type ReviewCriteria = Record<(typeof REVIEW_CRITERIA)[number], number | null>;

function parseCriteria(value: unknown): ReviewCriteria {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    REVIEW_CRITERIA.map((key) => {
      const score = input[key];
      return [
        key,
        typeof score === "number" &&
        Number.isFinite(score) &&
        score >= 1 &&
        score <= 5 &&
        Number.isInteger(score)
          ? score
          : null,
      ];
    })
  ) as ReviewCriteria;
}

type ReviewsDb = {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string
    ) => {
      eq: (
        column2: string,
        value2: string
      ) => {
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }>;
      };
      order: (
        column: string,
        options: { ascending: boolean }
      ) => Promise<{
        data: Record<string, unknown>[] | null;
        error: { message: string } | null;
      }>;
    };
  };
  insert: (values: Record<string, unknown>) => Promise<{
    error: { message: string } | null;
  }>;
};

function maskName(name: string): string {
  if (!name) return "Ẩn danh";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return (
    parts[0] +
    " " +
    parts
      .slice(1)
      .map((p) => "*".repeat(p.length))
      .join(" ")
  );
}

function reviewsDb(supabase: Awaited<ReturnType<typeof createClient>>) {
  return (supabase.from as unknown as (table: string) => ReviewsDb)(
    "product_reviews"
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ reviews: [], average: 0, total: 0 });
    }

    const db = reviewsDb(supabase);

    let { data, error } = await db
      .select(
        "id, rating, title, body, reviewer_name, created_at, images, criteria"
      )
      .eq("product_id", product.id)
      .order("created_at", { ascending: false });

    // Fallback if images column does not exist yet
    if (
      error &&
      (error.message?.includes("images") || error.message?.includes("criteria"))
    ) {
      const fallback = await db
        .select("id, rating, title, body, reviewer_name, created_at, images")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const total = rows.length;
    const average =
      total > 0
        ? Math.round(
            (rows.reduce(
              (s: number, r: Record<string, unknown>) => s + Number(r.rating),
              0
            ) /
              total) *
              10
          ) / 10
        : 0;

    return NextResponse.json({
      reviews: rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        rating: Number(r.rating),
        title: r.title ?? null,
        body: r.body ?? null,
        reviewer_name: maskName((r.reviewer_name as string) ?? ""),
        created_at: r.created_at,
        images: Array.isArray(r.images) ? (r.images as string[]) : [],
        criteria: parseCriteria(r.criteria),
      })),
      average,
      total,
    });
  } catch (err) {
    console.error("[reviews] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (!(await canUserReviewProduct(supabase, user.id, product.id))) {
      return NextResponse.json(
        { error: "Chỉ khách đã nhận sản phẩm mới có thể đánh giá" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      rating: number;
      title?: string;
      body?: string;
      images?: string[];
      criteria?: unknown;
    };

    if (
      typeof body.rating !== "number" ||
      !Number.isFinite(body.rating) ||
      body.rating < 1 ||
      body.rating > 5 ||
      Math.round(body.rating * 2) !== body.rating * 2
    ) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5 in 0.5 increments" },
        { status: 400 }
      );
    }

    const db = reviewsDb(supabase);

    const { data: existing } = await db
      .select("id")
      .eq("product_id", product.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Bạn đã đánh giá sản phẩm này rồi" },
        { status: 409 }
      );
    }

    const reviewerName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      "";

    const insertPayload: Record<string, unknown> = {
      product_id: product.id,
      user_id: user.id,
      rating: body.rating,
      title: body.title ?? null,
      body: body.body ?? null,
      reviewer_name: reviewerName || "Ẩn danh",
      images: Array.isArray(body.images) ? body.images : [],
      criteria: parseCriteria(body.criteria),
    };

    let { error } = await db.insert(insertPayload);

    if (error?.message?.includes("criteria")) {
      const { criteria: _criteria, ...legacyPayload } = insertPayload;
      const legacyInsert = await db.insert(legacyPayload);
      error = legacyInsert.error;
    }

    // Fallback if DB schema has not yet migrated rating to decimal or images column.
    if (
      error &&
      (error.message?.includes("smallint") || error.message?.includes("images"))
    ) {
      const fallbackPayload: Record<string, unknown> = {
        ...insertPayload,
        rating: Math.round(body.rating),
      };
      delete fallbackPayload.images;
      delete fallbackPayload.criteria;
      const res = await db.insert(fallbackPayload);
      error = res.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reviews] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
