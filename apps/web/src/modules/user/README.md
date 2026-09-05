# Module: user

**Purpose:** everything about the **signed-in account** — authentication
(sign-in / sign-up / OAuth / session), the `users` profile row + shipping
addresses, and the wishlist. Auth pages (`/login`, `/register`), profile
subpages, and the wishlist page render from here.

**Owns the DB tables:** `users`, `user_addresses`, `wishlists` (reads
`gacha_events`/`user_event_tokens` only for token balances attached to the
profile payload).

## Layout

```
modules/user/
  types.ts        contract types — importable by every layer, imported by nothing below
  redirect.ts     safeRedirect() — isomorphic (middleware/edge + server route + client)
  server/         server-only; Supabase reads + writes
    auth.ts           signInWithPassword / signUpUser — ERROR_MAPs + Supabase calls
    profile.ts        ensureSyncedUser, getProfileWithAddresses, fetchUserProfile (GET),
                      replaceAddresses (POST), updateProfileFields (PATCH)
    wishlist.ts       listWishlist / addWishlistItem / removeWishlistItem + row shaping
    actions.ts        updateProfileName — "use server" action callable from client
  client/         "use client"; auth context + react-query + non-UI state
    AuthProvider.tsx    AuthProvider + useAuth() — session/profile context, mounted in root layout
    queries.ts          useProfileAddresses / useUpdateProfileAddresses → /api/user/profile
    wishlist.ts         useWishlistQuery / useWishlistAddMutation / useWishlistRemoveMutation → /api/wishlist*
    useWishlist.ts      useWishlist() — optimistic toggle hook on top of the queries (GA + toast)
    useRegisterForm.ts  useRegisterForm() — formik validation + submit for /register
    query-keys.ts       userQueryKeys factory (merged into appQueryKeys)
  ui/             components
    withAuthRedirect.tsx      HOC: bounce unauthenticated users to /login
    AddressEditorDrawer.tsx   create/edit address sheet (profile/addresses)
    wishlist/                 WishlistButton, WishlistPage, WishlistSidebar
```

`server/actions.ts` is the one exception to the "server-only" header: it starts
with `"use server"` so client components can invoke it as a server action.

## Rules that keep this clean

1. **API routes are thin.** `app/api/auth/*`, `app/api/user/profile`,
   `app/api/wishlist/*` parse/auth-check → call a `server/` function →
   respond. No DB access in the routes, **no type exports** (types come from
   `types.ts`).
2. **Client components never touch Supabase** — `AuthProvider` owns the single
   browser client; everything else goes through it or the react-query hooks in
   `client/`, which fetch the API routes.
3. **Never import `server/` from a hook/component** — `server-only` turns that
   into a build error. Exception: `server/actions.ts` is a `"use server"`
   action module, imported by the profile page on purpose.
4. **`safeRedirect` lives in `redirect.ts`** (isomorphic) — middleware,
   `app/auth/callback`, and `/login` share the same open-redirect guard.
5. **Type exports stay out of route files.** `AddWishlistRequest` /
   `AddWishlistResponse` (previously exported by `app/api/wishlist/add`) now
   come from `types.ts`.
6. **Unmigrated consumers** import moved types via `@/lib/data` re-exports
   (`ProfileAddress`, `WishlistItem`, …) — those re-exports disappear when
   checkout/orders get their own passes.

## Data flow

```
Server page / client component
        │
        ▼
client/AuthProvider.tsx        browser Supabase client — session + profile
        │                          context state (no fetch for auth itself)
        ▼
client/queries.ts ◄─fetch── /api/user/profile   (thin) ──► server/profile.ts ──► Supabase
client/wishlist.ts ◄─fetch── /api/wishlist*     (thin) ──► server/wishlist.ts ──► Supabase
   useAuth()/profile   ▲  sessions sync via supabase.auth.onAuthStateChange
app/auth/callback ── safeRedirect(redirect.ts) ──► back to app
```

Auth flow detail: `AuthProvider` calls `/api/auth/signin|signup` (thin routes →
`server/auth.ts`) which set the Supabase auth cookie; the provider then reads
the session back and fetches the profile via `/api/user/profile`. The gacha
"login_count" mission fires on SIGNED_IN events.

## API surface map

### Public contract types (`types.ts`)

| Group | Symbols |
|---|---|
| Addresses | `ProfileAddress`, `ProfileAddressInput` (also re-exported by `@/lib/data`) |
| Wishlist | `WishlistItem`, `WishlistItemInput`, `WishlistProductSummary`, `WishlistItemResponse`, `AddWishlistRequest`, `AddWishlistResponse` |

### Server (`server/`)

| Symbol | File | What it does |
|---|---|---|
| `signInWithPassword`, `signUpUser` | `auth.ts` | Email/password auth against Supabase with the human-readable Vietnamese `ERROR_MAP`s — the bodies of `/api/auth/signin`, `/api/auth/signup` |
| `ensureSyncedUser` | `profile.ts` | Upserts the `users` row from the auth user (by id, then email, then insert) |
| `fetchUserProfile` | `profile.ts` | GET body: profile + addresses + active-event token balances |
| `replaceAddresses` | `profile.ts` | POST body: validates + replaces all `user_addresses` for the user |
| `updateProfileFields` | `profile.ts` | PATCH body: `first_name` / `last_name` / `phone_number` |
| `listWishlist`, `addWishlistItem`, `removeWishlistItem` | `wishlist.ts` | Wishlist CRUD + product-summary shaping (legacy double-variant JSON string tolerated on read) |
| `updateProfileName` | `actions.ts` | `"use server"` action — rename from the profile page (no HTTP round trip) |

### Client (`client/`)

| Symbol | What it does |
|---|---|
| `AuthProvider`, `useAuth()` | Session/profile context. `useAuth()` returns `{ user, session, profile, loading, signIn, signUp, signOut, signInWithGoogle, refreshProfile }`. `profile` is the `users` row fetched from `/api/user/profile` |
| `useProfileAddresses`, `useUpdateProfileAddresses` | address-list query + replace-all mutation → `/api/user/profile` |
| `useWishlistQuery`, `useWishlistAddMutation`, `useWishlistRemoveMutation` | wishlist data + optimistic mutations (single shared cache key) |
| `useWishlist` | high-level hook: `items/loading/busy`, `addTo/removeFrom/toggle`, `isInWishlist`, `isPendingFor` — GA events + toasts, auto-dedupe across buttons |
| `useRegisterForm` | formik + yup register schema, captcha gate, submit → `signUp` → notify → `/login` |
| `userQueryKeys` | `createQueryKeys("user", { wishlist: null })` merged into `appQueryKeys` |

### UI surfaces

| Surface | Components |
|---|---|
| Auth pages | `LoginForm`/register pages (stay in `app/(auth)`), `withAuthRedirect` HOC |
| Profile | `AddressEditorDrawer` (create/edit/delete flows live in `profile/addresses/page.tsx`), name form on `profile/page.tsx` (calls the `updateProfileName` action) |
| Wishlist | `WishlistButton` (heart on `ProductCard`/`ProductView`/`TopNav`), `WishlistPage`, `WishlistSidebar` (TopNav drawer) |

### Route map (thin handlers)

| Endpoint | Delegates to |
|---|---|
| `POST /api/auth/signin` | `auth.signInWithPassword` (rate-limited) |
| `POST /api/auth/signup` | `auth.signUpUser` (rate-limited) |
| `GET /api/user/profile` | `profile.fetchUserProfile` |
| `POST /api/user/profile` | `profile.replaceAddresses` |
| `PATCH /api/user/profile` | `profile.updateProfileFields` |
| `GET /api/wishlist` | `wishlist.listWishlist` |
| `POST /api/wishlist/add` | `wishlist.addWishlistItem` |
| `POST /api/wishlist/remove` | `wishlist.removeWishlistItem` |

`app/auth/callback` (OAuth redirect) can't move — it's a fixed public URL; it
uses `safeRedirect` from the module. `/api/user/orders`, `/api/user/rank`,
`/api/user/service-orders/*` still live in their route files until the
orders/points/service passes.

## Domain facts that bite

- **Two user identities.** Supabase `auth.users` (auth) vs the app `users`
  table (profile: names, points, role). `ensureSyncedUser` bridges them by id →
  email → insert; most handlers need the `users.id`, which for OAuth users
  equals `authUser.id`. Server Components must call
  `supabase.auth.getUser()` (not `getSession()`) to trust the identity.
- **`profile` ≠ the auth user.** `useAuth().profile` is a separate fetch
  (`/api/user/profile`) — it can be null while `user` is set (fetch failed),
  and mutating profile data requires `refreshProfile()` afterwards. Address
  flows call it after saving.
- **Full name is split across `first_name` + `last_name`** (`splitFullName`),
  and merged back on the client. Keep both columns in sync in any name edit.
- **Address saves replace everything.** `replaceAddresses` deletes all of the
  user's `user_addresses` rows then re-inserts the payload — never send a
  partial list, and the client keeps the full array as source of truth
  (`profile/addresses/page.tsx`).
- **Wishlist rows tolerate a legacy double-encoded `product` JSON string**
  (`server/wishlist.ts` re-parses it on read) — new rows store plain objects.
- **Profile GET payload is shared by many screens** — AuthProvider fetches it
  for the context `profile` AND `useProfileAddresses` queries it again; the
  addresses come back under `addresses[]` only from the server client.
- **Middleware runs on the Edge** — import only `redirect.ts` (isomorphic),
  never `server/` (node) or `AuthProvider` (browser) there.

## Cookbook (common tasks)

- **Gate a page behind login:** wrap the default export with
  `withAuthRedirect` from `ui/withAuthRedirect.tsx`.
- **Read the current user in a client component:** `useAuth()` → `user`,
  `profile`, `loading`; call `refreshProfile()` after mutations.
- **Add an address field:** extend `ProfileAddress`/`ProfileAddressInput`
  (`types.ts`), the drawer form (`AddressEditorDrawer.tsx`), the address
  serializer in `server/profile.ts#replaceAddresses`, and the DB migration.
- **Change auth error copy:** edit the `ERROR_MAP`s in `server/auth.ts` — the
  routes and UI stay untouched.
- **Reuse the wishlist heart:** import
  `@/modules/user/ui/wishlist/WishlistButton` — never copy it.

## Tests

- No dedicated unit tests yet — auth, profile, and wishlist flows are covered
  by the build (server/client boundary + `server-only` enforcement) and the
  e2e suite against a seeded DB. Add pure-logic tests here when the
  ERROR_MAP / row-shaping helpers gain branching logic.
