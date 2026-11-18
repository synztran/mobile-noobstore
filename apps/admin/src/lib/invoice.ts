import { getAdminClient } from "@/lib/supabase/admin";
import { buildCustomerAddress } from "@/lib/order-address";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
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
  balanceDue?: number; // header "Cần thanh toán" — current outstanding balance
  paidAmount?: number; // amount actually received; defaults to the existing order invoice behavior
  codAmount?: number; // totals "Còn lại (COD)" — the order's original COD amount, never touched by settlement (falls back to balanceDue)
  paymentType?: "full" | "deposit_cod";
  depositPercentage?: number;
  depositAmount?: number;
  items: Array<{
    name: string;
    description?: string[]; // Array of strings for multiline descriptions
    components?: Array<{
      component_group: string;
      variant_name: string;
    }>;
    quantity: number;
    unit_cost: number;
    gift_name?: string;
  }>;
}

/**
 * Order columns the invoice reads. Every call site must select at least these —
 * buildInvoiceInput below is the single place that decides how an order's money
 * fields become invoice rows.
 */
export type InvoiceOrderRow = {
  order_number: string;
  status: string | null;
  payment_type: string | null;
  shipping_fee: number | null;
  shipping_discount_amount: number | null;
  voucher_discount_amount: number | null;
  total_price: number;
  deposit_percentage: number | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  delivery_address: unknown;
  shipping_method_id: string | null;
};

export type InvoiceItem = GenerateInvoiceInput["items"][number];

/**
 * Map an order row onto invoice money fields.
 *
 * This is deliberately the only place the discount columns are read. The PDF's
 * "Giảm giá" row is a single line that must total BOTH the voucher discount and
 * the shipping discount — otherwise "Tạm tính + Vận chuyển − Giảm giá" stops
 * reconciling with "Tổng tiền", which is the arithmetic the customer checks
 * against their own bank transfer.
 */
export function buildInvoiceInput(
  order: InvoiceOrderRow,
  opts: { customerName: string; items: InvoiceItem[]; settled?: boolean }
): GenerateInvoiceInput {
  const codAmount = Number(order.remaining_amount ?? 0);
  return {
    orderNumber: order.order_number,
    customerName: opts.customerName,
    customerAddress: buildCustomerAddress(
      order.delivery_address,
      order.shipping_method_id
    ),
    items: opts.items,
    shippingFee: Number(order.shipping_fee ?? 0),
    discount:
      Number(order.shipping_discount_amount ?? 0) +
      Number(order.voucher_discount_amount ?? 0),
    total: Number(order.total_price),
    paymentType:
      (order.payment_type as "full" | "deposit_cod" | null) ?? undefined,
    depositPercentage: order.deposit_percentage ?? undefined,
    depositAmount: order.deposit_amount ?? undefined,
    // Header "Cần thanh toán" is what is still owed, zeroed once settled. The
    // totals "Còn lại (COD)" row uses codAmount and is deliberately never zeroed
    // — it records the COD the order was created with.
    balanceDue: opts.settled ? 0 : codAmount,
    codAmount,
  };
}

/**
 * Load an order's invoice line items: order_items plus any order_services folded
 * in as single-quantity lines. Shared so a settled regeneration cannot silently
 * drop a service line that the initial invoice had.
 */
export async function fetchInvoiceItems(orderId: string): Promise<InvoiceItem[]> {
  const supabase = getAdminClient();

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "product_name, quantity, unit_price, order_item_components(component_group, variant_name)"
    )
    .eq("order_id", orderId);

  const { data: services } = await supabase
    .from("order_services")
    .select("service_name, price")
    .eq("order_id", orderId);

  const lines: InvoiceItem[] = (items ?? []).map((i) => ({
    name: i.product_name,
    quantity: i.quantity,
    unit_cost: Number(i.unit_price),
    components: (i.order_item_components ?? []).map(
      (c: { component_group: string; variant_name: string }) => ({
        component_group: c.component_group,
        variant_name: c.variant_name,
      })
    ),
  }));

  for (const s of services ?? []) {
    lines.push({
      name: `Dịch vụ: ${s.service_name}`,
      quantity: 1,
      unit_cost: Number(s.price),
      components: [],
    });
  }

  return lines;
}

function resolveFont(rel: string): string | null {
  const root = process.cwd();
  const candidates = [path.join(root, rel), path.join(root, "apps/admin", rel)];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function isValidFont(fp: string): boolean {
  try {
    const buf = fs.readFileSync(fp);
    // TTF: 0x00010000, OTF: "OTTO"
    const magic = buf.readUInt32BE(0);
    return magic === 0x00010000 || magic === 0x4f54544f;
  } catch {
    return false;
  }
}

const REGULAR_PATH = resolveFont("public/fonts/Nunito-Regular.ttf");
const BOLD_PATH = resolveFont("public/fonts/Nunito-SemiBold.ttf");
const LOGO_PATH = resolveFont("public/fonts/logo.png");

const HAS_FONTS =
  REGULAR_PATH !== null &&
  BOLD_PATH !== null &&
  isValidFont(REGULAR_PATH) &&
  isValidFont(BOLD_PATH);

function formatVND(amount: number): string {
  const intPart = Math.round(Math.abs(amount));
  const sign = amount < 0 ? "-" : "";
  const formatted = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${formatted} ₫`;
}

function generateInvoicePDF(input: GenerateInvoiceInput): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const paidAmount = Math.min(
      Math.max(
        0,
        input.paidAmount ??
          (input.paymentType === "deposit_cod"
            ? input.depositAmount ?? 0
            : input.total)
      ),
      Math.max(0, input.total)
    );
    const outstandingBalance = Math.min(
      Math.max(0, input.balanceDue ?? input.total - paidAmount),
      Math.max(0, input.total)
    );
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const font = HAS_FONTS ? "Nunito" : "Helvetica";
    const fontBold = HAS_FONTS ? "Nunito-Bold" : "Helvetica-Bold";

    if (HAS_FONTS) {
      doc.registerFont("Nunito", REGULAR_PATH!);
      doc.registerFont("Nunito-Bold", BOLD_PATH!);
    }

    // ── Barcode ────────────────────────────────────────────────────────────
    const barcodeBuf = await bwipjs
      .toBuffer({
        bcid: "code128",
        text: input.orderNumber,
        scaleX: 1,
        scaleY: 1,
        height: 12,
        includetext: false,
        paddingwidth: 5,
        paddingheight: 3,
      })
      .catch(() => null);

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

    // ── Header: Invoice Title & Barcode (Right) ────────────────────────────
    doc.fontSize(28).fillColor("#333").font(fontBold).text("Hóa Đơn", 350, 40, {
      align: "right",
      width: 195,
    });
    if (barcodeBuf) {
      doc.image(barcodeBuf, 425, 75, { width: 120 });
      // doc.fontSize(10).fillColor("#555").font(font).text(`#${input.orderNumber}`, 350, 96, {
      //   align: "right",
      //   width: 195,
      // });
    }

    // ── Invoice Metadata (Right) ────────────────────────────────────────────
    let rightY = 130;
    const addMetaLine = (label: string, value: string) => {
      doc
        .fontSize(10)
        .font(fontBold)
        .fillColor("#777")
        .text(label, 300, rightY, { width: 100, align: "right" });
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

    const fmtDate = (d: Date) =>
      `${d.getDate().toString().padStart(2, "0")} tháng ${(d.getMonth() + 1).toString().padStart(2, "0")}, ${d.getFullYear()}`;

    addMetaLine("Đơn hàng:", `#${input.orderNumber}`);
    addMetaLine("Ngày lập:", fmtDate(currentDate));
    addMetaLine("Lập bởi:", "NoobStore");
    addMetaLine("Ngày hết hạn:", fmtDate(dueDate));

    if (input.role) addMetaLine("Role:", input.role);
    if (input.discountPercentage)
      addMetaLine("Discount:", input.discountPercentage);

    // Highlighted Balance Due Background
    doc
      .fillColor("#f3f4f6")
      .rect(320, rightY - 4, 230, 22)
      .fill();
    doc
      .fontSize(10)
      .font(fontBold)
      .fillColor("#111")
      .text("Cần thanh toán:", 290, rightY, { width: 110, align: "right" });
    // doc.text(formatVND(input.shippingFee), 410, rightY, {
    //   width: 135,
    //   align: "right",
    // });
    doc.text(formatVND(outstandingBalance), 410, rightY, {
      width: 135,
      align: "right",
    });

    // ── Customer / Bill To (Left) ───────────────────────────────────────────
    let currentY = Math.max(leftY, rightY);

    doc
      .fontSize(10)
      .fillColor("#777")
      .font(fontBold)
      .text("Gửi đến:", 50, currentY);
    doc.fontSize(10).fillColor("#111").font(fontBold);
    doc.text(input.customerName, 50, currentY + 15);
    if (input.customerAddress) {
      doc.font(font).fillColor("#666");
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
    let y = tableTop + 26;

    (input?.items ?? []).forEach((item) => {
      if (!item?.name && !item?.quantity && !item?.unit_cost) return;

      doc.fontSize(12).font(fontBold);

      const itemName = item.name || item.gift_name || "";
      const nameHeight = doc.heightOfString(itemName, { width: cols[0].w });

      // Print main item details (using new X coordinates)
      doc.fillColor("#111");
      doc.text(itemName, cols[0].x, y, { width: cols[0].w, align: "left" });

      doc.fontSize(12).font(font).fillColor("#333");
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

      if (item.components && item.components.length > 0) {
        doc.fontSize(10).fillColor("#777").font(font);
        item.components.forEach((comp, ci) => {
          const line = `${comp.component_group}: ${comp.variant_name}`;
          doc.text(line, cols[0].x + 8, nextY, {
            width: cols[0].w - 8,
            align: "left",
          });
          nextY += doc.heightOfString(line, { width: cols[0].w - 8 }) + 2;
          if (ci < item.components!.length - 1) nextY += 4;
        });
        nextY += 4;
        doc.font(fontBold);
      }

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
    const subtotal = (input?.items ?? []).reduce(
      (s, i) => s + (i?.unit_cost ?? 0) * (i?.quantity ?? 0),
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
    if (input.paymentType === "deposit_cod") {
      totals.push({
        label: `Đã thanh toán (${input.depositPercentage ?? 0}%):`,
        value: formatVND(paidAmount),
        bold: true,
      });
      totals.push({
        label: "Còn lại (COD):",
        // Preserve the original COD amount even when the outstanding balance
        // reaches zero; legacy callers fall back to their balanceDue value.
        value: formatVND(
          input.codAmount ??
            input.balanceDue ??
            Math.max(0, input.total - paidAmount)
        ),
        bold: true,
      });
    } else {
      totals.push({
        label: "Đã thanh toán:",
        value: formatVND(paidAmount),
        bold: true,
      });
    }

    totals.forEach((t) => {
      doc
        .font(t.bold ? fontBold : font)
        .fontSize(t.bold ? 11 : 9)
        .fillColor(t.bold ? "#111" : "#555");

      doc.text(t.label, 300, y, { width: 120, align: "right" });
      doc.text(t.value, 430, y, { width: 105, align: "right" });
      y += t.bold ? 22 : 18;
    });

    // ── Customer Signature (Bottom Right) ──────────────────────────────────
    const sigY = Math.max(y + 30, 620) + 45;
    doc
      .fontSize(10)
      .fillColor("#111")
      .font(fontBold)
      .text("Chữ ký xác nhận khách hàng:", 350, sigY - 80, {
        align: "right",
        width: 195,
      });
    doc
      .fontSize(9)
      .fillColor("#666")
      .font(font)
      .text("(Ký, ghi rõ họ tên)", 350, sigY + 14 - 80, {
        align: "right",
        width: 195,
      });
    doc
      .moveTo(350, sigY + 40)
      .lineTo(545, sigY + 40)
      .strokeColor("#ccc")
      .lineWidth(1)
      .stroke();

    // ── Footer Notes & Terms (Bottom Left) ─────────────────────────────────
    let footerY = Math.max(y, 620);

    doc
      .fontSize(10)
      .fillColor("#111")
      .font(fontBold)
      .text("Ghi chú:", 50, footerY);
    doc
      .fontSize(9)
      .fillColor("#666")
      .font(font)
      .text(
        "Bằng việc ký xác nhận bên cạnh. Quý khách xác nhận đã kiểm tra và đồng ý với tình trạng ngoại quan cũng như chức năng của (các) sản phẩm trong đơn hàng.",
        50,
        footerY + 14,
        { width: 260 }
      );

    footerY += 60;

    doc
      .fontSize(10)
      .fillColor("#111")
      .font(fontBold)
      .text("Điều khoản:", 50, footerY);
    doc.fontSize(9).fillColor("#666").font(font);
    doc.text("Đơn hàng không hỗ trợ hoàn tiền sau 3 ngày.", 50, footerY + 14);

    doc.end();
  });
}

export async function generateAndStoreInvoice(
  orderId: string,
  input: GenerateInvoiceInput,
  opts?: { force?: boolean }
): Promise<string | null> {
  try {
    // Check if invoice already exists (unless forcing a regeneration)
    const supabase = getAdminClient();
    const bucket = "invoices";
    const storagePath = `${input.orderNumber}.pdf`;

    if (!opts?.force) {
      const { data: existing } = await supabase.storage
        .from(bucket)
        .list("", { search: input.orderNumber });
      if (existing?.length) {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath);
        return urlData.publicUrl;
      }
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

/**
 * Regenerate the invoice for an order that reached "delivered". The template
 * is unchanged and only the "Cần thanh toán" amount changes: it is zeroed to
 * reflect full settlement. The "Còn lại (COD)" row is left untouched — it keeps
 * the COD amount the order was created with (orders.remaining_amount), so the
 * document still shows what was originally due on delivery.
 * Force-overwrites the existing PDF so the stored invoice_url stays valid.
 */
export async function regenerateSettledInvoice(orderId: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    const { data: order } = await supabase
      .from("orders")
      .select(
        "order_number, status, payment_type, shipping_fee, shipping_discount_amount, voucher_discount_amount, delivery_address, shipping_method_id, total_price, deposit_percentage, deposit_amount, remaining_amount"
      )
      .eq("id", orderId)
      .single();

    if (!order || !order.delivery_address) return;

    const items = await fetchInvoiceItems(orderId);

    const addr = order.delivery_address as Record<string, string | null>;
    const customerName = [addr.full_name, addr.phone_number]
      .filter(Boolean)
      .join(" - ");

    await generateAndStoreInvoice(
      orderId,
      buildInvoiceInput(order as InvoiceOrderRow, {
        customerName: customerName || "Khách hàng",
        items,
        settled: true,
      }),
      { force: true }
    );
  } catch (err) {
    console.error(
      `[invoice] Failed to regenerate settled invoice for order ${orderId}:`,
      err
    );
  }
}
