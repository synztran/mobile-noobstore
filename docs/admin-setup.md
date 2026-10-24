# Admin Application Setup Guide

## Overview

The admin application is a desktop-only management panel for the Huy Store. It's a separate Next.js application located in `apps/admin` that provides:

- Product management (CRUD operations)
- Order management and tracking
- User management with role-based access
- Service booking management
- Voucher/discount management
- Home page content management (banners, sections)

## Database Schema Changes

The admin app requires a new migration to add the `role` field to the profiles table:

```sql
ALTER TABLE public.profiles
ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

CREATE INDEX idx_profiles_role ON public.profiles(role);
```

This migration has been added as `030_add_admin_role.sql`.

## Running the Admin App

### Development

```bash
# From workspace root
yarn dev

# This will start both the mobile app (port 3000) and admin app (port 3001)
```

Or specifically:

```bash
cd apps/admin
yarn dev  # Runs on port 3001
```

### Build

```bash
yarn build  # Builds all apps including admin
```

## Making a User Admin

To grant admin access to a user, update their role in the database:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your.admin@example.com';
```

Then that user can login at `http://localhost:3001/login` (or your production URL).

## Architecture Notes

- **Authentication**: Uses Supabase Auth with role-based middleware protection
- **Database**: Same Supabase instance as mobile app, no separate database
- **Styling**: Tailwind CSS + DaisyUI (consistent with mobile app)
- **Performance**: Lean bundle, server components for data fetching

## Middleware & Auth Flow

1. User visits `/login` → No auth required
2. User enters credentials → Supabase auth
3. Auth check queries `profiles.role` → Must be `'admin'`
4. If admin, redirect to `/dashboard`
5. If not admin, redirect to `/unauthorized`
6. Protected routes check auth cookie in middleware

## Environment Variables

Both the mobile app and admin app need the same Supabase variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## File Structure

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (admin)/              # Protected route group
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── users/
│   │   │   ├── services/
│   │   │   ├── vouchers/
│   │   │   └── content/
│   │   ├── login/                 # Public login
│   │   ├── unauthorized/          # 403 error
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── components/
│   │   ├── auth/LoginForm.tsx
│   │   ├── layout/AdminLayout.tsx
│   │   └── dashboard/StatCard.tsx
│   └── middleware.ts              # Auth guard
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── package.json
└── README.md
```

## Key Features

### Dashboard
- Overview statistics (products, orders, users, services)
- Quick stats cards
- Placeholder for recent orders

### Products
- List all products with pagination
- View stock, price, and new/used status
- Edit and delete operations (expandable)

### Orders
- View all orders with customer info
- Status badges (pending, confirmed, shipped, delivered, cancelled)
- Quick action links

### Users
- List all users with roles
- Show email, phone, join date
- Admin users highlighted with purple badge

### Services
- View all service bookings
- Track booking status
- Link to detailed service information

### Vouchers
- Manage discount codes
- Track usage (used/limit)
- Support for percentage and fixed amount discounts

### Content
- Manage home page banners
- Manage home page sections
- Activate/deactivate content

## Next Steps

1. **Apply migration**: Run `supabase db push` to apply `030_add_admin_role.sql`
2. **Make an admin**: Run the SQL to grant admin role to your user
3. **Test login**: Visit `http://localhost:3001/login` and login with admin account
4. **Expand features**: The pages are templates - add more functionality as needed

## Notes

- The admin app is completely separate from the mobile app
- No changes to the mobile app structure
- Shared Supabase instance means real-time data access
- Same Tailwind config ensures visual consistency
- Ready for feature expansion (bulk actions, advanced filters, etc.)
