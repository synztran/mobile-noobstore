import { describe, expect, it } from "vitest";
import {
  generateInboundTemplateCsv,
  parseInboundCsv,
  type InboundCatalogProduct,
} from "./inbound";

const catalog: InboundCatalogProduct[] = [
  {
    id: "prod-1",
    name: "GMK Keycaps",
    slug: "gmk-keycaps",
    product_type: "standard",
    stock_quantity: null,
    product_variants: [
      { id: "var-1", variant_name: "Red", stock_quantity: 10 },
      { id: "var-2", variant_name: "Blue", stock_quantity: 5 },
    ],
  },
  {
    id: "prod-2",
    name: "Switch Puller",
    slug: "switch-puller",
    product_type: "standard",
    stock_quantity: 50,
    product_variants: [],
  },
  {
    id: "prod-3",
    name: "Custom Keyboard Kit",
    slug: "custom-keyboard-kit",
    product_type: "kit",
    stock_quantity: null,
    product_variants: [],
  },
];

describe("inbound CSV template and parser", () => {
  it("generates template excluding kit products with pre-populated rows", () => {
    const csv = generateInboundTemplateCsv(catalog);
    expect(csv.startsWith("\uFEFF")).toBe(true); // UTF-8 BOM
    expect(csv).toContain("product_slug,product_name,variant_name,current_stock,inbound_quantity,input_price");
    expect(csv).toContain("gmk-keycaps,GMK Keycaps,Red,10,0,0");
    expect(csv).toContain("gmk-keycaps,GMK Keycaps,Blue,5,0,0");
    expect(csv).toContain("switch-puller,Switch Puller,,50,0,0");
    // Kits must be excluded
    expect(csv).not.toContain("custom-keyboard-kit");
  });

  it("parses valid inbound CSV with positive quantities and input prices", () => {
    const csv = `product_slug,product_name,variant_name,current_stock,inbound_quantity,input_price
gmk-keycaps,GMK Keycaps,Red,10,25,120000
switch-puller,Switch Puller,,50,100,25000
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toEqual([]);
    expect(preview.items).toHaveLength(2);
    expect(preview.totalQuantity).toBe(125);
    expect(preview.totalCost).toBe(25 * 120000 + 100 * 25000);
    expect(preview.items[0]).toEqual({
      product_id: "prod-1",
      product_slug: "gmk-keycaps",
      product_name: "GMK Keycaps",
      variant_id: "var-1",
      variant_name: "Red",
      current_stock: 10,
      inbound_quantity: 25,
      input_price: 120000,
      total_cost: 3000000,
    });
    expect(preview.items[1]).toEqual({
      product_id: "prod-2",
      product_slug: "switch-puller",
      product_name: "Switch Puller",
      variant_id: null,
      variant_name: null,
      current_stock: 50,
      inbound_quantity: 100,
      input_price: 25000,
      total_cost: 2500000,
    });
  });

  it("rejects negative input prices", () => {
    const csv = `product_slug,variant_name,inbound_quantity,input_price
gmk-keycaps,Red,10,-50000
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toHaveLength(1);
    expect(preview.issues[0].field).toBe("input_price");
  });

  it("skips zero quantity rows and adds warnings", () => {
    const csv = `product_slug,product_name,variant_name,current_stock,inbound_quantity
gmk-keycaps,GMK Keycaps,Red,10,0
switch-puller,Switch Puller,,50,15
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toEqual([]);
    expect(preview.items).toHaveLength(1);
    expect(preview.items[0].product_slug).toBe("switch-puller");
    expect(preview.warnings).toHaveLength(1);
    expect(preview.warnings[0].field).toBe("inbound_quantity");
  });

  it("reports issue for unknown product slug", () => {
    const csv = `product_slug,inbound_quantity
unknown-slug,10
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toHaveLength(1);
    expect(preview.issues[0].message).toContain("unknown-slug");
  });

  it("reports issue when variant name is missing for variant product", () => {
    const csv = `product_slug,variant_name,inbound_quantity
gmk-keycaps,,10
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toHaveLength(1);
    expect(preview.issues[0].field).toBe("variant_name");
  });

  it("reports issue when variant name does not exist", () => {
    const csv = `product_slug,variant_name,inbound_quantity
gmk-keycaps,Green,10
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toHaveLength(1);
    expect(preview.issues[0].message).toContain('Variant "Green" not found');
  });

  it("rejects attempt to inbound kit products directly", () => {
    const csv = `product_slug,inbound_quantity
custom-keyboard-kit,10
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toHaveLength(1);
    expect(preview.issues[0].field).toBe("product_type");
  });

  it("detects duplicate entries for the same product and variant in a single CSV", () => {
    const csv = `product_slug,variant_name,inbound_quantity
gmk-keycaps,Red,10
gmk-keycaps,Red,20
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toHaveLength(1);
    expect(preview.issues[0].field).toBe("duplicate");
  });

  it("rejects negative or non-integer quantities", () => {
    const csv = `product_slug,variant_name,inbound_quantity
gmk-keycaps,Red,-5
switch-puller,,abc
`;
    const preview = parseInboundCsv(csv, catalog);
    expect(preview.issues).toHaveLength(2);
    expect(preview.issues[0].field).toBe("inbound_quantity");
    expect(preview.issues[1].field).toBe("inbound_quantity");
  });
});
