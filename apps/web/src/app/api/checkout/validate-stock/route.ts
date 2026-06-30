import { SelectedComponent } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ValidateStockRequestItem {
  product_id: string;
  product_name: string;
  variant_id: string | null;
  quantity: number;
  components?: SelectedComponent[]; // Include components for kit items
}

export interface OosItem {
  product_id: string;
  product_name: string;
  requested: number;
  available: number;
}

export interface ValidateStockResponse {
  valid: boolean;
  oos_items: OosItem[];
}

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: ValidateStockRequestItem[] } = await req.json();

    if (!items?.length) {
      return NextResponse.json<ValidateStockResponse>({
        valid: true,
        oos_items: [],
      });
    }

    const supabase = await createClient();
    const oos_items: OosItem[] = [];

    // Collect all variant IDs we need to check:
    // - simple variant items (variant_id field)
    // - kit component variant IDs (one per component per kit unit)
    const allVariantIds = new Set<string>();
    const productIds: string[] = [];

    for (const item of items) {
      if (item.components && item.components.length > 0) {
        for (const c of item.components) {
          allVariantIds.add(c.variant_id);
        }
      } else if (item.variant_id !== null) {
        allVariantIds.add(item.variant_id);
      } else {
        productIds.push(item.product_id);
      }
    }

    // Fetch live variant stock in one query
    const variantStockMap = new Map<string, number>();
    if (allVariantIds.size > 0) {
      const ids = [...allVariantIds.values()].map(String);
      const { data: variants } = await supabase
        .from("product_variants")
        .select("id, stock_quantity")
        .in("id", ids);

      for (const v of variants ?? []) {
        variantStockMap.set(v.id, v.stock_quantity ?? 0);
      }
    }

    // Fetch product-level stock (plain products with no variant)
    const productStockMap = new Map<string, number>();
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, stock_quantity")
        .eq("is_active", true)
        .in("id", productIds);

      for (const p of products ?? []) {
        productStockMap.set(p.id, p.stock_quantity ?? 0);
      }
    }

    for (const item of items) {
      if (item.components && item.components.length > 0) {
        // Kit: if ANY component variant is OOS, the whole product is OOS
        let minAvailable = Infinity;
        let oosComponent: SelectedComponent | null = null;
        for (const c of item.components) {
          const available = variantStockMap.get(c.variant_id) ?? 0;
          if (available < item.quantity) {
            if (oosComponent === null || available < minAvailable) {
              minAvailable = available;
              oosComponent = c;
            }
          }
        }
        if (oosComponent !== null) {
          oos_items.push({
            product_id: item.product_id,
            product_name: `${item.product_name} (${oosComponent.variant_name})`,
            requested: item.quantity,
            available: minAvailable === Infinity ? 0 : minAvailable,
          });
        }
      } else {
        const available =
        	item.variant_id !== null
        		? (variantStockMap.get(item.variant_id) ?? 0)
        		: (productStockMap.get(item.product_id) ?? 0);
        // const available =
        //   item.variant_id !== null
        //     ? (variantStockMap.get(item.variant_id) ?? 0)
        //     : 0;

        if (available < item.quantity) {
          oos_items.push({
            product_id: item.product_id,
            product_name: item.product_name,
            requested: item.quantity,
            available,
          });
        }
      }
    }

    return NextResponse.json<ValidateStockResponse>({
      valid: oos_items.length === 0,
      oos_items,
    });
  } catch {
    return NextResponse.json(
      { error: "Không thể kiểm tra tồn kho" },
      { status: 500 }
    );
  }
}
