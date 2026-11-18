export interface AdjustmentCatalogVariant {
  id: string;
  variant_name: string;
  stock_quantity: number | null;
}

export interface AdjustmentCatalogProduct {
  id: string;
  name: string;
  slug: string;
  product_type: string;
  stock_quantity: number | null;
  product_variants: AdjustmentCatalogVariant[];
}

export interface AdjustmentItemInput {
  product_id: string;
  product_slug: string;
  product_name: string;
  variant_id: string | null;
  variant_name: string | null;
  current_stock: number;
  adjustment_quantity: number;
  reason: string;
}

export interface AdjustmentCsvIssue {
  row: number;
  field: string;
  message: string;
}

export interface AdjustmentCsvPreview {
  items: AdjustmentItemInput[];
  rowCount: number;
  issues: AdjustmentCsvIssue[];
  warnings: AdjustmentCsvIssue[];
}

export const ADJUSTMENT_CSV_HEADERS = [
  "product_slug",
  "product_name",
  "variant_name",
  "current_stock",
  "adjustment_quantity",
  "reason",
] as const;

type AdjustmentHeader = (typeof ADJUSTMENT_CSV_HEADERS)[number];

function encodeCell(value: string | number): string {
  const str = String(value);
  const safe = /^[\s]*[=+@\-]/.test(str) ? `'${str}` : str;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Generate adjustment CSV template pre-populated with active non-kit products & variants.
 * adjustment_quantity defaults to 0, reason defaults to empty.
 */
export function generateAdjustmentTemplateCsv(
  products: AdjustmentCatalogProduct[]
): string {
  const rows: string[] = [ADJUSTMENT_CSV_HEADERS.join(",")];

  for (const product of products) {
    if (product.product_type === "kit") continue;

    if (product.product_variants && product.product_variants.length > 0) {
      for (const variant of product.product_variants) {
        rows.push(
          [
            encodeCell(product.slug),
            encodeCell(product.name),
            encodeCell(variant.variant_name),
            encodeCell(variant.stock_quantity ?? 0),
            "0",
            "",
          ].join(",")
        );
      }
    } else {
      rows.push(
        [
          encodeCell(product.slug),
          encodeCell(product.name),
          "",
          encodeCell(product.stock_quantity ?? 0),
          "0",
          "",
        ].join(",")
      );
    }
  }

  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

function parseCsvRows(csv: string): string[][] {
  const cleanCsv = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < cleanCsv.length; i += 1) {
    const char = cleanCsv[i];
    if (quoted) {
      if (char === '"' && cleanCsv[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      if (cell.length > 0) throw new Error("Unexpected quote in CSV cell");
      quoted = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, "").trim());
      if (row.some((val) => val.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error("CSV has an unterminated quoted cell");
  row.push(cell.replace(/\r$/, "").trim());
  if (row.some((val) => val.length > 0)) rows.push(row);
  return rows;
}

/**
 * Parse adjustment CSV. adjustment_quantity may be negative (stock reduction).
 * Zero-quantity rows are skipped as warnings.
 */
export function parseAdjustmentCsv(
  csv: string,
  catalogProducts: AdjustmentCatalogProduct[]
): AdjustmentCsvPreview {
  const issues: AdjustmentCsvIssue[] = [];
  const warnings: AdjustmentCsvIssue[] = [];
  let rawRows: string[][];

  try {
    rawRows = parseCsvRows(csv);
  } catch (err) {
    return {
      items: [],
      rowCount: 0,
      issues: [{ row: 0, field: "csv", message: err instanceof Error ? err.message : "Malformed CSV." }],
      warnings: [],
    };
  }

  if (rawRows.length === 0) {
    return {
      items: [],
      rowCount: 0,
      issues: [{ row: 0, field: "csv", message: "CSV file is empty." }],
      warnings: [],
    };
  }

  const headerRow = rawRows[0];
  const slugIdx = headerRow.indexOf("product_slug");
  const qtyIdx = headerRow.indexOf("adjustment_quantity");
  const variantIdx = headerRow.indexOf("variant_name");
  const reasonIdx = headerRow.indexOf("reason");

  if (slugIdx === -1 || qtyIdx === -1) {
    return {
      items: [],
      rowCount: rawRows.length - 1,
      issues: [{ row: 1, field: "header", message: "Thiếu cột bắt buộc: product_slug và adjustment_quantity." }],
      warnings: [],
    };
  }

  const productMap = new Map<string, AdjustmentCatalogProduct>();
  for (const prod of catalogProducts) productMap.set(prod.slug, prod);

  const items: AdjustmentItemInput[] = [];
  const seenKeys = new Set<string>();

  for (let i = 1; i < rawRows.length; i += 1) {
    const row = rawRows[i];
    const rowNum = i + 1;

    const slug = (row[slugIdx] ?? "").trim();
    const variantName = variantIdx !== -1 ? (row[variantIdx] ?? "").trim() : "";
    const qtyStr = (row[qtyIdx] ?? "").trim();
    const reason = reasonIdx !== -1 ? (row[reasonIdx] ?? "").trim().slice(0, 500) : "";

    if (!slug) {
      issues.push({ row: rowNum, field: "product_slug", message: "Product slug không được để trống." });
      continue;
    }

    const product = productMap.get(slug);
    if (!product) {
      issues.push({ row: rowNum, field: "product_slug", message: `Slug "${slug}" không khớp với sản phẩm nào trong Admin.` });
      continue;
    }

    if (product.product_type === "kit") {
      issues.push({ row: rowNum, field: "product_type", message: `"${product.name}" là kit — điều chỉnh từng component thay thế.` });
      continue;
    }

    let matchedVariant: AdjustmentCatalogVariant | null = null;
    const hasVariants = product.product_variants && product.product_variants.length > 0;

    if (hasVariants) {
      if (!variantName) {
        issues.push({
          row: rowNum,
          field: "variant_name",
          message: `"${product.name}" cần tên biến thể. Các tùy chọn: ${product.product_variants.map((v) => `"${v.variant_name}"`).join(", ")}.`,
        });
        continue;
      }
      matchedVariant = product.product_variants.find((v) => v.variant_name.toLowerCase() === variantName.toLowerCase()) ?? null;
      if (!matchedVariant) {
        issues.push({
          row: rowNum,
          field: "variant_name",
          message: `Biến thể "${variantName}" không tồn tại trên "${product.name}". Các tùy chọn: ${product.product_variants.map((v) => `"${v.variant_name}"`).join(", ")}.`,
        });
        continue;
      }
    }

    const dedupeKey = `${product.id}::${matchedVariant?.id ?? "none"}`;
    if (seenKeys.has(dedupeKey)) {
      issues.push({ row: rowNum, field: "duplicate", message: `Trùng lặp: "${product.name}" ${matchedVariant ? `(${matchedVariant.variant_name})` : ""}.` });
      continue;
    }
    seenKeys.add(dedupeKey);

    // Allow negative integers for reduction
    const qty = Number(qtyStr);
    if (!/^-?\d+$/.test(qtyStr) || !Number.isInteger(qty)) {
      issues.push({ row: rowNum, field: "adjustment_quantity", message: `adjustment_quantity phải là số nguyên (âm hoặc dương), nhận được "${qtyStr}".` });
      continue;
    }

    if (qty === 0) {
      warnings.push({ row: rowNum, field: "adjustment_quantity", message: `Dòng cho "${product.name}" có số lượng = 0 (bỏ qua).` });
      continue;
    }

    const currentStock = matchedVariant
      ? Number(matchedVariant.stock_quantity ?? 0)
      : Number(product.stock_quantity ?? 0);

    const projectedStock = currentStock + qty;
    if (projectedStock < 0) {
      warnings.push({
        row: rowNum,
        field: "adjustment_quantity",
        message: `Tồn sau điều chỉnh của "${product.name}"${matchedVariant ? ` (${matchedVariant.variant_name})` : ""} sẽ là ${projectedStock} (âm). Vui lòng kiểm tra lại.`,
      });
    }

    if (!reason) {
      warnings.push({ row: rowNum, field: "reason", message: `Chưa điền lý do điều chỉnh cho "${product.name}". Nên có để Admin duyệt dễ hơn.` });
    }

    items.push({
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      variant_id: matchedVariant?.id ?? null,
      variant_name: matchedVariant?.variant_name ?? null,
      current_stock: currentStock,
      adjustment_quantity: qty,
      reason,
    });
  }

  return { items, rowCount: rawRows.length - 1, issues, warnings };
}
