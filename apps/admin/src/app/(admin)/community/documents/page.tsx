import { getAdminClient } from "@/lib/supabase/admin";
import CreateDocumentButton from "@/components/documents/CreateDocumentButton";
import DocumentsTable from "@/components/documents/DocumentsTable";

export const metadata = {
  title: "Documents - NoobStore Admin",
};

export default async function DocumentsPage(props: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = (searchParams.search ?? "").trim();
  const status = searchParams.status ?? "";

  const supabase = getAdminClient();

  let query = supabase
    .from("firmwares")
    .select(
      `id, title, keyboard_name, version, notes, file_name, file_size,
       file_url, files, status, status_reason, download_count,
       created_at, published_at,
       author:users!firmwares_author_id_fkey(id, first_name, last_name)`,
      { count: "exact", head: false },
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `keyboard_name.ilike.%${search}%,title.ilike.%${search}%,version.ilike.%${search}%`,
    );
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: rows, error, count } = await query;

  if (error) {
    console.error("Error fetching documents:", error);
  }

  const documents =
    (rows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      keyboard_name: row.keyboard_name,
      version: row.version ?? "",
      notes: row.notes ?? "",
      file_name: row.file_name ?? "",
      status: row.status,
      status_reason: row.status_reason,
      download_count: row.download_count ?? 0,
      created_at: row.created_at,
      author_name: [row.author?.first_name, row.author?.last_name]
        .filter(Boolean)
        .join(" ") || "Người dùng",
    })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900">Documents</p>
        <CreateDocumentButton />
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-3">
        <input
          name="search"
          type="text"
          placeholder="Tìm kiếm bàn phím / tiêu đề / phiên bản..."
          defaultValue={search}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="status"
          defaultValue={status || "all"}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="published">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Tìm kiếm
        </button>
        {(search || status) && (
          <a
            href="/community/documents"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Xoá bộ lọc
          </a>
        )}
      </form>

      <p className="text-sm text-slate-500">
        {count != null ? `${count.toLocaleString("vi-VN")} tài liệu` : ""}
      </p>

      <DocumentsTable documents={documents} />
    </div>
  );
}
