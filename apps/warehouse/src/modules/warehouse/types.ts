export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

export interface WarehouseVariantInput {
  id?: string;
  variant_name: string;
  price_adjustment: number | null;
  attributes: JsonValue | null;
  initial_stock: number;
  admin_variant_id?: string | null;
}

export interface WarehouseProductInput {
  name: string;
  slug: string;
  product_type: string;
  base_price: number;
  max_quantity: number | null;
  is_active: boolean;
  brand: string | null;
  description: string | null;
  thumbnail: string | null;
  images: JsonValue | null;
  attributes: JsonValue | null;
  category_id: string | null;
  is_used: boolean | null;
  is_pre_order: boolean;
  initial_stock: number;
  warehouse_id?: string;
  admin_product_id?: string | null;
  variants: WarehouseVariantInput[];
}

export interface WarehouseProduct extends Omit<WarehouseProductInput, "warehouse_id" | "admin_product_id"> {
  id: string;
  admin_product_id: string | null;
  sync_baseline: JsonValue | null;
  admin_version: string | null;
  local_revision: number;
  created_at: string;
  updated_at: string;
  stock_quantity?: number | null;
  sync_status?: string | null;
  parent_product_id?: string | null;
}

export type SyncDirection = "publish" | "pull";
export type SyncOutcome = "created" | "updated" | "unchanged" | "conflict" | "failed";

export interface SyncEvent {
  id: string;
  warehouse_product_id: string | null;
  admin_product_id: string | null;
  direction: SyncDirection;
  outcome: SyncOutcome;
  operation_id: string;
  actor_id: string;
  safe_message: string | null;
  occurred_at: string;
}

export interface CsvImportIssue {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportPreview {
  products: WarehouseProductInput[];
  rowCount: number;
  issues: CsvImportIssue[];
  warnings: CsvImportIssue[];
}
