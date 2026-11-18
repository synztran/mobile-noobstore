import type { CsvImportIssue, CsvImportPreview, JsonValue, WarehouseProductInput, WarehouseVariantInput } from "./types";

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_ROWS = 1000;

const HEADERS = [
  "warehouse_schema_version",
  "warehouse_id",
  "admin_product_id",
  "name",
  "slug",
  "product_type",
  "base_price",
  "max_quantity",
  "is_active",
  "brand",
  "description",
  "thumbnail",
  "images_json",
  "attributes_json",
  "category_id",
  "is_used",
  "is_pre_order",
  "admin_variant_id",
  "variant_name",
  "price_adjustment",
  "variant_attributes_json",
  "initial_stock",
] as const;

type Header = (typeof HEADERS)[number];
type RawRow = Record<Header, string>;

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
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
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("CSV has an unterminated quoted cell");
  row.push(cell.replace(/\r$/, ""));
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function parseBoolean(value: string, row: number, field: string, issues: CsvImportIssue[], fallback: boolean | null): boolean | null {
  if (value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  issues.push({ row, field, message: "Use true or false." });
  return fallback;
}

function parseNumber(value: string, row: number, field: string, issues: CsvImportIssue[], options: { nullable?: boolean; integer?: boolean; nonNegative?: boolean } = {}): number | null {
  if (value === "" && options.nullable) return null;
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    issues.push({ row, field, message: "Enter a valid number." });
    return options.nullable ? null : 0;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (options.integer && !Number.isInteger(number)) || (options.nonNegative && number < 0)) {
    issues.push({ row, field, message: options.integer ? "Enter a non-negative whole number." : "Enter a non-negative finite number." });
    return options.nullable ? null : 0;
  }
  return number;
}

function parseJson(value: string, row: number, field: string, issues: CsvImportIssue[]): JsonValue | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean" || Array.isArray(parsed) || typeof parsed === "object") return parsed as JsonValue;
  } catch {
    // Report below; malformed JSON is never silently coerced.
  }
  issues.push({ row, field, message: "Enter valid JSON or leave this field blank." });
  return null;
}

function cell(row: string[], headerIndex: number): string {
  return row[headerIndex] ?? "";
}

export function parseWarehouseCsv(csv: string): CsvImportPreview {
  const issues: CsvImportIssue[] = [];
  const warnings: CsvImportIssue[] = [];
  const products = new Map<string, WarehouseProductInput>();
  let rows: string[][];
  try {
    rows = parseRows(csv.replace(/^\uFEFF/, ""));
  } catch (error) {
    return { products: [], rowCount: 0, issues: [{ row: 0, field: "file", message: error instanceof Error ? error.message : "Malformed CSV." }], warnings };
  }
  if (rows.length < 2) return { products: [], rowCount: 0, issues: [{ row: 1, field: "header", message: "CSV must include a header and at least one product row." }], warnings };
  if (rows.length - 1 > MAX_CSV_ROWS) return { products: [], rowCount: rows.length - 1, issues: [{ row: 0, field: "file", message: `Limit the import to ${MAX_CSV_ROWS} rows.` }], warnings };

  const header = rows[0].map((value) => value.trim()) as Header[];
  if (header.length !== HEADERS.length || HEADERS.some((expected, index) => header[index] !== expected)) {
    return { products: [], rowCount: rows.length - 1, issues: [{ row: 1, field: "header", message: "CSV header does not match warehouse schema version 1. Download the current template." }], warnings };
  }
  const index = Object.fromEntries(header.map((name, i) => [name, i])) as Record<Header, number>;
  const slugToKey = new Map<string, string>();
  const variantKeys = new Set<string>();

  rows.slice(1).forEach((raw, rowOffset) => {
    const rowNumber = rowOffset + 2;
    if (raw.length > header.length) {
      issues.push({ row: rowNumber, field: "row", message: "This row has more cells than the header." });
      return;
    }
    const get = (key: Header) => cell(raw, index[key]);
    if (get("warehouse_schema_version") !== "1") issues.push({ row: rowNumber, field: "warehouse_schema_version", message: "Expected schema version 1." });
    const name = get("name").trim();
    const slug = get("slug").trim();
    if (!name || name.length > 200) issues.push({ row: rowNumber, field: "name", message: "Product name is required and must be at most 200 characters." });
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) issues.push({ row: rowNumber, field: "slug", message: "Use a lowercase URL slug with letters, numbers, and hyphens." });
    if (get("product_type") !== "standard") issues.push({ row: rowNumber, field: "product_type", message: "Only standard products can be imported." });
    const basePrice = parseNumber(get("base_price"), rowNumber, "base_price", issues, { nonNegative: true }) ?? 0;
    const maxQuantity = parseNumber(get("max_quantity"), rowNumber, "max_quantity", issues, { nullable: true, integer: true, nonNegative: true });
    const isActive = parseBoolean(get("is_active"), rowNumber, "is_active", issues, false) ?? false;
    const isUsed = parseBoolean(get("is_used"), rowNumber, "is_used", issues, null);
    const isPreOrder = parseBoolean(get("is_pre_order"), rowNumber, "is_pre_order", issues, false) ?? false;
    const images = parseJson(get("images_json"), rowNumber, "images_json", issues);
    const attributes = parseJson(get("attributes_json"), rowNumber, "attributes_json", issues);
    const variantAttributes = parseJson(get("variant_attributes_json"), rowNumber, "variant_attributes_json", issues);
    const priceAdjustment = parseNumber(get("price_adjustment"), rowNumber, "price_adjustment", issues, { nullable: true });
    const initialStock = parseNumber(get("initial_stock") || "0", rowNumber, "initial_stock", issues, { integer: true, nonNegative: true }) ?? 0;
    const variantName = get("variant_name").trim();
    const warehouseId = get("warehouse_id").trim();
    const key = warehouseId ? `id:${warehouseId}` : `slug:${slug}`;

    if (!variantName && get("admin_variant_id")) issues.push({ row: rowNumber, field: "variant_name", message: "A linked variant needs a variant name." });
    if (variantName && variantName.length > 200) issues.push({ row: rowNumber, field: "variant_name", message: "Variant name must be at most 200 characters." });
    if (variantName) {
      const variantKey = `${key}:${variantName.toLowerCase()}`;
      if (variantKeys.has(variantKey)) issues.push({ row: rowNumber, field: "variant_name", message: "Duplicate variant name for this product." });
      variantKeys.add(variantKey);
    }
    const previousKey = slugToKey.get(slug);
    if (previousKey && previousKey !== key) issues.push({ row: rowNumber, field: "slug", message: "Two different products use the same slug." });
    slugToKey.set(slug, key);

    const candidate: WarehouseProductInput = {
      name,
      slug,
      product_type: "standard",
      base_price: basePrice,
      max_quantity: maxQuantity,
      is_active: isActive,
      brand: get("brand") || null,
      description: get("description") || null,
      thumbnail: get("thumbnail") || null,
      images,
      attributes,
      category_id: get("category_id") || null,
      is_used: isUsed,
      is_pre_order: isPreOrder,
      initial_stock: variantName ? 0 : initialStock,
      variants: [],
      warehouse_id: warehouseId || undefined,
      admin_product_id: get("admin_product_id") || null,
    };
    const existing = products.get(key);
    if (existing) {
      const { variants: _a, ...candidateProduct } = candidate;
      const { variants: _b, ...existingProduct } = existing;
      const comparableCandidate = { ...candidateProduct, initial_stock: existingProduct.initial_stock };
      if (JSON.stringify(comparableCandidate) !== JSON.stringify(existingProduct)) issues.push({ row: rowNumber, field: "product", message: "Repeated product fields must match on every variant row." });
    } else {
      products.set(key, candidate);
    }
    if (variantName) {
      const variant: WarehouseVariantInput = {
        variant_name: variantName,
        price_adjustment: priceAdjustment,
        attributes: variantAttributes,
        initial_stock: initialStock,
        ...(get("admin_variant_id") ? { admin_variant_id: get("admin_variant_id") } : {}),
      };
      products.get(key)?.variants.push(variant);
    } else if (get("price_adjustment") || get("variant_attributes_json") || get("admin_variant_id")) {
      issues.push({ row: rowNumber, field: "variant_name", message: "Variant fields require a variant name." });
    }
  });

  const slugs = new Set<string>();
  for (const [key, product] of products) {
    if (slugs.has(product.slug) && !key.startsWith("slug:")) issues.push({ row: 0, field: "slug", message: `Duplicate slug ${product.slug}.` });
    slugs.add(product.slug);
  }
  if (issues.length === 0 && rows.length > 1) warnings.push({ row: 0, field: "stock", message: "Stock values are initial quantities for new products only; linked product stock is never updated." });
  return { products: [...products.values()], rowCount: rows.length - 1, issues, warnings };
}

function encodeCell(value: string): string {
  const safe = /^[\s]*[=+@\-]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const blankProduct: WarehouseProductInput = {
  name: "", slug: "", product_type: "standard", base_price: 0,
  max_quantity: null, is_active: false, brand: null, description: null,
  thumbnail: null, images: null, attributes: null, category_id: null,
  is_used: null, is_pre_order: false, initial_stock: 0, variants: [],
};

export function warehouseCsvTemplate(): string {
  return `${HEADERS.join(",")}\n`;
}

export function serializeWarehouseCsv(products: WarehouseProductInput[]): string {
  const rows = [HEADERS.join(",")];
  for (const product of products) {
    const variants: Array<WarehouseVariantInput | null> = product.variants.length ? product.variants : [null];
    for (const variant of variants) {
      const values: Record<Header, string> = {
        warehouse_schema_version: "1",
        warehouse_id: product.warehouse_id ?? "",
        admin_product_id: product.admin_product_id ?? "",
        name: product.name,
        slug: product.slug,
        product_type: "standard",
        base_price: String(product.base_price),
        max_quantity: product.max_quantity === null ? "" : String(product.max_quantity),
        is_active: String(product.is_active),
        brand: product.brand ?? "",
        description: product.description ?? "",
        thumbnail: product.thumbnail ?? "",
        images_json: product.images === null ? "" : JSON.stringify(product.images),
        attributes_json: product.attributes === null ? "" : JSON.stringify(product.attributes),
        category_id: product.category_id ?? "",
        is_used: product.is_used === null ? "" : String(product.is_used),
        is_pre_order: String(product.is_pre_order),
        admin_variant_id: variant?.admin_variant_id ?? "",
        variant_name: variant?.variant_name ?? "",
        price_adjustment: variant?.price_adjustment == null ? "" : String(variant.price_adjustment),
        variant_attributes_json: variant?.attributes == null ? "" : JSON.stringify(variant.attributes),
        initial_stock: variant ? String(variant.initial_stock) : String(product.initial_stock),
      };
      rows.push(HEADERS.map((header) => encodeCell(values[header])).join(","));
    }
  }
  return `${rows.join("\r\n")}\r\n`;
}

export function emptyWarehouseProduct(): WarehouseProductInput {
  return { ...blankProduct, variants: [] };
}
