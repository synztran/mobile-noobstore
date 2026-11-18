"use client";

import { PageGuide, type GuideSection } from "./PageGuide";
import { ArrowUpFromLine, ArrowDownToLine, RefreshCw, GitMerge, PackageCheck, ArrowUpDown, FileSpreadsheet, PlusCircle, Save } from "lucide-react";

// ── 1. Catalog Page Guide ───────────────────────────────────────────────────
const CATALOG_SECTIONS: GuideSection[] = [
  {
    heading: "Trạng thái sản phẩm",
    items: [
      {
        type: "badges",
        badges: [
          { label: "Staged", bg: "#eef2ef", fg: "#52635d", desc: "Sản phẩm mới chỉ có ở Warehouse, chưa đưa lên Admin/Storefront. Dùng Publish để tạo mới." },
          { label: "Linked", bg: "#e4f3ed", fg: "#17624e", desc: "Sản phẩm đã liên kết 2 chiều với Admin. Có thể Pull (kéo từ Admin) hoặc Publish (đẩy từ Warehouse)." },
          { label: "Conflict", bg: "#fff2d9", fg: "#835515", desc: "Cả Warehouse lẫn Admin đều có thay đổi mới từ lần sync trước. Cần vào chi tiết để chọn nguồn ưu tiên." },
        ],
      },
    ],
  },
  {
    heading: "Các thao tác chính",
    items: [
      {
        type: "steps",
        title: "Publish (Xuất bản)",
        when: "Tạo sản phẩm mới lên Admin hoặc đẩy bản nháp Warehouse lên",
        icon: <ArrowUpFromLine size={18} color="#0e755e" />,
        steps: ["Tích chọn sản phẩm (checkbox)", "Nhấn 'Publish selected'", "Sản phẩm xuất hiện trên Admin & Storefront ngay lập tức"],
      },
      {
        type: "steps",
        title: "Pull Admin edits",
        when: "Admin vừa cập nhật tên, giá, mô tả... và bạn muốn kéo về Warehouse",
        icon: <ArrowDownToLine size={18} color="#0e755e" />,
        steps: ["Tích chọn sản phẩm", "Nhấn 'Pull Admin edits'", "Dữ liệu Warehouse được cập nhật theo Admin"],
        tip: "Pull chỉ đồng bộ thông tin (tên, giá, mô tả), không ảnh hưởng tồn kho.",
      },
      {
        type: "steps",
        title: "Kéo toàn bộ từ Admin",
        when: "Muốn lấy toàn bộ danh mục sản phẩm từ Admin về Warehouse",
        icon: <RefreshCw size={18} color="#0e755e" />,
        steps: ["Nhấn 'Kéo toàn bộ từ Admin'", "Hệ thống tự động tải và cập nhật toàn bộ danh mục"],
      },
    ],
  },
  {
    heading: "Lỗi thường gặp & Cách khắc phục",
    items: [
      {
        type: "error",
        code: "Canonical Admin product was not found",
        cause: "Admin ID không tồn tại hoặc sản phẩm trên Admin là loại Kit (Sync không hỗ trợ Kit). Loại Component vẫn được hỗ trợ từ phiên bản này.",
        fix: "Vào chi tiết sản phẩm trong Warehouse → Xóa Admin ID → Publish lại để tạo mới trên Admin.",
      },
      {
        type: "error",
        code: "Product has not been published",
        cause: "Bạn bấm Pull một sản phẩm chưa từng xuất bản lên Admin.",
        fix: "Dùng Publish thay vì Pull.",
      },
    ],
  },
  {
    heading: "Lưu ý an toàn tồn kho",
    items: [
      {
        type: "note",
        text: (
          <>
            <strong>⚠ Tồn kho ban đầu:</strong> Chỉ được gửi <strong>1 lần duy nhất</strong> khi Publish sản phẩm mới. Về sau, số lượng tồn kho trên Admin là chuẩn (canonical) — muốn thay đổi tồn kho phải qua trang <strong>Nhập kho</strong> hoặc <strong>Điều chỉnh tồn kho</strong>.
          </>
        ),
      },
    ],
  },
];

export function CatalogGuideModal() {
  return <PageGuide title="Hướng dẫn Quản lý Danh mục & Đồng bộ" kicker="Staging Catalog" sections={CATALOG_SECTIONS} label="Hướng dẫn Sync" />;
}

// ── 2. Import / Stock Adjustment Guide ──────────────────────────────────────
const IMPORT_SECTIONS: GuideSection[] = [
  {
    heading: "Các tính năng trong trang",
    items: [
      {
        type: "steps",
        title: "Tab 1: Nhập kho (Inbound)",
        when: "Tăng tồn kho khi nhập hàng mới từ nhà cung cấp",
        icon: <PackageCheck size={18} color="#0e755e" />,
        steps: [
          "Tải file mẫu CSV điền sẵn sản phẩm",
          "Nhập số lượng nhập vào cột 'inbound_quantity' (chỉ nhập số dương > 0)",
          "Upload file CSV → Kiểm tra bản xem trước → Gửi duyệt",
          "Admin phê duyệt trong màn hình Tồn kho → Số tồn được cộng thêm",
        ],
      },
      {
        type: "steps",
        title: "Tab 2: Điều chỉnh tồn kho (Stock Adjustment)",
        when: "Sửa lệch kho khi kiểm kê, hàng hỏng, hàng thất thoát",
        icon: <ArrowUpDown size={18} color="#0e755e" />,
        steps: [
          "Tải file mẫu điều chỉnh CSV",
          "Nhập số lượng vào cột 'adjustment_quantity' (số âm = giảm tồn, số dương = tăng tồn)",
          "Điền lý do điều chỉnh vào cột 'reason' (bắt buộc để Admin dễ duyệt)",
          "Upload CSV → Xem trước số tồn dự kiến → Gửi duyệt",
        ],
      },
      {
        type: "steps",
        title: "Tab 3: Staging Catalog CSV",
        when: "Khởi tạo nhiều sản phẩm mới cùng lúc với đầy đủ 22 trường thông tin",
        icon: <FileSpreadsheet size={18} color="#0e755e" />,
        steps: ["Tải file mẫu 22 cột", "Điền thông tin sản phẩm, biến thể, giá, mô tả...", "Upload để lưu bản nháp vào Warehouse catalog"],
      },
    ],
  },
  {
    heading: "Lưu ý quan trọng",
    items: [
      {
        type: "note",
        text: (
          <>
            <strong>Mọi thao tác thay đổi tồn kho đều phải qua Admin duyệt:</strong> Phiếu nhập kho và điều chỉnh kho sẽ được ghi vào danh sách chờ duyệt. Admin sẽ phê duyệt tại ứng dụng Admin trước khi số lượng trên Storefront được cập nhật.
          </>
        ),
      },
    ],
  },
];

export function ImportGuideModal() {
  return <PageGuide title="Hướng dẫn Nhập kho & Điều chỉnh Tồn kho" kicker="Inbound & Adjustment" sections={IMPORT_SECTIONS} label="Hướng dẫn Nhập/Điều chỉnh" />;
}

// ── 3. Sync History Guide ───────────────────────────────────────────────────
const SYNC_HISTORY_SECTIONS: GuideSection[] = [
  {
    heading: "Mục đích sử dụng",
    items: [
      {
        type: "note",
        text: "Trang nhật ký lưu vết toàn bộ lịch sử đồng bộ (Publish, Pull, Resolve Conflict) giữa Warehouse và Admin. Dùng để kiểm tra khi nào sản phẩm được xuất bản, ai thực hiện và kết quả ra sao.",
      },
    ],
  },
  {
    heading: "Ý nghĩa các kết quả (Outcome)",
    items: [
      {
        type: "badges",
        badges: [
          { label: "created", bg: "#e4f3ed", fg: "#17624e", desc: "Sản phẩm mới đã được tạo thành công trên Admin." },
          { label: "updated", bg: "#eef2ef", fg: "#52635d", desc: "Sản phẩm đã được cập nhật thông tin thành công." },
          { label: "unchanged", bg: "#f5f7f4", fg: "#657772", desc: "Dữ liệu 2 bên hoàn toàn giống nhau, không có thay đổi." },
          { label: "conflict", bg: "#fff2d9", fg: "#835515", desc: "Xảy ra xung đột: cả 2 bên đều sửa từ lần sync cuối. Cần xử lý thủ công." },
          { label: "failed", bg: "#fce8e6", fg: "#a43c38", desc: "Thao tác sync bị lỗi (xem cột Details để biết nguyên nhân)." },
        ],
      },
    ],
  },
];

export function SyncHistoryGuideModal() {
  return <PageGuide title="Hướng dẫn Tra cứu Nhật ký Sync" kicker="Audit Log" sections={SYNC_HISTORY_SECTIONS} label="Hướng dẫn Nhật ký" />;
}

// ── 4. Product Detail Guide ─────────────────────────────────────────────────
const PRODUCT_DETAIL_SECTIONS: GuideSection[] = [
  {
    heading: "Các thao tác với bản nháp",
    items: [
      {
        type: "steps",
        title: "Lưu bản nháp (Save draft)",
        when: "Chỉnh sửa tên, giá, mô tả, ảnh, thuộc tính...",
        icon: <Save size={18} color="#0e755e" />,
        steps: ["Nhập các thông tin cần sửa", "Nhấn 'Save draft'", "Bản nháp được lưu trong Warehouse, Admin/Storefront CHƯA bị thay đổi"],
      },
      {
        type: "steps",
        title: "Xuất bản (Publish)",
        when: "Đẩy toàn bộ bản nháp Warehouse lên Admin/Storefront",
        icon: <ArrowUpFromLine size={18} color="#0e755e" />,
        steps: ["Nhấn 'Publish new' (nếu là sản phẩm mới) hoặc 'Publish edits' (nếu đã liên kết)", "Dữ liệu trên Admin được cập nhật ngay lập tức"],
      },
      {
        type: "steps",
        title: "Điều chỉnh tồn kho trực tiếp (Live Variant Stock)",
        when: "Cần tăng/giảm số lượng của 1 biến thể cụ thể ngay lập tức",
        icon: <ArrowUpDown size={18} color="#0e755e" />,
        steps: [
          "Nhập lý do vào ô 'Adjustment reason' (bắt buộc, ví dụ: 'Kiểm kê lại')",
          "Nhấn nút '- 1' hoặc '+ 1' tương ứng với biến thể",
          "Số lượng được cập nhật ngay trên Admin & Storefront và ghi nhật ký kiểm toán",
        ],
        tip: "Tính năng này chỉ xuất hiện khi sản phẩm đã được xuất bản (Linked).",
      },
    ],
  },
  {
    heading: "Xử lý xung đột (Conflict)",
    items: [
      {
        type: "steps",
        title: "Khi xuất hiện cảnh báo Sync baseline exists",
        when: "Cả Admin lẫn Warehouse đều được chỉnh sửa độc lập",
        icon: <GitMerge size={18} color="#835515" />,
        steps: [
          "Chọn 'Accept Admin version': Hủy bỏ bản nháp Warehouse, lấy dữ liệu Admin về",
          "Chọn 'Keep warehouse version and publish': Ghi đè dữ liệu Warehouse lên Admin",
        ],
      },
    ],
  },
];

export function ProductDetailGuideModal() {
  return <PageGuide title="Hướng dẫn Chỉnh sửa Sản phẩm & Tồn kho" kicker="Product Detail" sections={PRODUCT_DETAIL_SECTIONS} label="Hướng dẫn Chỉnh sửa" />;
}

// ── 5. New Product Guide ────────────────────────────────────────────────────
const NEW_PRODUCT_SECTIONS: GuideSection[] = [
  {
    heading: "Quy trình tạo sản phẩm mới",
    items: [
      {
        type: "steps",
        title: "Tạo sản phẩm Staging",
        when: "Khởi tạo sản phẩm mới hoàn toàn",
        icon: <PlusCircle size={18} color="#0e755e" />,
        steps: [
          "Điền Tên sản phẩm, Slug (đường dẫn chuẩn SEO), Giá gốc",
          "Nhập Thương hiệu, Mô tả, Đường dẫn ảnh (Thumbnail URL)",
          "Khai báo các biến thể (nếu có) và Số lượng tồn ban đầu (Initial stock)",
          "Nhấn 'Save staging draft' để lưu nháp, hoặc 'Publish product now' để đưa thẳng lên Storefront",
        ],
      },
    ],
  },
  {
    heading: "Lưu ý quan trọng về Tồn kho ban đầu",
    items: [
      {
        type: "note",
        text: (
          <>
            <strong>Số lượng tồn ban đầu (Initial stock)</strong> khai báo ở màn hình này CHỈ có hiệu lực <strong>1 LẦN DUY NHẤT</strong> khi xuất bản lần đầu. Sau khi sản phẩm đã được xuất bản (Linked), mọi thay đổi tồn kho về sau bắt buộc phải thực hiện qua <strong>Nhập kho</strong> hoặc <strong>Điều chỉnh tồn kho</strong>.
          </>
        ),
      },
    ],
  },
];

export function NewProductGuideModal() {
  return <PageGuide title="Hướng dẫn Khởi tạo Sản phẩm Mới" kicker="New Staging Product" sections={NEW_PRODUCT_SECTIONS} label="Hướng dẫn Tạo mới" />;
}
