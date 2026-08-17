import { getAdminClient } from "@/lib/supabase/admin";

// ─── Constants ────────────────────────────────────────────────────────────────

export const POST_TYPES = ["knowledge", "drama", "build"] as const;
export type PostType = (typeof POST_TYPES)[number];

export type MediaKind = "image" | "video";
export type PostStatus = "pending" | "published" | "rejected";

export interface CommunityMedia {
  url: string;
  path: string;
  mime: string;
  kind: MediaKind;
  size: number;
}

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export const ALLOWED_FIRMWARE_MIMES = [
  "application/json",
  "application/zip",
  "text/plain",
  "application/octet-stream",
  "application/x-zip-compressed",
  "application/macbinary",
];

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
export const MAX_FIRMWARE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_MEDIA_PER_POST = 6;

export const MEDIA_BUCKET = "community-media";
export const FIRMWARE_BUCKET = "community-firmware";

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.includes(mime.toLowerCase());
}

export function isAllowedVideoMime(mime: string): boolean {
  return ALLOWED_VIDEO_MIMES.includes(mime.toLowerCase());
}

export function isAllowedFirmwareMime(mime: string): boolean {
  return ALLOWED_FIRMWARE_MIMES.includes(mime.toLowerCase());
}

export function isImageFileSize(size: number): boolean {
  return size <= MAX_IMAGE_SIZE;
}

export function isVideoFileSize(size: number): boolean {
  return size <= MAX_VIDEO_SIZE;
}

export function isFirmwareFileSize(size: number): boolean {
  return size <= MAX_FIRMWARE_SIZE;
}

export interface PostRow {
  id: string;
  author_id: string;
  post_type: PostType;
  title: string;
  content: string;
  media: CommunityMedia[];
  status: PostStatus;
  status_reason: string | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_rank_name?: string;
  author_rank_color?: string | null;
  author_rank_icon_label?: string | null;
}

export interface DocumentFile {
  name: string;
  size: number;
  mime: string;
  url: string;
  type?: string;
}

export interface DocumentRow {
  id: string;
  author_id: string;
  title: string;
  keyboard_name: string;
  version: string;
  notes: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  files: DocumentFile[];
  status: PostStatus;
  status_reason: string | null;
  download_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_rank_name?: string;
  author_rank_color?: string | null;
  author_rank_icon_label?: string | null;
}

export interface CommunityConfig {
  id: string;
  community_enabled: boolean;
  min_rank_level_post: number;
  firmware_enabled: boolean;
  min_rank_level_firmware: number;
}

export interface ListResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AUTHOR_SELECT_FIELDS = `
  title,
  content,
  post_type,
  status,
  status_reason,
  view_count,
  published_at,
  created_at,
  updated_at,
  author:users!community_posts_author_id_fkey (
    id,
    first_name,
    last_name,
    rank:customer_ranks (
      name,
      color,
      icon_label
    )
  )
`;

const FIRMWARE_SELECT_FIELDS = `
  title,
  keyboard_name,
  version,
  notes,
  file_url,
  file_name,
  file_size,
  mime_type,
  files,
  status,
  status_reason,
  download_count,
  published_at,
  created_at,
  updated_at,
  author:users!firmwares_author_id_fkey (
    id,
    first_name,
    last_name,
    rank:customer_ranks (
      name,
      color,
      icon_label
    )
  )
`;

function mapAuthorToName(author: {
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  if (!author) return "Người dùng";
  return (
    [author.first_name, author.last_name].filter(Boolean).join(" ") ||
    "Người dùng"
  );
}

function mapPostRow(row: Record<string, any>): PostRow {
  const author = row.author ?? {};
  return {
    id: row.id,
    author_id: row.author_id,
    post_type: row.post_type,
    title: row.title,
    content: row.content,
    media: Array.isArray(row.media) ? row.media : [],
    status: row.status,
    status_reason: row.status_reason ?? null,
    view_count: Number(row.view_count ?? 0),
    published_at: row.published_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: mapAuthorToName(author),
    author_rank_name: author.rank?.name ?? null,
    author_rank_color: author.rank?.color ?? null,
    author_rank_icon_label: author.rank?.icon_label ?? null,
  };
}

function mapDocumentRow(row: Record<string, any>): DocumentRow {
  const author = row.author ?? {};
  const rawFiles = Array.isArray(row.files) ? row.files : [];
  const files: DocumentFile[] =
    rawFiles.length > 0
      ? rawFiles.map((f: Record<string, any>) => ({
          name: String(f?.name ?? ""),
          size: Number(f?.size ?? 0),
          mime: String(f?.mime ?? ""),
          url: String(f?.url ?? ""),
        }))
      : row.file_url
        ? [
            {
              name: row.file_name ?? "Tài liệu",
              size: Number(row.file_size ?? 0),
              mime: row.mime_type ?? "application/octet-stream",
              url: row.file_url,
            },
          ]
        : [];
  return {
    id: row.id,
    author_id: row.author_id,
    title: row.title,
    keyboard_name: row.keyboard_name,
    version: row.version,
    notes: row.notes,
    file_url: row.file_url,
    file_name: row.file_name,
    file_size: Number(row.file_size ?? 0),
    mime_type: row.mime_type,
    files,
    status: row.status,
    status_reason: row.status_reason ?? null,
    download_count: Number(row.download_count ?? 0),
    published_at: row.published_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: mapAuthorToName(author),
    author_rank_name: author.rank?.name ?? null,
    author_rank_color: author.rank?.color ?? null,
    author_rank_icon_label: author.rank?.icon_label ?? null,
  };
}

// ─── Config + permission ─────────────────────────────────────────────────────

export async function getCommunityConfig(): Promise<CommunityConfig> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("community_config")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  return (
    data ?? {
      id: "default",
      community_enabled: true,
      min_rank_level_post: 2,
      firmware_enabled: true,
      min_rank_level_firmware: 2,
    }
  );
}

interface PermissionInfo {
  role: string | null;
  rankLevel: number | null;
  canPost: boolean;
  canUploadFirmware: boolean;
}

export async function getUserPermission(
  userId: string
): Promise<PermissionInfo> {
  const supabase = getAdminClient();
  const [config, { data: user }] = await Promise.all([
    getCommunityConfig(),
    supabase
      .from("users")
      .select("role, rank:customer_ranks(level)")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const role = user?.role ?? null;
  const rankLevel = (user?.rank as { level?: number } | null)?.level ?? null;
  const isAdmin = role === "admin";

  return {
    role,
    rankLevel,
    canPost:
      config.community_enabled &&
      (isAdmin ||
        (rankLevel !== null && rankLevel >= config.min_rank_level_post)),
    canUploadFirmware:
      config.firmware_enabled &&
      (isAdmin ||
        (rankLevel !== null && rankLevel >= config.min_rank_level_firmware)),
  };
}

export async function canUploadCommunity(
  userId: string,
  kind: "post" | "firmware"
): Promise<boolean> {
  const permission = await getUserPermission(userId);
  return kind === "post" ? permission.canPost : permission.canUploadFirmware;
}

// ─── Public list/detail reads (published only) ───────────────────────────────

export async function getPostList(
  type: string,
  page: number,
  limit: number
): Promise<ListResult<PostRow>> {
  // anon has no SELECT on `users` (needed for the author embed), so the
  // RLS-bypassing admin client (server-only) is used here — same pattern as
  // fees.ts behind a Redis cache.
  const supabase = getAdminClient();
  const isType = POST_TYPES.includes(type as PostType);

  let query = supabase
    .from("community_posts")
    .select(AUTHOR_SELECT_FIELDS, { count: "exact", head: false })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (isType) {
    query = query.eq("post_type", type);
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []).map(mapPostRow),
    count: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getPostDetail(id: string): Promise<PostRow | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("community_posts")
    .select(AUTHOR_SELECT_FIELDS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data ? mapPostRow(data) : null;
}

export async function getDocumentList(
  page: number,
  limit: number,
  query?: string
): Promise<ListResult<DocumentRow>> {
  // anon has no SELECT on `users` (needed for the author embed), so the
  // RLS-bypassing admin client (server-only) is used here.
  const supabase = getAdminClient();
  const from = (page - 1) * limit;

  let qb = supabase
    .from("firmwares")
    .select(FIRMWARE_SELECT_FIELDS, { count: "exact", head: false })
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (query && query.trim()) {
    const term = `%${query.trim()}%`;
    qb = qb.or(
      `keyboard_name.ilike.${term},title.ilike.${term},version.ilike.${term}`
    );
  }

  const { data, error, count } = await qb.range(from, from + limit - 1);

  if (error) throw error;

  return {
    data: (data ?? []).map(mapDocumentRow),
    count: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getDocumentDetail(
  id: string
): Promise<DocumentRow | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("firmwares")
    .select(FIRMWARE_SELECT_FIELDS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data ? mapDocumentRow(data) : null;
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

export interface PendingUpload {
  path: string;
  url: string;
}

export async function createSignedUploadUrls(
  bucket: string,
  folder: string,
  files: { name: string }[]
): Promise<PendingUpload[]> {
  const supabase = getAdminClient();
  const results: PendingUpload[] = [];
  for (const file of files) {
    const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data) continue;
    results.push({ path, url: data.signedUrl });
  }
  return results;
}

export function getPublicUrl(bucket: string, path: string): string {
  const supabase = getAdminClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getStorageObjectSize(
  bucket: string,
  path: string
): Promise<number | null> {
  const supabase = getAdminClient();
  const parts = path.split("/");
  const fileName = parts.pop() ?? "";
  const folder = parts.join("/");

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 200,
    search: fileName,
  });
  if (error || !data) return null;

  const match = data.find((o) => o.name === fileName);
  if (!match) return null;

  const size = (match.metadata as { size?: number } | null)?.size;
  return typeof size === "number" ? size : null;
}
