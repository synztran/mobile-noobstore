import { CalendarDays, ExternalLink, Tag } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { buildOg } from "@/lib/og";

export const metadata: Metadata = buildOg({
  title: "Cập nhật thị trường",
  description:
    "Tin tức Group Buy, New Release và Sale từ các hãng bàn phím cơ, switch và phụ kiện được cập nhật liên tục.",
  url: "/vendor-updates",
});

type Vendor = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
};

type Release = {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  source_url: string | null;
  maker_name: string | null;
  thumbnail: string | null;
  vendor: Vendor | null;
  type: string;
  published_at: string | null;
};

async function getReleases(): Promise<Release[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("maker_releases")
    .select("*, vendor:vendors(*)")
    .order("published_at", { ascending: false })
    .limit(50);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
    (row) => ({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      excerpt: (row.excerpt as string | null) ?? null,
      source_url: (row.source_url as string | null) ?? null,
      maker_name: (row.maker_name as string | null) ?? null,
      thumbnail: (row.thumbnail as string | null) ?? null,
      type: (row.type as string) ?? "NEW_RELEASE",
      published_at: (row.published_at as string | null) ?? null,
      vendor: row.vendor
        ? (row.vendor as unknown as Vendor)
        : null,
    })
  );
}

const TYPE_LABELS: Record<string, string> = {
  SALE: "Sale",
  GROUP_BUY: "Group Buy",
  NEW_RELEASE: "New Release",
};

const TYPE_STYLES: Record<string, string> = {
  SALE: "bg-red-100 text-red-700",
  GROUP_BUY: "bg-amber-100 text-amber-700",
  NEW_RELEASE: "bg-blue-100 text-blue-700",
};

function trimContent(html: string, max = 250): string {
  return html.replace(/<[^>]*>/g, "").trim().slice(0, max).trimEnd() + "...";
}

function groupByVendor(releases: Release[]): Map<string, { vendor: Vendor | null; releases: Release[] }> {
  const map = new Map<string, { vendor: Vendor | null; releases: Release[] }>();

  for (const r of releases) {
    const key = r.vendor?.id ?? "__unknown__";
    const existing = map.get(key);
    if (existing) {
      existing.releases.push(r);
    } else {
      map.set(key, {
        vendor: r.vendor,
        releases: [r],
      });
    }
  }

  const sorted = new Map(
    [...map.entries()].sort((a, b) => {
      const nameA = a[1].vendor?.name ?? "";
      const nameB = b[1].vendor?.name ?? "";
      return nameA.localeCompare(nameB);
    })
  );

  return sorted;
}

export default async function VendorUpdatesPage(props: {
  searchParams: Promise<{ type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const activeType = searchParams.type ?? "all";
  const allReleases = await getReleases();

  const filteredReleases =
    activeType === "all"
      ? allReleases
      : allReleases.filter((r) => r.type === activeType);

  const grouped = groupByVendor(filteredReleases);
  const counts: Record<string, number> = { all: allReleases.length };
  for (const r of allReleases) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
  }

  const TABS = [
    { key: "all", label: "Tất cả" },
    { key: "NEW_RELEASE", label: "New Release" },
    { key: "GROUP_BUY", label: "Group Buy" },
    { key: "SALE", label: "Sale" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-28">
      <div className="mb-8 text-center">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          Cập nhật thị trường
        </p>
        <p className="text-2xl font-black tracking-tight text-on-surface">
          Tin tức từ các hãng
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-on-surface-variant">
          Cập nhật những thông tin mới nhất về groupbuy, sản phẩm mới và bản
          cập nhật từ các hãng bàn phím cơ, switch và phụ kiện.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/vendor-updates" : `/vendor-updates?type=${tab.key}`}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeType === tab.key
                ? "bg-primary text-white"
                : "bg-surface-container text-on-surface-variant hover:bg-primary/10"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 opacity-60">({counts[tab.key] ?? 0})</span>
          </Link>
        ))}
      </div>

      {grouped.size === 0 ? (
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 text-center">
          <p className="text-sm font-medium text-on-surface-variant">
            Chưa có tin tức nào. Quay lại sau!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([key, group]) => (
            <section key={key}>
              {/* Vendor header */}
              {group.vendor && (
                <div className="mb-3 flex items-center gap-3">
                  {group.vendor.logo_url && (
                    <img
                      src={group.vendor.logo_url}
                      alt={group.vendor.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <p className="text-sm font-black text-on-surface">
                    {group.vendor.name}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {group.releases.map((release) => (
                  <article
                    key={release.id}
                    className="group rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 transition-all hover:shadow-float"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              TYPE_STYLES[release.type] ?? "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {TYPE_LABELS[release.type] ?? release.type}
                          </span>
                          {release.vendor && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                              {release.vendor.name}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-black leading-snug text-on-surface group-hover:text-primary transition-colors">
                          {release.title}
                        </p>

                        {release.excerpt && (
                          <p className="mt-1.5 text-xs font-medium text-on-surface-variant line-clamp-2">
                            {release.excerpt}
                          </p>
                        )}
                        {!release.excerpt && (
                          <p className="mt-1.5 text-xs font-medium text-on-surface-variant line-clamp-2">
                            {trimContent(release.content)}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-on-surface-variant/70">
                          <div className="flex items-center gap-1">
                            <CalendarDays size={12} />
                            {release.published_at
                              ? new Date(release.published_at).toLocaleDateString(
                                  "vi-VN"
                                )
                              : ""}
                          </div>
                        </div>
                      </div>

                      {release.source_url && (
                        <a
                          href={release.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg bg-surface-container p-2 text-on-surface-variant/50 transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
        >
          &larr; Quay lại trang chủ
        </Link>
      </div>
    </main>
  );
}
