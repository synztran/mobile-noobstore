import InventoryClient from "@/components/inventory/InventoryClient";
import { getAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Inventory - NoobStore Admin",
};

interface InventoryProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  product_type: string;
  stock_quantity: number;
  base_price: number;
  is_active: boolean;
  categories: { id: string; name: string } | null;
  product_variants: {
    id: string;
    variant_name: string;
    stock_quantity: number;
    price_adjustment: number | null;
  }[];
}

export default async function InventoryPage(props: {
  searchParams: Promise<{ q?: string; stock?: string; page?: string }>;
}) {
  const { q, stock, page } = await props.searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const PAGE_SIZE = 30;
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = getAdminClient();

  let query = supabase
    .from("products")
    .select(
      `
        id, name, slug, thumbnail, product_type, stock_quantity, base_price, is_active,
        categories(id, name),
        product_variants(id, variant_name, stock_quantity, price_adjustment)
      `,
      { count: "exact" }
    )
    .order("stock_quantity", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  if (stock === "out") {
    query = query.eq("stock_quantity", 0);
  } else if (stock === "low") {
    query = query.gt("stock_quantity", 0).lt("stock_quantity", 10);
  } else if (stock === "available") {
    query = query.gt("stock_quantity", 0);
  }

  const { data: products, count, error } = await query;

  if (error) {
    console.error("Inventory fetch error:", error);
  }

  const productList = (products ?? []) as unknown as InventoryProduct[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900">
          Inventory
          <span className="ml-3 text-base font-normal text-slate-500">
            ({count ?? 0} products)
          </span>
        </p>
      </div>

      <InventoryClient
        products={productList}
        count={count ?? 0}
        currentPage={currentPage}
        totalPages={totalPages}
        q={q ?? ""}
        stock={stock ?? "all"}
      />
    </div>
  );
}
