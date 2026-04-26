# Feature: Refactor current checkout flow

## 1. High-Level Goal
in current version checkout flow working through these steps
- customer's card have products that customer want to checkout
- access to checkout/shipping, fill information delivey and select delivery method
- redirect to checkout/payment/{id}, this step customer check and make payment through QR code then click button submit that their have make a payment
- redirect to checkout/checking/{uuid} summary order and display status that the payment have been confirm or not.

refactor flow
- Must replace the 2nd step (checkout/payment/{id}) by summary order before customer submit
- we will display qr code paymen in last step checkout/checking/{uuid}, in this moment the backend side will generate the order_id, now customer have a correct order_id to fill into note on payment in backing app


## 2. Database Schema (MongoDB)
<!-- Define the exact data structures needed. The AI needs this first to build everything else.
- Collection: `wishlists`
- Fields:
  - `userId` (ObjectId, ref: 'User', required)
  - `productId` (ObjectId, ref: 'Product', required)
  - `addedAt` (Date, default: Date.now) -->

## 3. Backend API Routes (Node.js)
<!-- Define the exact endpoints, methods, and expected payloads.
- `POST /api/wishlist/add`
  - Payload: `{ productId: string }`
  - Returns: `{ success: boolean, wishlistId: string }`
- `GET /api/wishlist`
  - Returns: `Array<{ product details }>` -->

## 4. Frontend Architecture (Next.js 14)
buld a new checkout/summary/{uuid}
display all products in card with image, product and components with price
change current flow like we have mention above

## 5. Step-by-Step Execution Plan
<!-- This is the most important section for the AI. Tell it exactly what order to write the code.
1. Generate the MongoDB schema and TypeScript interfaces.
2. Create the Node.js API routes for GET and POST.
3. Build the `useWishlist.ts` custom hook.
4. Build the `WishlistButton.tsx` and `WishlistSidebar.tsx` UI components.
5. Integrate the components into the main page layout. -->


### Command
Read this feature.md file. Execute exactly Step 1 and wait for my approval. Ensure you follow all global rules in AGENTS.md.
