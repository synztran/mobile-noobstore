import { getAdminClient } from "@/lib/supabase/admin";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

interface GenerateInvoiceInput {
  orderNumber: string;
  customerName: string;
  customerAddress?: string;
  role?: string;
  discount: number;
  discountPercentage?: string;
  shippingFee: number;
  total: number;
  balanceDue?: number;
  items: Array<{
    name: string;
    description?: string[]; // Array of strings for multiline descriptions
    quantity: number;
    unit_cost: number;
    gift_name?: string;
  }>;
}

function resolveFont(rel: string): string | null {
  const root = process.cwd();
  // CWD could be monorepo root or apps/admin
  const candidates = [path.join(root, rel), path.join(root, "apps/admin", rel)];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const REGULAR_PATH = resolveFont("public/fonts/Inter-Regular.ttf");
const BOLD_PATH = resolveFont("public/fonts/Inter-SemiBold.ttf");
const LOGO_PATH = resolveFont("public/fonts/logo.png");

const HAS_FONTS = REGULAR_PATH !== null && BOLD_PATH !== null;

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function generateInvoicePDF(input: GenerateInvoiceInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const font = HAS_FONTS ? "Inter" : "Helvetica";
    const fontBold = HAS_FONTS ? "Inter-Bold" : "Helvetica-Bold";

    if (HAS_FONTS) {
      doc.registerFont("Inter", REGULAR_PATH!);
      doc.registerFont("Inter-Bold", BOLD_PATH!);
    }

    // ── Header: Logo & Company info (Left) ──────────────────────────────────
    let leftY = 50;
    if (LOGO_PATH) {
      doc.image(LOGO_PATH, 50, 40, { width: 120 });
      leftY += 60; // Adjust based on your logo's height
    }

    doc.fontSize(10).fillColor("#666").font(font);
    doc
      .font(fontBold)
      .fillColor("#333")
      .text("NoobStore", 50, leftY + 18);
    doc.font(font).fillColor("#666");
    doc.text(
      "70 Đường 47, phường Hiệp Bình, Thành phố Thủ Đức",
      50,
      leftY + 32
    );
    doc.text("Hồ Chí Minh, Việt Nam 700000", 50, leftY + 46);

    // ── Header: Invoice Title & Number (Right) ──────────────────────────────
    doc.fontSize(28).fillColor("#333").font(fontBold).text("Hóa Đơn", 350, 40, {
      align: "right",
    });
    doc
      .fontSize(11)
      .fillColor("#666")
      .font(font)
      .text(`# ${input.orderNumber}`, 250, 72, {
        align: "right",
        width: 295,
      });

    // ── Invoice Metadata (Right) ────────────────────────────────────────────
    let rightY = 110;
    const addMetaLine = (label: string, value: string) => {
      doc
        .fontSize(10)
        .font(fontBold)
        .fillColor("#777")
        .text(label, 350, rightY, { width: 100, align: "right" });
      doc
        .font(font)
        .fillColor("#111")
        .text(value, 410, rightY, { width: 135, align: "right" });
      const height = doc.heightOfString(value, { width: 135 });
      rightY += height + 8;
    };

    // Calculate dates
    const currentDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(currentDate.getDate() + 31);

    addMetaLine(
      "Ngày lập:",
      currentDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
    addMetaLine("Lập bởi:", "NoobStore");
    addMetaLine(
      "Ngày hết hạn:",
      dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );

    if (input.role) addMetaLine("Role:", input.role);
    if (input.discountPercentage)
      addMetaLine("Discount:", input.discountPercentage);

    // Highlighted Balance Due Background
    doc
      .fillColor("#f3f4f6")
      .rect(350, rightY - 4, 200, 22)
      .fill();
    doc
      .fontSize(10)
      .font(fontBold)
      .fillColor("#111")
      .text("Tổng hóa đơn:", 350, rightY, { width: 110, align: "right" });
    doc.text(formatVND(input.balanceDue || input.total), 410, rightY, {
      width: 135,
      align: "right",
    });

    // ── Customer / Bill To (Left) ───────────────────────────────────────────
    let currentY = Math.max(leftY + 80, rightY + 30);

    doc
      .fontSize(10)
      .fillColor("#777")
      .font(fontBold)
      .text("Gửi đến:", 50, currentY);
    doc.fontSize(10).fillColor("#111").font(fontBold);
    doc.text(input.customerName, 50, currentY + 15);
    if (input.customerAddress) {
      doc.font(font).fillColor("#333");
      doc.text(input.customerAddress, 50, currentY + 30, { width: 250 });
    }

    // ── Items Table ────────────────────────────────────────────────────────
    // Push table further down if customer address wraps
    const tableTop = Math.max(doc.y + 30, 260);

    const cols = [
      { x: 55, w: 220, align: "left" as const, label: "Sản phẩm/Dịch vụ" },
      { x: 280, w: 70, align: "center" as const, label: "Số lượng" },
      { x: 350, w: 85, align: "right" as const, label: "Đơn giá" },
      { x: 440, w: 95, align: "right" as const, label: "Tổng tiền" },
    ];

    // Draw Full Width Table Header Background
    doc
      .fillColor("#333")
      .rect(50, tableTop - 6, 495, 24)
      .fill();

    // Draw Vertical Borders between columns
    doc.lineWidth(1).strokeColor("#555");
    [280, 350, 440].forEach((lineX) => {
      doc
        .moveTo(lineX, tableTop - 6)
        .lineTo(lineX, tableTop + 18)
        .stroke();
    });

    // Table Header Text (White)
    doc.fontSize(10).fillColor("#fff").font(fontBold);
    cols.forEach((c) =>
      doc.text(c.label, c.x, tableTop, { width: c.w, align: c.align })
    );

    // Body rows
    let y = tableTop + 32;

    (input.items ?? []).forEach((item) => {
      if (!item.name && !item.quantity && !item.unit_cost) return;

      doc.fontSize(9).font(fontBold);

      const itemName = item.name || item.gift_name || "";
      const nameHeight = doc.heightOfString(itemName, { width: cols[0].w });

      // Print main item details (using new X coordinates)
      doc.fillColor("#111");
      doc.text(itemName, cols[0].x, y, { width: cols[0].w, align: "left" });

      doc.fontSize(9).font(font).fillColor("#333");
      doc.text(String(item.quantity ?? 0), cols[1].x, y, {
        width: cols[1].w,
        align: "center",
      });
      doc.text(formatVND(item.unit_cost ?? 0), cols[2].x, y, {
        width: cols[2].w,
        align: "right",
      });
      doc.text(
        formatVND((item.unit_cost ?? 0) * (item.quantity ?? 0)),
        cols[3].x,
        y,
        { width: cols[3].w, align: "right" }
      );

      let nextY = y + nameHeight + 6;

      if (item.description && item.description.length > 0) {
        doc.fontSize(9).fillColor("#666");
        item.description.forEach((desc) => {
          doc.text(`- ${desc}`, cols[0].x, nextY, {
            width: cols[0].w,
            align: "left",
          });
          nextY += doc.heightOfString(`- ${desc}`, { width: cols[0].w }) + 4;
        });
      }

      y = nextY + 12;
    });

    // Separator before totals
    y += 10;
    doc.moveTo(280, y).lineTo(545, y).strokeColor("#ddd").lineWidth(1).stroke();
    y += 16;

    // ── Totals (Right Side) ────────────────────────────────────────────────
    const subtotal = (input.items ?? []).reduce(
      (s, i) => s + (i.unit_cost ?? 0) * (i.quantity ?? 0),
      0
    );

    const totals: { label: string; value: string; bold?: boolean }[] = [
      { label: "Tạm tính:", value: formatVND(subtotal) },
    ];
    totals.push({
      label: "Vận chuyển:",
      value: formatVND(input.shippingFee || 0),
    });
    if (input.discount > 0) {
      totals.push({
        label: `Giảm giá (${input.discountPercentage || "₫"}):`,
        value: `-${formatVND(input.discount)}`,
      });
    }
    totals.push({ label: "Thuế (0%):", value: "0 ₫" });
    totals.push({
      label: "Tổng tiền:",
      value: formatVND(input.total),
      bold: true,
    });

    totals.forEach((t) => {
      doc
        .font(t.bold ? fontBold : font)
        .fontSize(t.bold ? 11 : 9)
        .fillColor(t.bold ? "#111" : "#555");

      doc.text(t.label, 300, y, { width: 120, align: "right" });
      doc.text(t.value, 430, y, { width: 105, align: "right" });
      y += t.bold ? 22 : 18;
    });

    // ── Footer Notes & Terms (Bottom Left) ─────────────────────────────────
    let footerY = Math.max(y + 30, 620);

    doc
      .fontSize(10)
      .fillColor("#111")
      .font(fontBold)
      .text("Ghi chú:", 50, footerY);
    doc
      .fontSize(9)
      .fillColor("#666")
      .font(font)
      .text("Hóa đơn được tạo từ động từ hệ thống NoobStore", 50, footerY + 14);

    footerY += 40;

    doc
      .fontSize(10)
      .fillColor("#111")
      .font(fontBold)
      .text("Điều khoản:", 50, footerY);
    doc.fontSize(9).fillColor("#666").font(font);
    doc.text(
      "Đơn hàng đã thanh toán sẽ không hỗ trợ hoàn tiền.",
      50,
      footerY + 14
    );

    doc.end();
  });
}

export async function generateAndStoreInvoice(
  orderId: string,
  input: GenerateInvoiceInput
): Promise<string | null> {
  try {
    // Check if invoice already exists
    const supabase = getAdminClient();
    const bucket = "invoices";
    const storagePath = `${input.orderNumber}.pdf`;

    const { data: existing } = await supabase.storage
      .from(bucket)
      .list("", { search: input.orderNumber });
    if (existing?.length) {
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);
      return urlData.publicUrl;
    }

    // Generate PDF locally
    const pdfBuffer = await generateInvoicePDF(input);

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === bucket);
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(
        bucket,
        { public: true }
      );
      if (createError) {
        console.error(
          `[invoice] Failed to create bucket: ${createError.message}`
        );
        return null;
      }
    }

    // Upload PDF
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error(`[invoice] Upload error: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);
    const invoiceUrl = urlData.publicUrl;

    // Update order with invoice URL
    const { error: updateError } = await supabase
      .from("orders")
      .update({ invoice_url: invoiceUrl })
      .eq("id", orderId);

    if (updateError) {
      console.error(`[invoice] Failed to update order: ${updateError.message}`);
    }

    return invoiceUrl;
  } catch (err) {
    console.error("[invoice] Unexpected error:", err);
    return null;
  }
}
