## 1. Frontend Architecture
we need implement the element tag sold out for product variant when open the `QuickPickDrawer`

## 1.1 Frontend display left quantity of product
basing on field `stock_quantity` display how many product left of this product in `ProductCard`



<!-- ## 2. Database Schema (Supabase)
## Database Logic: Dynamic Kit Inventory (PostgreSQL)
We cannot rely on a static `stock_quantity` for parent kits. The AI must create a PostgreSQL View or RPC to dynamically calculate kit availability.

- **Objective:** The available stock of any product where `product_type === 'kit'` is determined by its rarest required component.
- **Calculation Rules:**
  1. Identify all child components in `product_components` where `parent_product_id === [The_Kit_ID]`.
  2. Filter ONLY for components where `is_required === true`. (Ignore optional extras).
  3. Query the `stock_quantity` of those required components from the `product_variants` table.
  4. The Kit's total available stock is the `MIN()` (minimum) of those required component stocks. -->


## 3. Backend API: Checkout Stock Validation & Deduction
When processing an order or adding a complex kit to the cart, the backend MUST calculate component quantities using the parent kit as a multiplier.

- **Total Component Calculation:** Total Required = `Parent Cart Item.quantity` * `Child Cart Item.quantity`.
- **Validation Rule:** Before confirming the order, query the `products` table (or `product_variants` table) for all items.
  - Verify Parent `stock_quantity` >= `Parent Cart Item.quantity`.
  - Verify Child `stock_quantity` >= `Total Required`.
  - If ANY check fails, abort the transaction and return a `400 Bad Request` with the out-of-stock item's name.
- **Deduction Rule:** Use a single Supabase RPC (Remote Procedure Call) or a database transaction to deduct the `Total Required` from the child component stock, AND deduct the `Parent Quantity` from the parent kit stock simultaneously.


## 3.1 Backend API: Get correct quantity for products
With adjust above, we also need update the `products-server.ts` an api get products for shop page
- with product have `product_type` is `kit` it query all product_variant and using min(product_variant's stock_quantity) to display product quantity
- with product have `product_type` is `component` it use product_variant stock_quantity to display
- with product have `product_type` is `standard` keep use quantity from product table

## 3.2 Backend API: Get product quatity basing on product_type

keep a query products, but need format few things
- the `product_type` is `kit`, we need query more `product_variant` and using Math.min(`product_variant` map to take field stock_quantity) to get available quantity of product kit, now this stock_quantity will replace for field products.[x].stock_quantity in products data
