export interface InboundCatalogVariant {
  id: string;
  variant_name: string;
  stock_quantity: number | null;
}

export interface InboundCatalogProduct {
  id: string;
  name: string;
  slug: string;
  product_type: string;
  stock_quantity: number | null;
  product_variants: InboundCatalogVariant[];
}

export interface InboundItemInput {
  product_id: string;
  product_slug: string;
  product_name: string;
  variant_id: string | null;
  variant_name: string | null;
  current_stock: number;
  inbound_quantity: number;
  input_price: number;
  total_cost: number;
}

export interface InboundCsvIssue {
  row: number;
  field: string;
  message: string;
}

export interface InboundCsvPreview {
  items: InboundItemInput[];
  totalQuantity: number;
  totalCost: number;
  rowCount: number;
  issues: InboundCsvIssue[];
  warnings: InboundCsvIssue[];
}

export const INBOUND_CSV_HEADERS = [
  "product_slug",
  "product_name",
  "variant_name",
  "current_stock",
  "inbound_quantity",
  "input_price",
] as const;

type InboundHeader = (typeof INBOUND_CSV_HEADERS)[number];

function encodeCell(value: string | number): string {
  const str = String(value);
  const safe = /^[\s]*[=+@\-]/.test(str) ? `'${str}` : str;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Generate CSV template pre-populated with active non-kit products & variants.
 * Non-kit products with variants produce 1 row per variant.
 * Products without variants produce 1 row with an empty variant_name.
 */
export function generateInboundTemplateCsv(
  products: InboundCatalogProduct[]
): string {
  const rows: string[] = [INBOUND_CSV_HEADERS.join(",")];

  for (const product of products) {
    // Kits derive stock from components — never inbound kit rows directly.
    if (product.product_type === "kit") continue;

    if (product.product_variants && product.product_variants.length > 0) {
      for (const variant of product.product_variants) {
        const row = [
          encodeCell(product.slug),
          encodeCell(product.name),
          encodeCell(variant.variant_name),
          encodeCell(variant.stock_quantity ?? 0),
          "0",
          "0",
        ];
        rows.push(row.join(","));
      }
    } else {
      const row = [
        encodeCell(product.slug),
        encodeCell(product.name),
        "",
        encodeCell(product.stock_quantity ?? 0),
        "0",
        "0",
      ];
      rows.push(row.join(","));
    }
  }

  // Prepend UTF-8 BOM so Excel on Windows opens Vietnamese product names correctly
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

function parseCsvRows(csv: string): string[][] {
  // Strip optional UTF-8 BOM
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
 * Parse an uploaded inbound CSV against canonical Admin products and variants.
 * Matches rows by product_slug + variant_name.
 */
export function parseInboundCsv(
  csv: string,
  catalogProducts: InboundCatalogProduct[]
): InboundCsvPreview {
  const issues: InboundCsvIssue[] = [];
  const warnings: InboundCsvIssue[] = [];
  let rawRows: string[][];

  try {
    rawRows = parseCsvRows(csv);
  } catch (err) {
    return {
      items: [],
      totalQuantity: 0,
      totalCost: 0,
      rowCount: 0,
      issues: [
        {
          row: 0,
          field: "csv",
          message: err instanceof Error ? err.message : "Malformed CSV.",
        },
      ],
      warnings: [],
    };
  }

  if (rawRows.length === 0) {
    return {
      items: [],
      totalQuantity: 0,
      totalCost: 0,
      rowCount: 0,
      issues: [{ row: 0, field: "csv", message: "CSV file is empty." }],
      warnings: [],
    };
  }

  const headerRow = rawRows[0];
  const slugIdx = headerRow.indexOf("product_slug");
  const qtyIdx = headerRow.indexOf("inbound_quantity");
  const variantIdx = headerRow.indexOf("variant_name");
  let priceIdx = headerRow.indexOf("input_price");
  if (priceIdx === -1) priceIdx = headerRow.indexOf("unit_cost");
  if (priceIdx === -1) priceIdx = headerRow.indexOf("import_price");

  if (slugIdx === -1 || qtyIdx === -1) {
    return {
      items: [],
      totalQuantity: 0,
      totalCost: 0,
      rowCount: rawRows.length - 1,
      issues: [
        {
          row: 1,
          field: "header",
          message:
            "Missing required headers: product_slug and inbound_quantity are required.",
        },
      ],
      warnings: [],
    };
  }

  // Build lookup map by product slug
  const productMap = new Map<string, InboundCatalogProduct>();
  for (const prod of catalogProducts) {
    productMap.set(prod.slug, prod);
  }

  const items: InboundItemInput[] = [];
  const seenKeys = new Set<string>();
  let totalQuantity = 0;
  let totalCost = 0;

  for (let i = 1; i < rawRows.length; i += 1) {
    const row = rawRows[i];
    const rowNum = i + 1; // 1-indexed for human readability

    const slug = (row[slugIdx] ?? "").trim();
    const variantName = variantIdx !== -1 ? (row[variantIdx] ?? "").trim() : "";
    const qtyStr = (row[qtyIdx] ?? "").trim();

    if (!slug) {
      issues.push({
        row: rowNum,
        field: "product_slug",
        message: "Product slug cannot be empty.",
      });
      continue;
    }

    const product = productMap.get(slug);
    if (!product) {
      issues.push({
        row: rowNum,
        field: "product_slug",
        message: `Product slug "${slug}" does not match any product in Admin catalog.`,
      });
      continue;
    }

    if (product.product_type === "kit") {
      issues.push({
        row: rowNum,
        field: "product_type",
        message: `Product "${product.name}" is a kit. Kit stock is derived from its components; inbound components instead.`,
      });
      continue;
    }

    let matchedVariant: InboundCatalogVariant | null = null;
    const hasVariants = product.product_variants && product.product_variants.length > 0;

    if (hasVariants) {
      if (!variantName) {
        issues.push({
          row: rowNum,
          field: "variant_name",
          message: `Product "${product.name}" requires a variant name. Options: ${product.product_variants
            .map((v) => `"${v.variant_name}"`)
            .join(", ")}.`,
        });
        continue;
      }

      matchedVariant =
        product.product_variants.find(
          (v) => v.variant_name.toLowerCase() === variantName.toLowerCase()
        ) ?? null;

      if (!matchedVariant) {
        issues.push({
          row: rowNum,
          field: "variant_name",
          message: `Variant "${variantName}" not found on product "${product.name}". Options: ${product.product_variants
            .map((v) => `"${v.variant_name}"`)
            .join(", ")}.`,
        });
        continue;
      }
    }

    // Check duplicate rows in the same CSV
    const dedupeKey = `${product.id}::${matchedVariant?.id ?? "none"}`;
    if (seenKeys.has(dedupeKey)) {
      issues.push({
        row: rowNum,
        field: "duplicate",
        message: `Duplicate item in batch: "${product.name}" ${matchedVariant ? `(${matchedVariant.variant_name})` : ""}.`,
      });
      continue;
    }
    seenKeys.add(dedupeKey);

    // Validate inbound quantity
    const qty = Number(qtyStr);
    if (!/^\d+$/.test(qtyStr) || !Number.isInteger(qty) || qty < 0) {
      issues.push({
        row: rowNum,
        field: "inbound_quantity",
        message: `Inbound quantity must be a non-negative whole number, got "${qtyStr}".`,
      });
      continue;
    }

    if (qty === 0) {
      warnings.push({
        row: rowNum,
        field: "inbound_quantity",
        message: `Row for "${product.name}" has 0 quantity (skipped).`,
      });
      continue;
    }

    // Validate input_price
    let inputPrice = 0;
    if (priceIdx !== -1) {
      const priceStr = (row[priceIdx] ?? "").trim();
      if (priceStr !== "") {
        const parsedPrice = Number(priceStr);
        if (
          !/^\d+(\.\d+)?$/.test(priceStr) ||
          !Number.isFinite(parsedPrice) ||
          parsedPrice < 0
        ) {
          issues.push({
            row: rowNum,
            field: "input_price",
            message: `Giá nhập (input_price) phải là số không âm hợp lệ, nhận được "${priceStr}".`,
          });
          continue;
        }
        inputPrice = parsedPrice;
      }
    }

    if (inputPrice === 0) {
      warnings.push({
        row: rowNum,
        field: "input_price",
        message: `Giá nhập bằng 0 ₫ cho sản phẩm "${product.name}".`,
      });
    }

    const lineTotalCost = qty * inputPrice;
    const currentStock = matchedVariant
      ? Number(matchedVariant.stock_quantity ?? 0)
      : Number(product.stock_quantity ?? 0);

    items.push({
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      variant_id: matchedVariant?.id ?? null,
      variant_name: matchedVariant?.variant_name ?? null,
      current_stock: currentStock,
      inbound_quantity: qty,
      input_price: inputPrice,
      total_cost: lineTotalCost,
    });

    totalQuantity += qty;
    totalCost += lineTotalCost;
  }

  return {
    items,
    totalQuantity,
    totalCost,
    rowCount: rawRows.length - 1,
    issues,
    warnings,
  };
}
