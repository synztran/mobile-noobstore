"use client";

import { useState } from "react";
import { X, HelpCircle, ArrowDownToLine, ArrowUpFromLine, GitMerge, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

export function SyncGuideModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="w-btn"
        onClick={() => setOpen(true)}
        title="Hướng dẫn sử dụng Sync"
      >
        <HelpCircle size={15} /> Hướng dẫn Sync
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(16,35,31,0.55)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "40px 16px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "var(--white)",
              borderRadius: 16,
              width: "min(720px, 100%)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
              position: "relative",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "22px 28px 18px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div className="w-kicker">Tài liệu nội bộ</div>
                <h2 style={{ margin: "4px 0 0", fontSize: 20, letterSpacing: "-0.03em" }}>
                  Hướng dẫn Đồng bộ Sản phẩm
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 8,
                  color: "var(--muted)",
                  display: "flex",
                }}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Giải thích trạng thái */}
              <section>
                <h3 style={{ margin: "0 0 10px", fontSize: 14, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>
                  Trạng thái sản phẩm
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <StatusRow
                    badge="Staged"
                    color="#eef2ef"
                    textColor="#52635d"
                    description="Sản phẩm chỉ tồn tại trong Warehouse, chưa được đẩy lên Admin/Storefront. Dùng Publish để tạo mới."
                  />
                  <StatusRow
                    badge="Linked"
                    color="#e4f3ed"
                    textColor="#17624e"
                    description="Sản phẩm đã được liên kết với Admin. Admin ID đã được lưu, có thể Pull hoặc Publish để đồng bộ hai chiều."
                  />
                  <StatusRow
                    badge="Conflict"
                    color="#fff2d9"
                    textColor="#835515"
                    description="Cả Warehouse và Admin đều có thay đổi kể từ lần sync cuối. Cần chọn rõ nguồn thắng thế trước khi tiếp tục."
                  />
                </div>
              </section>

              {/* Các hành động */}
              <section>
                <h3 style={{ margin: "0 0 10px", fontSize: 14, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>
                  Các hành động Sync
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  <ActionCard
                    icon={<ArrowUpFromLine size={18} color="#0e755e" />}
                    title="Publish"
                    when="Sản phẩm đang ở trạng thái Staged (chưa có trên Admin)"
                    steps={[
                      "Chọn sản phẩm cần xuất bản (checkbox)",
                      "Nhấn Publish selected",
                      "Warehouse đẩy dữ liệu lên Admin → sản phẩm xuất hiện trên Storefront",
                      "Trạng thái chuyển thành Linked",
                    ]}
                    note={null}
                  />

                  <ActionCard
                    icon={<ArrowDownToLine size={18} color="#0e755e" />}
                    title="Pull Admin edits"
                    when="Sản phẩm đã Linked, Admin vừa cập nhật thông tin (tên, giá, ảnh...)"
                    steps={[
                      "Chọn sản phẩm muốn kéo về",
                      "Nhấn Pull Admin edits",
                      "Warehouse nhận dữ liệu mới nhất từ Admin",
                      "Nếu Warehouse cũng có thay đổi chưa sync → báo Conflict",
                    ]}
                    note="Pull chỉ cập nhật thông tin sản phẩm, không ảnh hưởng đến số lượng tồn kho."
                  />

                  <ActionCard
                    icon={<RefreshCw size={18} color="#0e755e" />}
                    title="Kéo toàn bộ từ Admin"
                    when="Lần đầu dùng Warehouse, hoặc muốn đồng bộ lại toàn bộ danh mục"
                    steps={[
                      "Nhấn nút Kéo toàn bộ từ Admin",
                      "Hệ thống tạo/cập nhật tất cả sản phẩm trong Warehouse theo Admin",
                      "Các sản phẩm mới sẽ ở trạng thái Linked ngay",
                    ]}
                    note="Thao tác này không ảnh hưởng đến dữ liệu trên Admin hay Storefront."
                  />

                  <ActionCard
                    icon={<GitMerge size={18} color="#835515" />}
                    title="Xử lý Conflict"
                    when="Cả Warehouse lẫn Admin đều có thay đổi kể từ lần sync cuối"
                    steps={[
                      "Vào trang chi tiết sản phẩm → xem màn hình so sánh hai phiên bản",
                      'Chọn "Accept Admin version" → ghi đè Warehouse bằng dữ liệu Admin',
                      'Chọn "Keep Warehouse version and publish" → đẩy phiên bản Warehouse lên Admin',
                    ]}
                    note={null}
                  />

                </div>
              </section>

              {/* Lỗi thường gặp */}
              <section>
                <h3 style={{ margin: "0 0 10px", fontSize: 14, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)" }}>
                  Lỗi thường gặp &amp; Cách xử lý
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <ErrorCard
                    error="Canonical Admin product was not found"
                    cause='Admin ID được lưu trong Warehouse không còn tồn tại hoặc không phải loại "standard" (ví dụ: kit, component). Admin có thể đã xóa sản phẩm này.'
                    fix="Vào trang chi tiết sản phẩm trong Warehouse → xóa liên kết Admin ID → Publish lại để tạo mới. Hoặc kiểm tra Admin xem sản phẩm còn tồn tại không."
                  />
                  <ErrorCard
                    error="Product has not been published"
                    cause="Bạn đang Pull một sản phẩm chưa bao giờ được Publish lên Admin (không có Admin ID)."
                    fix="Dùng Publish thay vì Pull để tạo sản phẩm mới trên Admin."
                  />
                  <ErrorCard
                    error="conflict: canonical product has changed"
                    cause="Admin đã cập nhật sản phẩm sau khi bạn mở màn hình conflict nhưng trước khi bạn chọn hướng giải quyết."
                    fix="Tải lại trang, vào màn hình conflict và chọn lại."
                  />
                  <ErrorCard
                    error="Warehouse record changed while pull was being reviewed"
                    cause="Một staff khác cũng đang thao tác trên cùng sản phẩm."
                    fix="Tải lại trang và thử lại."
                  />
                </div>
              </section>

              {/* Lưu ý */}
              <div className="w-alert" style={{ margin: 0 }}>
                <strong>⚠ Lưu ý quan trọng:</strong> Sync chỉ đồng bộ <strong>thông tin sản phẩm</strong> (tên, giá, mô tả, ảnh...).
                Số lượng tồn kho được quản lý riêng qua trang <strong>Nhập kho</strong> và phê duyệt bởi Admin.
                Không dùng Publish để điều chỉnh tồn kho — dùng tab Nhập kho trong trang Nhập kho &amp; Dữ liệu.
              </div>

            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 28px",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button className="w-btn w-btn-primary" onClick={() => setOpen(false)}>
                <CheckCircle2 size={15} /> Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusRow({
  badge,
  color,
  textColor,
  description,
}: {
  badge: string;
  color: string;
  textColor: string;
  description: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span
        style={{
          flexShrink: 0,
          borderRadius: 999,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 700,
          background: color,
          color: textColor,
          marginTop: 1,
        }}
      >
        {badge}
      </span>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  when,
  steps,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  when: string;
  steps: string[];
  note: string | null;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        gap: 14,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
          <strong>Dùng khi:</strong> {when}
        </div>
        <ol style={{ margin: "0 0 0 16px", padding: 0, fontSize: 13, lineHeight: 1.7 }}>
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        {note && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
            💡 {note}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorCard({
  error,
  cause,
  fix,
}: {
  error: string;
  cause: string;
  fix: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e6b7b3",
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        gap: 12,
      }}
    >
      <AlertTriangle size={16} color="#983d38" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <code style={{ fontSize: 12, fontWeight: 700, color: "#983d38", display: "block", marginBottom: 4 }}>
          {error}
        </code>
        <div style={{ fontSize: 12, color: "var(--ink)", marginBottom: 4 }}>
          <strong>Nguyên nhân:</strong> {cause}
        </div>
        <div style={{ fontSize: 12, color: "var(--green-dark)" }}>
          <strong>Xử lý:</strong> {fix}
        </div>
      </div>
    </div>
  );
}
