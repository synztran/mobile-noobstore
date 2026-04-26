# Feature: [Insert Feature Name, e.g., User Wishlist System]

## 1. High-Level Goal
Briefly describe the BA requirement. (e.g., "Allow users to save products to a wishlist and view them later.")

## 2. Database Schema (MongoDB)
Define the exact data structures needed. The AI needs this first to build everything else.
- Collection: `wishlists`
- Fields:
  - `userId` (ObjectId, ref: 'User', required)
  - `productId` (ObjectId, ref: 'Product', required)
  - `addedAt` (Date, default: Date.now)

## 3. Backend API Routes (Node.js)
Define the exact endpoints, methods, and expected payloads.
- `POST /api/wishlist/add`
  - Payload: `{ productId: string }`
  - Returns: `{ success: boolean, wishlistId: string }`
- `GET /api/wishlist`
  - Returns: `Array<{ product details }>`

## 4. Frontend Architecture (Next.js 14)
Break down the UI/UX design into specific React components and state management rules.
- **State Management:** Create a custom hook `useWishlist.ts` to handle fetching, adding, and removing items.
- **Server Components:** `WishlistPage.tsx` (Fetches initial data from the server).
- **Client Components:** - `WishlistButton.tsx` (Contains the onClick handler and optimistic UI updates).
  - `WishlistSidebar.tsx` (Displays the list).
- **Styling constraints:** Use Tailwind CSS. Primary action buttons should use `bg-blue-600`.

## 5. Step-by-Step Execution Plan
This is the most important section for the AI. Tell it exactly what order to write the code.
1. Generate the MongoDB schema and TypeScript interfaces.
2. Create the Node.js API routes for GET and POST.
3. Build the `useWishlist.ts` custom hook.
4. Build the `WishlistButton.tsx` and `WishlistSidebar.tsx` UI components.
5. Integrate the components into the main page layout.


### Command
Read this feature.md file. Execute exactly Step 1 and wait for my approval. Ensure you follow all global rules in AGENTS.md.
