# Agent Instructions — mobile-noobstore

You are an expert full-stack developer working on a mobile-first e-commerce storefront.
Your tech stack is: Next.js 15 (App Router), Supabase (PostgreSQL), Turborepo, Tailwind CSS + DaisyUI, and Zustand.

## 1. Strict Execution Commands

- ALWAYS use `yarn` for dependency management (Yarn 4.3.1 workspaces).
- Run all commands from the workspace root.
- The primary application lives in `apps/web`.

## 2. Supabase & Data Fetching Constraints (CRITICAL)

- **Server Components:** ALWAYS fetch data using `src/lib/supabase/server.ts`. Call Supabase directly.
- **Client Components:** NEVER call Supabase directly for data fetching. ALWAYS fetch via standard Next.js API routes (`/api/...`).
- **Client Supabase:** ONLY use `src/lib/supabase/client.ts` in the browser for Auth or real-time subscriptions, not generic data fetching.
- **Admin Client:** NEVER use `src/lib/supabase/admin.ts` in client components. NEVER expose the service role key to the browser.
- **Database Types:** NEVER manually edit `src/lib/supabase/database.types.ts`. It is auto-generated.
- **Dynamic APIs:** ALWAYS add `export const dynamic = "force-dynamic"` to API routes that must bypass the cache.

## 3. Component & UI/UX Rules

- **Interactivity:** ALWAYS include the `"use client"` directive at the very top of interactive components.
- **Modals/Overlays:** ALWAYS implement modals using the Drawer pattern (local `drawerOpen` state + DaisyUI drawer). Do not use standard dialogs.
- **Icons:** NEVER use raw SVG or external icon libraries directly. ALWAYS use the lucie-react have this icon set prioritize using that instead of material symbols.
- **Skeleton Loaders:** ALWAYS implement skeleton loaders for any async content. NEVER leave blank spaces during loading states.
- **Currency Formatting:** ALWAYS use `formatVND()` from `src/lib/currency.ts` for all price formatting. NEVER format currency manually or with other utilities.
- **Loading States:** ALWAYS implement skeleton loaders for async content.
- **Currency:** ALWAYS format prices using `formatVND()` from `src/lib/currency.ts`. NEVER format currency manually.
- **Styling:** ALWAYS use Tailwind CSS classes. Respect the DaisyUI `giraffelab` theme using custom CSS variables (e.g., `--on-surface`) defined in `globals.css`.
- **Responsive Design:** ALWAYS ensure components are mobile-first and responsive. Use Tailwind's responsive utilities to adapt layouts for different screen sizes.
- **Accessibility:** ALWAYS use semantic HTML elements. Ensure interactive elements are keyboard-navigable and have appropriate ARIA attributes.
- **Component Structure:** ALWAYS break down complex UI into smaller, reusable components. Follow the existing component structure in `src/components/` for consistency.
- **Conditions:** DON'T use complex nested ternaries in JSX. Use clear conditional rendering with if statements or separate functions for readability. If the more than 1 ternary is needed, consider refactoring into smaller components or using a switch statement.

## 4. State Management & Auth Rules

- **Authentication:** ALWAYS use the `useAuth()` hook to access `user`, `profile`, and `session` in client components.
- **Profile Updates:** ALWAYS call `refreshProfile()` immediately after any mutation that updates the `AppUser` profile data.
- **Cart State:** ALL cart mutations MUST go through `useCartStore` (Zustand). Do not manage cart state locally.
- **Hydration:** Assume `StoreHydrator` is already handling Zustand localStorage hydration at the root layout. Do not re-implement it.

## 5. Domain Knowledge (Data Types)

- Core types (`Product`, `ShopProduct`, `CartItem`, `ShippingDetails`) reside in `src/lib/data.ts`.
- Shipping constants: Standard = $0, Express = $15, `TAX_RATE` = 5.17%. (Use these strictly when calculating totals).

## 6. Safety and permissions

Allowed without prompt:

- read files, list files
- tsc single file, prettier, eslint,
- vitest single test

Ask first:

- package installs,
- git push
- deleting files, chmod
- running full build or end to end suites
