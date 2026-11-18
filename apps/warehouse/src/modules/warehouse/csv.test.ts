import { describe, expect, it } from "vitest";
import { parseWarehouseCsv, serializeWarehouseCsv, warehouseCsvTemplate } from "./csv";
import type { WarehouseProductInput } from "./types";

const product: WarehouseProductInput = {
  name: 'Board, "One"', slug: "board-one", product_type: "standard", base_price: 125000,
  max_quantity: null, is_active: true, brand: "Noob Store", description: "Line one\nLine two",
  thumbnail: null, images: ["https://example.test/a.jpg"],
  attributes: { switch: "linear", layout: ["ansi", "iso"] }, category_id: null,
  is_used: false, is_pre_order: false, initial_stock: 0, warehouse_id: "w-123",
  admin_product_id: null,
  variants: [
    { variant_name: "Black", price_adjustment: 0, attributes: { color: "black" }, initial_stock: 4 },
    { variant_name: "White", price_adjustment: 2000, attributes: null, initial_stock: 2 },
  ],
};

describe("warehouse CSV v1", () => {
  it("exports then imports quoted, multiline product and variant values", () => {
    const csv = serializeWarehouseCsv([product]);
    const parsed = parseWarehouseCsv(csv);
    expect(parsed.issues).toEqual([]);
    expect(parsed.products).toEqual([product]);
    expect(parsed.rowCount).toBe(2);
  });

  it("requires the exact versioned header", () => {
    const parsed = parseWarehouseCsv("name,slug\nKeyboard,keyboard\n");
    expect(parsed.issues[0]?.field).toBe("header");
  });

  it("blocks inconsistent repeated fields and duplicate variants", () => {
    const simple = { ...product, name: "Board", description: null, images: null, attributes: null };
    const csv = serializeWarehouseCsv([simple]);
    const first = csv.indexOf("125000");
    const second = csv.indexOf("125000", first + 1);
    const changed = `${csv.slice(0, second)}999${csv.slice(second + 6)}`;
    const parsed = parseWarehouseCsv(changed);
    expect(parsed.issues.some((issue) => issue.field === "product")).toBe(true);
    const duplicate = parseWarehouseCsv(csv.replace("White", "Black"));
    expect(duplicate.issues.some((issue) => issue.field === "variant_name")).toBe(true);
  });

  it("rejects invalid JSON, product type, and numeric fields", () => {
    const csv = serializeWarehouseCsv([{ ...product, name: "Board", description: null, images: null, attributes: null, base_price: 1, variants: [] }]).trimEnd();
    const header = csv.split("\r\n")[0].split(",");
    const rawCells = csv.split("\r\n")[1].split(",");
    rawCells[header.indexOf("images_json")] = "{broken";
    rawCells[header.indexOf("base_price")] = "-2";
    rawCells[header.indexOf("product_type")] = "kit";
    const parsed = parseWarehouseCsv(`${header.join(",")}\n${rawCells.join(",")}\n`);
    expect(parsed.issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(["images_json", "base_price", "product_type"]));
  });

  it("neutralizes formulas and exports an importable empty template header", () => {
    const formula = { ...product, name: '=HYPERLINK("https://evil.test")', variants: [] };
    const csv = serializeWarehouseCsv([formula]);
    expect(csv).toContain("'=HYPERLINK");
    expect(parseWarehouseCsv(warehouseCsvTemplate() + csv.trimEnd().split("\r\n")[1] + "\r\n").issues).toEqual([]);
  });
});
