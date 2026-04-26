# Feature: Upgrade Shipping page

## 1. High-Level Goal
the user data now have new field addresses, those are addressed have been add by customer. In shipping page, customer can quick using this add

## 2. Database Schema (MongoDB)
i try using the table `fees` in previous project, here is current script. I need update this script that i can insert into SQL editor for import table and record

create table public.fees (
  id integer not null default 1,
  delivery_immediate_price numeric(10, 2) not null default 80000,
  delivery_basic_price numeric(10, 2) not null default 40000,
  insurance_fee numeric(10, 2) not null default 10000,
  packing_fee numeric(10, 2) not null default 15000,
  handling_fee numeric(10, 2) not null default 20000,
  updated_at timestamp with time zone null default now(),
  constraint fees_pkey primary key (id),
  constraint fees_single_row check ((id = 1))
) TABLESPACE pg_default;

create trigger trigger_update_fees_timestamp BEFORE
update on fees for EACH row
execute FUNCTION update_fees_timestamp ();

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
