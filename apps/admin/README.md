# Huy Store Admin

Desktop-only admin management panel for Huy Store.

## Features

- **Product Management** - Create, edit, and manage products
- **Order Management** - View and manage orders
- **User Management** - Manage user roles and permissions
- **Service Management** - Manage service bookings
- **Voucher Management** - Create and manage discount vouchers
- **Content Management** - Manage home page banners and sections

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 4.3.1+
- Access to Supabase project

### Setup

1. **Copy environment variables:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your Supabase credentials:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Install dependencies (from root):**
   ```bash
   yarn install
   ```

4. **Apply database migration:**
   ```bash
   supabase db push  # or run migration 030_add_admin_role.sql manually
   ```

5. **Make a user admin:**
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'admin@example.com';
   ```

### Development

Start the admin app (runs on port 3001):

```bash
yarn dev
```

Or just the admin app:

```bash
cd apps/admin
yarn dev
```

### Build

```bash
yarn build
```

## Architecture

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth with role-based access control
- **Styling**: Tailwind CSS + DaisyUI
- **State**: Zustand (minimal)

## Authentication

- Admin login is role-based (requires `role = 'admin'` in profiles table)
- Session managed via Supabase Auth cookies
- Protected routes redirect to `/login` if not authenticated
- Unauthorized non-admin users are redirected to `/unauthorized`

## Database Schema

The admin panel uses the existing Supabase schema with added `role` field:

```sql
ALTER TABLE public.profiles
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
```

## File Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (admin)/              # Protected admin routes
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── users/
│   │   │   ├── services/
│   │   │   ├── vouchers/
│   │   │   └── content/
│   │   ├── login/                 # Public login page
│   │   ├── unauthorized/          # Non-admin users
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts          # Client-side Supabase
│   │       └── server.ts          # Server-side Supabase
│   └── components/
│       ├── auth/
│       ├── layout/
│       └── dashboard/
├── middleware.ts                   # Auth middleware
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## Notes

- This is a desktop-only application (no mobile version)
- All admin routes require authentication
- Non-admin users cannot access any admin pages
- The mobile app (`apps/web`) remains separate and unchanged
