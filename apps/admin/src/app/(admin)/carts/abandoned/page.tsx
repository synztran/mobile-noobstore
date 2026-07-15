import AbandonedCartClient from "@/components/carts/AbandonedCartClient";
import { getAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Abandoned Cart Recovery - NoobStore Admin",
};

const PAGE_SIZE = 20;

interface RawCartItem {
  id: string;
  quantity: number;
  product_id: string | null;
  variant_id: string | null;
  parent_cart_item_id: string | null;
  products: { id: string; name: string; base_price: number; thumbnail: string | null } | null;
}

interface RawCart {
  id: string;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  users: { id: string; email: string; first_name: string | null; last_name: string | null } | null;
  cart_items: RawCartItem[];
}

export default async function AbandonedCartsPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await props.searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const supabase = getAdminClient();

  const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("carts")
    .select(
      `id, user_id, created_at, updated_at,
       users!carts_user_id_fkey (id, email, first_name, last_name),
       cart_items (
         id, quantity, product_id, variant_id, parent_cart_item_id,
         products (id, name, base_price, thumbnail)
       )`,
      { count: "exact" }
    )
    .not("user_id", "is", null)
    .lt("updated_at", cutoffDate)
    .order("updated_at", { ascending: false })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const { data: carts, count } = await query;
  const cartList = (carts ?? []) as RawCart[];

  const enriched = cartList.map((cart: RawCart) => {
    const parentItems = (cart.cart_items ?? []).filter((i) => !i.parent_cart_item_id);
    const itemCount = parentItems.length;
    const total = parentItems.reduce((sum, item) => {
      return sum + (item.products?.base_price ?? 0) * item.quantity;
    }, 0);

    return {
      id: cart.id,
      user_id: cart.user_id,
      created_at: cart.created_at,
      updated_at: cart.updated_at,
      user: cart.users,
      itemCount,
      total,
    };
  });

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const grandTotal = enriched.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900">
            Abandoned Cart Recovery
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {count ?? 0} giỏ hàng bị bỏ quên — tổng giá trị{" "}
            <span className="font-semibold text-slate-700">
              {grandTotal.toLocaleString()}đ
            </span>
          </p>
        </div>
      </div>

      <AbandonedCartClient
        carts={enriched}
        count={count ?? 0}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}
