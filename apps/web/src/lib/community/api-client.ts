import type { PostRow, DocumentRow, ListResult, PostStatus } from "@/lib/community-server";

// Client-side helpers for the community + firmware flows. All writes go
// through API routes, and file bytes are PUT directly to Supabase signed URLs.

interface ApiErrorBody {
  error?: string;
  message?: string;
}

export async function parseError(res: Response): Promise<Error> {
  const payload = (await res.json().catch(() => null)) as ApiErrorBody | null;
  return new Error(
    payload?.error ??
      payload?.message ??
      `Yêu cầu thất bại (${res.status})`,
  );
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface PublicCommunityConfig {
  id: string;
  community_enabled: boolean;
  min_rank_level_post: number;
  firmware_enabled: boolean;
  min_rank_level_firmware: number;
  can_post: boolean;
  can_upload_firmware: boolean;
  current_rank_level: number | null;
}

export async function getConfig(): Promise<PublicCommunityConfig> {
  const res = await fetch("/api/community/config");
  return json<PublicCommunityConfig>(res);
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export interface DraftFileInput {
  name: string;
  mime: string;
  size: number;
  kind: "image" | "video";
}

export interface PresignUpload {
  path: string;
  url: string;
  mime: string;
  kind: "image" | "video";
  size: number;
}

export interface PostDraft {
  post_id: string;
  uploads: PresignUpload[];
}

export async function createPostDraft(
  title: string,
  postType: string,
  files: DraftFileInput[],
): Promise<PostDraft> {
  const res = await fetch("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, post_type: postType, files }),
  });
  return json<PostDraft>(res);
}

export async function uploadToSignedUrl(url: string, file: File): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) {
    throw new Error("Tải tệp lên thất bại, vui lòng thử lại");
  }
}

export async function finalizePost(params: {
  post_id: string;
  title: string;
  post_type: string;
  content: string;
  uploads: PresignUpload[];
}): Promise<{ id: string; status: string }> {
  const res = await fetch("/api/community/posts/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return json<{ id: string; status: string }>(res);
}

export async function getPostList(
  type: string,
  page: number,
  limit = 12,
): Promise<ListResult<PostRow>> {
  const sp = new URLSearchParams({ type, page: String(page), limit: String(limit) });
  const res = await fetch(`/api/community/posts?${sp.toString()}`);
  return json<ListResult<PostRow>>(res);
}

// ─── Documents ───────────────────────────────────────────────────────────────

export interface DocumentDraftFile {
  name: string;
  mime: string;
  size: number;
  path: string;
  url: string;
}

export interface DocumentDraft {
  document_id: string;
  files: DocumentDraftFile[];
  title: string;
  keyboard_name: string;
  version: string;
  notes: string;
}

export async function createDocumentDraft(params: {
  title: string;
  keyboard_name: string;
  version: string;
  notes: string;
  files: { name: string; mime: string; size: number }[];
}): Promise<DocumentDraft> {
  const res = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return json<DocumentDraft>(res);
}

export async function finalizeDocument(params: {
  document_id: string;
  title: string;
  keyboard_name: string;
  version: string;
  notes: string;
  files: { name: string; mime: string; size: number; path: string }[];
}): Promise<{ id: string; status: string }> {
  const res = await fetch("/api/documents/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return json<{ id: string; status: string }>(res);
}

export async function getDocumentList(
  page: number,
  limit = 12,
  query = "",
): Promise<ListResult<DocumentRow>> {
  const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (query) sp.set("q", query);
  const res = await fetch(`/api/documents?${sp.toString()}`);
  return json<ListResult<DocumentRow>>(res);
}
