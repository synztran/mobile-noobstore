"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  FileSpreadsheet,
  Upload,
  PackageCheck,
  Clock,
  CheckCircle2,
  ArrowUpDown,
} from "lucide-react";
import type { InboundCsvPreview } from "@/modules/warehouse/inbound";
import type { AdjustmentCsvPreview, AdjustmentItemInput } from "@/modules/warehouse/adjustment";
import type { CsvImportPreview } from "@/modules/warehouse/types";
import { ImportGuideModal } from "@/components/ui/guides";

interface InboundBatchRecord {
  operation_id: string;
  filename: string;
  note: string | null;
  item_count: number;
  total_quantity: number;
  created_at: string;
  created_by: string;
  completed_at: string | null;
  status: "applied" | "pending_approval";
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<"inbound" | "adjustment" | "staging">("inbound");

  // ── Inbound state ──────────────────────────────────────────────────────────
  const [inboundFile, setInboundFile] = useState<File | null>(null);
  const [inboundPreview, setInboundPreview] = useState<InboundCsvPreview | null>(null);
  const [inboundNote, setInboundNote] = useState("");
  const [inboundLoading, setInboundLoading] = useState(false);
  const [inboundError, setInboundError] = useState<string | null>(null);
  const [inboundMessage, setInboundMessage] = useState<string | null>(null);
  const [recentBatches, setRecentBatches] = useState<InboundBatchRecord[]>([]);

  // ── Staging CSV state (legacy) ─────────────────────────────────────────────
  const [stagingFile, setStagingFile] = useState<File | null>(null);
  const [stagingPreview, setStagingPreview] = useState<CsvImportPreview | null>(null);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [stagingError, setStagingError] = useState<string | null>(null);
  const [stagingMessage, setStagingMessage] = useState<string | null>(null);

  // ── Stock Adjustment state ─────────────────────────────────────────────────
  const [adjFile, setAdjFile] = useState<File | null>(null);
  const [adjPreview, setAdjPreview] = useState<AdjustmentCsvPreview | null>(null);
  const [adjNote, setAdjNote] = useState("");
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);
  const [adjMessage, setAdjMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentBatches();
  }, []);

  async function fetchRecentBatches() {
    try {
      const res = await fetch("/api/warehouse/inbound");
      const data = await res.json();
      if (res.ok && Array.isArray(data.batches)) {
        setRecentBatches(data.batches);
      }
    } catch {
      // Non-fatal
    }
  }

  // ── Inbound handlers ───────────────────────────────────────────────────────
  async function handleInboundPreview(file: File | null) {
    setInboundFile(file);
    setInboundPreview(null);
    setInboundError(null);
    setInboundMessage(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setInboundError("Please upload a .csv file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setInboundError("CSV file must be under 2 MB.");
      return;
    }

    setInboundLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/warehouse/inbound", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to preview inbound CSV.");
      setInboundPreview(data.preview);
    } catch (err) {
      setInboundError(err instanceof Error ? err.message : "Failed to parse CSV.");
    } finally {
      setInboundLoading(false);
    }
  }

  async function handleCommitInbound() {
    if (!inboundFile || !inboundPreview || inboundPreview.issues.length > 0) return;
    if (inboundPreview.items.length === 0) {
      setInboundError("No items with inbound_quantity > 0 to submit.");
      return;
    }

    setInboundLoading(true);
    setInboundError(null);
    setInboundMessage(null);

    try {
      const csv = await inboundFile.text();
      const res = await fetch("/api/warehouse/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          filename: inboundFile.name,
          csv,
          note: inboundNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to commit inbound batch.");

      setInboundMessage(
        `Đã gửi lô nhập kho (${data.item_count} mặt hàng, tổng +${data.total_quantity} cái). Đang chờ Admin duyệt trong trang Tồn kho.`
      );
      setInboundPreview(null);
      setInboundFile(null);
      setInboundNote("");
      fetchRecentBatches();
    } catch (err) {
      setInboundError(err instanceof Error ? err.message : "Failed to submit inbound batch.");
    } finally {
      setInboundLoading(false);
    }
  }

  // ── Adjustment handlers ────────────────────────────────────────────────────
  async function handleAdjPreview(file: File | null) {
    setAdjFile(file);
    setAdjPreview(null);
    setAdjError(null);
    setAdjMessage(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setAdjError("Chọn file .csv."); return; }
    if (file.size > 2 * 1024 * 1024) { setAdjError("File phải dưới 2 MB."); return; }
    setAdjLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/warehouse/adjustment", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không thể xem trước file.");
      setAdjPreview(data.preview);
    } catch (err) {
      setAdjError(err instanceof Error ? err.message : "Lỗi khi đọc file.");
    } finally {
      setAdjLoading(false);
    }
  }

  async function handleCommitAdj() {
    if (!adjFile || !adjPreview || adjPreview.issues.length > 0) return;
    if (adjPreview.items.length === 0) { setAdjError("Không có dòng nào có số lượng khác 0."); return; }
    setAdjLoading(true);
    setAdjError(null);
    setAdjMessage(null);
    try {
      const csv = await adjFile.text();
      const res = await fetch("/api/warehouse/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", filename: adjFile.name, csv, note: adjNote.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không thể gửi phiếu điều chỉnh.");
      setAdjMessage(`Đã gửi phiếu điều chỉnh (${data.item_count} mặt hàng). Chờ Admin duyệt trong trang Tồn kho.`);
      setAdjPreview(null);
      setAdjFile(null);
      setAdjNote("");
    } catch (err) {
      setAdjError(err instanceof Error ? err.message : "Lỗi khi gửi phiếu.");
    } finally {
      setAdjLoading(false);
    }
  }

  // ── Staging handlers (legacy) ──────────────────────────────────────────────
  async function handleStagingPreview(file: File | null) {
    setStagingFile(file);
    setStagingPreview(null);
    setStagingError(null);
    setStagingMessage(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStagingError("Choose a .csv file.");
      return;
    }
    setStagingLoading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/warehouse/import/preview", { method: "POST", body: form });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Unable to preview CSV.");
      setStagingPreview(payload.preview);
    } catch (cause) {
      setStagingError(cause instanceof Error ? cause.message : "Unable to preview CSV.");
    } finally {
      setStagingLoading(false);
    }
  }

  async function handleCommitStaging() {
    if (!stagingFile || !stagingPreview || stagingPreview.issues.length) return;
    setStagingLoading(true);
    setStagingError(null);
    setStagingMessage(null);
    try {
      const csv = await stagingFile.text();
      const res = await fetch("/api/warehouse/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", filename: stagingFile.name, csv }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Import failed.");
      setStagingMessage(`Imported ${payload.batch?.product_count ?? stagingPreview.products.length} product(s).`);
      setStagingPreview(null);
      setStagingFile(null);
    } catch (cause) {
      setStagingError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setStagingLoading(false);
    }
  }

  return (
    <main className="w-content">
      {/* Header */}
      <div className="w-head">
        <div>
          <div className="w-kicker">Warehouse Operations</div>
          <h1 className="w-title">Nhập kho &amp; Dữ liệu</h1>
          <p className="w-sub">
            Nhập số lượng hàng vào kho theo mẫu khớp với sản phẩm hiện có ở Admin.
          </p>
        </div>
        <div className="w-actions">
          <ImportGuideModal />
          <Link className="w-btn" href="/">
            <FileSpreadsheet size={15} /> Về danh mục
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-inline" style={{ marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab("inbound")}
          className={`w-btn ${activeTab === "inbound" ? "w-btn-primary" : ""}`}
        >
          <PackageCheck size={16} /> Nhập kho (Inbound)
        </button>
        <button
          onClick={() => setActiveTab("adjustment")}
          className={`w-btn ${activeTab === "adjustment" ? "w-btn-primary" : ""}`}
        >
          <ArrowUpDown size={16} /> Điều chỉnh tồn kho
        </button>
        <button
          onClick={() => setActiveTab("staging")}
          className={`w-btn ${activeTab === "staging" ? "w-btn-primary" : ""}`}
        >
          <FileSpreadsheet size={16} /> Staging Catalog (Toàn bộ trường)
        </button>
      </div>

      {/* TAB 1: INBOUND INVENTORY */}
      {activeTab === "inbound" && (
        <>
          <div className="w-alert">
            <strong>Quy trình nhập kho:</strong> Tải file mẫu CSV chứa danh sách sản phẩm &amp; biến thể đang có trên hệ thống. Điền số lượng nhập (inbound_quantity) cho các món cần nhập, sau đó tải lên để gửi duyệt cho Admin. Số lượng trong Admin sẽ tăng thêm theo số lượng nhập.
          </div>

          <section className="w-panel">
            <h2>1. Tải mẫu nhập kho &amp; Tải lên file</h2>
            <p className="w-small" style={{ marginBottom: 14 }}>
              Mẫu CSV đã điền sẵn tên sản phẩm, slug, biến thể và tồn kho hiện tại. Bạn chỉ cần nhập số lượng cần thêm vào cột <code>inbound_quantity</code>.
            </p>

            <div className="w-drop">
              <Upload size={24} color="#0e755e" />
              <p style={{ margin: "8px 0 4px" }}>
                <strong>Chọn file CSV nhập kho đã điền</strong>
              </p>
              <p className="w-small">Định dạng UTF-8 CSV, dung lượng dưới 2 MB.</p>
              <input
                aria-label="Upload inbound CSV"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void handleInboundPreview(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="w-actions" style={{ marginTop: 14 }}>
              <a className="w-btn" href="/api/warehouse/inbound/template" download>
                <Download size={15} /> Tải mẫu nhập kho (CSV khớp Admin)
              </a>
              <button
                className="w-btn w-btn-primary"
                disabled={
                  !inboundPreview ||
                  inboundLoading ||
                  inboundPreview.issues.length > 0 ||
                  inboundPreview.items.length === 0
                }
                onClick={() => void handleCommitInbound()}
              >
                {inboundLoading ? "Đang gửi…" : "Gửi lô nhập kho cho Admin duyệt"}
              </button>
            </div>

            {inboundError && <div className="w-error" role="alert">{inboundError}</div>}
            {inboundMessage && <div className="w-success" role="status">{inboundMessage}</div>}
          </section>

          {/* Loading */}
          {inboundLoading && (
            <div className="w-panel" aria-live="polite">
              <div className="w-skeleton" />
              <div className="w-skeleton" style={{ marginTop: 10, width: "65%" }} />
            </div>
          )}

          {/* Inbound Preview Table */}
          {inboundPreview && (
            <section className="w-panel">
              <div className="w-inline" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h2>Xem trước hàng nhập kho</h2>
                  <p className="w-small">
                    {inboundPreview.rowCount} dòng trong file · {inboundPreview.items.length} mặt hàng có số lượng nhập &gt; 0 · Tổng cộng:{" "}
                    <strong>+{inboundPreview.totalQuantity} sản phẩm</strong>
                  </p>
                </div>
                <span
                  className={`w-status ${
                    inboundPreview.issues.length ? "w-status-failed" : "w-status-linked"
                  }`}
                >
                  {inboundPreview.issues.length
                    ? "Có lỗi cần sửa"
                    : inboundPreview.items.length > 0
                    ? "Sẵn sàng gửi duyệt"
                    : "Không có số lượng nhập (>0)"}
                </span>
              </div>

              {/* Note input */}
              <div style={{ marginBottom: 14 }}>
                <label className="w-field">
                  Ghi chú lô hàng (Số phiếu nhập, nhà cung cấp, PO...):
                  <input
                    type="text"
                    placeholder="VD: PO-2026-10-18, Hàng nhập từ xưởng..."
                    value={inboundNote}
                    onChange={(e) => setInboundNote(e.target.value)}
                  />
                </label>
              </div>

              {/* Warnings */}
              {inboundPreview.warnings.map((w, idx) => (
                <div className="w-alert" key={`warn-${idx}`}>
                  Dòng {w.row || "—"}: {w.message}
                </div>
              ))}

              {/* Issues */}
              {inboundPreview.issues.length > 0 && (
                <div className="w-table-wrap w-preview" style={{ marginBottom: 14 }}>
                  <table className="w-table">
                    <thead>
                      <tr>
                        <th>Dòng</th>
                        <th>Cột</th>
                        <th>Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inboundPreview.issues.map((issue, idx) => (
                        <tr key={`issue-${idx}`}>
                          <td>{issue.row || "—"}</td>
                          <td>{issue.field}</td>
                          <td style={{ color: "#983d38", fontWeight: 600 }}>{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Valid Items Table */}
              {inboundPreview.items.length > 0 && (
                <div className="w-table-wrap w-preview">
                  <table className="w-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Slug</th>
                        <th>Biến thể</th>
                        <th style={{ textAlign: "right" }}>Tồn hiện tại</th>
                        <th style={{ textAlign: "right" }}>Số lượng nhập</th>
                        <th style={{ textAlign: "right" }}>Tồn dự kiến sau nhập</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inboundPreview.items.map((item, idx) => {
                        const newStock = item.current_stock + item.inbound_quantity;
                        return (
                          <tr key={`item-${idx}`}>
                            <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                            <td className="w-small">{item.product_slug}</td>
                            <td>{item.variant_name || <span className="w-small">—</span>}</td>
                            <td style={{ textAlign: "right" }}>{item.current_stock}</td>
                            <td style={{ textAlign: "right", color: "#17624e", fontWeight: 700 }}>
                              +{item.inbound_quantity}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>{newStock}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Recent Inbound Batches */}
          <section className="w-panel" style={{ marginTop: 18 }}>
            <div className="w-inline" style={{ justifyContent: "space-between" }}>
              <h2>Lịch sử các lô nhập kho gần đây</h2>
              <button onClick={fetchRecentBatches} className="w-btn" style={{ padding: "6px 10px", fontSize: 12 }}>
                Làm mới
              </button>
            </div>
            {recentBatches.length > 0 ? (
              <div className="w-table-wrap" style={{ marginTop: 10 }}>
                <table className="w-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>File</th>
                      <th>Số mặt hàng</th>
                      <th>Tổng số lượng</th>
                      <th>Ghi chú</th>
                      <th>Người tạo</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBatches.map((b) => (
                      <tr key={b.operation_id}>
                        <td>{new Date(b.created_at).toLocaleString("vi-VN")}</td>
                        <td style={{ fontWeight: 600 }}>{b.filename}</td>
                        <td>{b.item_count} mặt hàng</td>
                        <td style={{ fontWeight: 700, color: "#17624e" }}>+{b.total_quantity}</td>
                        <td className="w-small">{b.note || "—"}</td>
                        <td className="w-small">{b.created_by}</td>
                        <td>
                          {b.status === "applied" ? (
                            <span className="w-status w-status-linked">
                              <CheckCircle2 size={12} /> Đã áp dụng tồn kho
                            </span>
                          ) : (
                            <span className="w-status w-status-conflict">
                              <Clock size={12} /> Chờ Admin duyệt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="w-small" style={{ marginTop: 8 }}>
                Chưa có lô nhập kho nào. Tải file mẫu và tải lên để tạo lô đầu tiên.
              </p>
            )}
          </section>
        </>
      )}

      {/* TAB 2: STOCK ADJUSTMENT */}
      {activeTab === "adjustment" && (
        <>
          <div className="w-alert">
            <strong>Điều chỉnh tồn kho:</strong> Dùng để sửa số lượng tồn khi kiểm kê phát hiện sai lệch, hàng hỏng, hàng thất thoát... Nhập số <strong>âm</strong> để giảm, số <strong>dương</strong> để tăng. Mỗi dòng nên điền rõ lý do để Admin duyệt dễ hơn.
          </div>

          <section className="w-panel">
            <h2>1. Tải mẫu điều chỉnh &amp; Tải lên file</h2>
            <p className="w-small" style={{ marginBottom: 14 }}>
              Mẫu CSV điền sẵn tên sản phẩm, biến thể và tồn kho hiện tại. Điền số lượng vào cột <code>adjustment_quantity</code> (âm = giảm, dương = tăng) và lý do vào cột <code>reason</code>.
            </p>

            <div className="w-drop">
              <Upload size={24} color="#0e755e" />
              <p style={{ margin: "8px 0 4px" }}><strong>Chọn file CSV điều chỉnh tồn kho</strong></p>
              <p className="w-small">Định dạng UTF-8 CSV, dung lượng dưới 2 MB.</p>
              <input
                aria-label="Upload adjustment CSV"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void handleAdjPreview(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="w-actions" style={{ marginTop: 14 }}>
              <a className="w-btn" href="/api/warehouse/adjustment" download>
                <Download size={15} /> Tải mẫu điều chỉnh (CSV khớp Admin)
              </a>
              <button
                className="w-btn w-btn-primary"
                disabled={!adjPreview || adjLoading || adjPreview.issues.length > 0 || adjPreview.items.length === 0}
                onClick={() => void handleCommitAdj()}
              >
                {adjLoading ? "Đang gửi…" : "Gửi phiếu điều chỉnh cho Admin duyệt"}
              </button>
            </div>

            {adjError && <div className="w-error" role="alert">{adjError}</div>}
            {adjMessage && <div className="w-success" role="status">{adjMessage}</div>}
          </section>

          {adjLoading && (
            <div className="w-panel" aria-live="polite">
              <div className="w-skeleton" />
              <div className="w-skeleton" style={{ marginTop: 10, width: "65%" }} />
            </div>
          )}

          {adjPreview && (
            <section className="w-panel">
              <div className="w-inline" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h2>Xem trước điều chỉnh tồn kho</h2>
                  <p className="w-small">
                    {adjPreview.rowCount} dòng trong file · {adjPreview.items.length} mặt hàng có số lượng khác 0
                  </p>
                </div>
                <span className={`w-status ${adjPreview.issues.length ? "w-status-failed" : "w-status-linked"}`}>
                  {adjPreview.issues.length ? "Có lỗi cần sửa" : adjPreview.items.length > 0 ? "Sẵn sàng gửi duyệt" : "Không có dòng nào"}
                </span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label className="w-field">
                  Ghi chú chung (không bắt buộc):
                  <input
                    type="text"
                    placeholder="VD: Kiểm kê tháng 11, hàng thất thoát..."
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                  />
                </label>
              </div>

              {adjPreview.warnings.map((w, idx) => (
                <div className="w-alert" key={`adjwarn-${idx}`}>Dòng {w.row || "—"}: {w.message}</div>
              ))}

              {adjPreview.issues.length > 0 && (
                <div className="w-table-wrap w-preview" style={{ marginBottom: 14 }}>
                  <table className="w-table">
                    <thead><tr><th>Dòng</th><th>Cột</th><th>Lỗi</th></tr></thead>
                    <tbody>
                      {adjPreview.issues.map((issue, idx) => (
                        <tr key={`adjissue-${idx}`}>
                          <td>{issue.row || "—"}</td>
                          <td>{issue.field}</td>
                          <td style={{ color: "#983d38", fontWeight: 600 }}>{issue.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {adjPreview.items.length > 0 && (
                <div className="w-table-wrap w-preview">
                  <table className="w-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Slug</th>
                        <th>Biến thể</th>
                        <th style={{ textAlign: "right" }}>Tồn hiện tại</th>
                        <th style={{ textAlign: "right" }}>Điều chỉnh</th>
                        <th style={{ textAlign: "right" }}>Tồn dự kiến</th>
                        <th>Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjPreview.items.map((item, idx) => {
                        const projected = item.current_stock + item.adjustment_quantity;
                        const isNeg = item.adjustment_quantity < 0;
                        return (
                          <tr key={`adjitem-${idx}`}>
                            <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                            <td className="w-small">{item.product_slug}</td>
                            <td>{item.variant_name || <span className="w-small">—</span>}</td>
                            <td style={{ textAlign: "right" }}>{item.current_stock}</td>
                            <td style={{ textAlign: "right", color: isNeg ? "#983d38" : "#17624e", fontWeight: 700 }}>
                              {item.adjustment_quantity > 0 ? "+" : ""}{item.adjustment_quantity}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: projected < 0 ? "#983d38" : "inherit" }}>
                              {projected}
                            </td>
                            <td className="w-small">{item.reason || <span style={{ opacity: 0.5 }}>—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* TAB 3: STAGING CATALOG IMPORT (Legacy) */}
      {activeTab === "staging" && (
        <>
          <div className="w-alert">
            <strong>Staging Catalog:</strong> Dành cho việc khởi tạo sản phẩm mới đầy đủ các trường marketing (mô tả, ảnh, thuộc tính...). Số lượng tồn chỉ gửi khi xuất bản sản phẩm mới lần đầu.
          </div>

          <section className="w-panel">
            <h2>Nhập dữ liệu sản phẩm staging</h2>
            <div className="w-drop">
              <Upload size={22} color="#0e755e" />
              <p><strong>Chọn file CSV staging</strong></p>
              <p className="w-small">Tải mẫu catalog staging và giữ đúng thứ tự các cột.</p>
              <input
                aria-label="Choose warehouse CSV"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void handleStagingPreview(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="w-actions" style={{ marginTop: 14 }}>
              <a className="w-btn" href="/api/warehouse/template" download>
                <Download size={15} /> Tải mẫu Staging (22 cột)
              </a>
              <a className="w-btn" href="/api/warehouse/export">
                <Download size={15} /> Xuất dữ liệu Staging hiện có
              </a>
              <button
                className="w-btn w-btn-primary"
                disabled={!stagingPreview || stagingLoading || stagingPreview.issues.length > 0}
                onClick={() => void handleCommitStaging()}
              >
                {stagingLoading ? "Đang lưu…" : "Lưu vào Staging"}
              </button>
            </div>
            {stagingError && <div className="w-error" role="alert">{stagingError}</div>}
            {stagingMessage && <div className="w-success" role="status">{stagingMessage}</div>}
          </section>

          {stagingLoading && (
            <div className="w-panel" aria-live="polite">
              <div className="w-skeleton" />
              <div className="w-skeleton" style={{ marginTop: 10, width: "72%" }} />
            </div>
          )}

          {stagingPreview && (
            <section className="w-panel">
              <div className="w-inline" style={{ justifyContent: "space-between" }}>
                <div>
                  <h2>Xem trước Staging</h2>
                  <p className="w-small">
                    {stagingPreview.rowCount} dòng · {stagingPreview.products.length} sản phẩm · {stagingPreview.issues.length} lỗi
                  </p>
                </div>
                <span className={`w-status ${stagingPreview.issues.length ? "w-status-failed" : "w-status-linked"}`}>
                  {stagingPreview.issues.length ? "Cannot commit" : "Ready to import"}
                </span>
              </div>
              {stagingPreview.warnings.map((item, i) => (
                <div className="w-alert" key={`warn-${i}`}>
                  Dòng {item.row || "—"} · {item.field}: {item.message}
                </div>
              ))}
              {stagingPreview.issues.length > 0 && (
                <div className="w-table-wrap w-preview">
                  <table className="w-table">
                    <thead>
                      <tr>
                        <th>Dòng</th>
                        <th>Cột</th>
                        <th>Lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stagingPreview.issues.map((item, i) => (
                        <tr key={`${item.row}-${item.field}-${i}`}>
                          <td>{item.row || "—"}</td>
                          <td>{item.field}</td>
                          <td>{item.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="w-table-wrap w-preview" style={{ marginTop: 14 }}>
                <table className="w-table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Slug</th>
                      <th>Biến thể</th>
                      <th>Giá</th>
                      <th>Tồn ban đầu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagingPreview.products.slice(0, 100).map((product) => (
                      <tr key={`${product.warehouse_id ?? product.slug}`}>
                        <td>{product.name}</td>
                        <td>{product.slug}</td>
                        <td>
                          {product.variants.map((v) => v.variant_name).join(", ") || "—"}
                        </td>
                        <td>{product.base_price.toLocaleString("vi-VN")} ₫</td>
                        <td>
                          {product.variants.length
                            ? product.variants.map((v) => `${v.variant_name}: ${v.initial_stock}`).join(" · ")
                            : product.initial_stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
