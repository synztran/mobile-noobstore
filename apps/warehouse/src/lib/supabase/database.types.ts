import type { Database as StoreDatabase, Json } from "../../../../web/src/lib/supabase/database.types";

type WarehouseProducts = {
  Row: {
    id: string; admin_product_id: string | null; name: string; slug: string;
    base_price: number; max_quantity: number | null; is_active: boolean;
    brand: string | null; description: string | null; thumbnail: string | null;
    images: Json | null; attributes: Json | null; category_id: string | null;
    is_used: boolean | null; is_pre_order: boolean; sync_baseline: Json | null;
    admin_version: string | null; local_revision: number; created_by: string;
    updated_by: string; created_at: string; updated_at: string;
    product_type?: string | null; admin_category_id?: string | null;
    parent_product_id?: string | null; stock_quantity?: number | null;
    admin_deleted_at?: string | null; sync_status?: string | null;
  };
  Insert: {
    id?: string; admin_product_id?: string | null; name: string; slug: string;
    base_price: number; max_quantity?: number | null; is_active?: boolean;
    brand?: string | null; description?: string | null; thumbnail?: string | null;
    images?: Json | null; attributes?: Json | null; category_id?: string | null;
    is_used?: boolean | null; is_pre_order?: boolean; sync_baseline?: Json | null;
    admin_version?: string | null; local_revision?: number; created_by: string;
    updated_by: string; created_at?: string; updated_at?: string;
    product_type?: string | null; admin_category_id?: string | null;
    parent_product_id?: string | null; stock_quantity?: number | null;
    admin_deleted_at?: string | null; sync_status?: string | null;
  };
  Update: {
    id?: string; admin_product_id?: string | null; name?: string; slug?: string;
    base_price?: number; max_quantity?: number | null; is_active?: boolean;
    brand?: string | null; description?: string | null; thumbnail?: string | null;
    images?: Json | null; attributes?: Json | null; category_id?: string | null;
    is_used?: boolean | null; is_pre_order?: boolean; sync_baseline?: Json | null;
    admin_version?: string | null; local_revision?: number; created_by?: string;
    updated_by?: string; created_at?: string; updated_at?: string;
    product_type?: string | null; admin_category_id?: string | null;
    parent_product_id?: string | null; stock_quantity?: number | null;
    admin_deleted_at?: string | null; sync_status?: string | null;
  };
  Relationships: [
    { foreignKeyName: "warehouse_products_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] },
    { foreignKeyName: "warehouse_products_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
    { foreignKeyName: "warehouse_products_updated_by_fkey"; columns: ["updated_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] },
  ];
};

type WarehouseVariants = {
  Row: { id: string; warehouse_product_id: string; admin_variant_id: string | null; variant_name: string; price_adjustment: number | null; attributes: Json | null; initial_stock: number; created_at: string; updated_at: string };
  Insert: { id?: string; warehouse_product_id: string; admin_variant_id?: string | null; variant_name: string; price_adjustment?: number | null; attributes?: Json | null; initial_stock?: number; created_at?: string; updated_at?: string };
  Update: { id?: string; warehouse_product_id?: string; admin_variant_id?: string | null; variant_name?: string; price_adjustment?: number | null; attributes?: Json | null; initial_stock?: number; created_at?: string; updated_at?: string };
  Relationships: [{ foreignKeyName: "warehouse_product_variants_warehouse_product_id_fkey"; columns: ["warehouse_product_id"]; isOneToOne: false; referencedRelation: "warehouse_products"; referencedColumns: ["id"] }];
};

type ImportBatches = {
  Row: { id: string; filename: string; row_count: number; product_count: number; imported_by: string; created_at: string };
  Insert: { id?: string; filename: string; row_count: number; product_count: number; imported_by: string; created_at?: string };
  Update: { id?: string; filename?: string; row_count?: number; product_count?: number; imported_by?: string; created_at?: string };
  Relationships: [{ foreignKeyName: "warehouse_import_batches_imported_by_fkey"; columns: ["imported_by"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }];
};

type SyncEvents = {
  Row: { id: string; warehouse_product_id: string | null; admin_product_id: string | null; direction: "publish" | "pull"; outcome: "created" | "updated" | "unchanged" | "conflict" | "failed"; operation_id: string; actor_id: string; safe_message: string | null; occurred_at: string };
  Insert: { id?: string; warehouse_product_id?: string | null; admin_product_id?: string | null; direction: "publish" | "pull"; outcome: "created" | "updated" | "unchanged" | "conflict" | "failed"; operation_id: string; actor_id: string; safe_message?: string | null; occurred_at?: string };
  Update: { id?: string; warehouse_product_id?: string | null; admin_product_id?: string | null; direction?: "publish" | "pull"; outcome?: "created" | "updated" | "unchanged" | "conflict" | "failed"; operation_id?: string; actor_id?: string; safe_message?: string | null; occurred_at?: string };
  Relationships: [{ foreignKeyName: "warehouse_sync_events_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }, { foreignKeyName: "warehouse_sync_events_warehouse_product_id_fkey"; columns: ["warehouse_product_id"]; isOneToOne: false; referencedRelation: "warehouse_products"; referencedColumns: ["id"] }];
};

type SyncOperations = {
  Row: { operation_id: string; request_payload: Json; response_payload: Json | null; actor_id: string; created_at: string; completed_at: string | null };
  Insert: { operation_id: string; request_payload: Json; response_payload?: Json | null; actor_id: string; created_at?: string; completed_at?: string | null };
  Update: { operation_id?: string; request_payload?: Json; response_payload?: Json | null; actor_id?: string; created_at?: string; completed_at?: string | null };
  Relationships: [{ foreignKeyName: "warehouse_sync_operations_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "users"; referencedColumns: ["id"] }];
};

type WarehouseTables = StoreDatabase["public"]["Tables"] & {
  warehouse_products: WarehouseProducts;
  warehouse_product_variants: WarehouseVariants;
  warehouse_import_batches: ImportBatches;
  warehouse_sync_events: SyncEvents;
  warehouse_sync_operations: SyncOperations;
};

type WarehouseFunctions = StoreDatabase["public"]["Functions"] & {
  warehouse_is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
  warehouse_create_staged_product: { Args: { p_product: Json; p_variants: Json; p_actor_id: string }; Returns: string };
  warehouse_import_batch: { Args: { p_filename: string; p_products: Json; p_actor_id: string }; Returns: Json };
  warehouse_admin_create_product: { Args: { p_operation_id: string; p_product: Json; p_variants: Json; p_actor_id: string }; Returns: Json };
};

export type WarehouseDatabase = Omit<StoreDatabase, "public"> & {
  public: Omit<StoreDatabase["public"], "Tables" | "Functions"> & {
    Tables: WarehouseTables;
    Functions: WarehouseFunctions;
  };
};
