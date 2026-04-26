# Products API

Source files:
- `apps/web/src/app/api/products/route.ts`
- `apps/web/src/app/api/products/[slug]/route.ts`
- `apps/web/src/app/api/products/[slug]/configurator/route.ts`

---

## GET /api/products

Returns a filtered, paginated list of products. No auth required.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Full-text search on product name (`ilike`) |
| `category` | string | — | Category slug (resolved to ID internally) |
| `priceMin` | number | `0` | Minimum price filter |
| `priceMax` | number | `0` | Maximum price filter (ignored when `0`) |
| `sort` | `newest` \| `price_asc` \| `price_desc` | `newest` | Sort order |
| `limit` | number | — | Max results to return |

### Response `200`

```ts
import type { ProductsResponse } from "@/app/api/products/route";
// { products: ShopProduct[], total: number }
```

```ts
interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  base_price: number;
  stock_quantity: number;
  thumbnail: string | null;
  images: string[] | null;
  variants: ShopVariant[];
  min_price: number; // lowest effective_price across variants
}

interface ShopVariant {
  id: string;
  variant_name: string;
  price_adjustment: number;
  effective_price: number; // base_price + price_adjustment
  thumbnail: string | null;
}
```

### Example

```ts
const res = await fetch(`/api/products?category=keyboards&sort=price_asc&limit=20`);
const { products, total }: ProductsResponse = await res.json();
```

---

## GET /api/products/[slug]

Returns full detail for a single product by slug. No auth required.

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `slug` | string | Product slug (e.g. `noob-v2-tkl`) |

### Response `200`

```ts
import type { ProductDetail } from "@/app/api/products/[slug]/route";
```

```ts
interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_id: string | null;
  base_price: number;
  stock_quantity: number;
  thumbnail: string | null;
  images: string[] | null;
  variants: ShopVariantDetail[];
  components: ProductComponentDetail[]; // populated for kit products
  min_price: number;
}

interface ProductComponentDetail {
  id: string;
  component_group: string;
  is_required: boolean;
  component_product: ComponentProductDetail;
}
```

### Errors

| Status | Reason |
|--------|--------|
| `400` | Missing slug |
| `404` | Product not found |

### Example

```ts
const res = await fetch(`/api/products/${slug}`);
if (!res.ok) { /* handle 404 */ }
const product: ProductDetail = await res.json();
```

---

## GET /api/products/[slug]/configurator

Returns the selectable component groups for a kit product. Used to hydrate the Quick Add Drawer. No auth required.

> **Note:** The `[slug]` segment here accepts a product **UUID** (not a slug string) — it filters `product_components` by `parent_product_id`.

### Path Parameter

| Param | Type | Description |
|-------|------|-------------|
| `slug` | string (UUID) | Parent kit product `id` |

### Response `200`

```ts
import type { ConfiguratorResponse, ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
// ConfiguratorResponse = ConfiguratorGroup[]
```

```ts
interface ConfiguratorGroup {
  component_group: string;  // e.g. "Switch", "Keycap"
  is_required: boolean;
  variants: ConfiguratorVariant[];
}

interface ConfiguratorVariant {
  id: string;
  variant_name: string;
  price_adjustment: number;
  thumbnail: string | null;
}
```

Returns `[]` when the product has no components (not a kit).

### Example

```ts
const res = await fetch(`/api/products/${product.id}/configurator`);
const groups: ConfiguratorResponse = await res.json();
```
