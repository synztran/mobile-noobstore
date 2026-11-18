# NoobStore Warehouse

Standalone Next.js workspace for product staging, versioned CSV import/export, and explicit catalog sync. Warehouse quantities are not an inventory authority: only initial stock for new published products is sent to Admin. Later stock remains managed by the existing store/Admin workflows.

## Local setup

Use the workspace's existing Yarn 4 install. For local development, copy or link the ignored `apps/admin/.env.local` into `apps/warehouse/.env.local` only in a developer-controlled local setup; never commit it. Required values are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` for administrative operations.

```bash
yarn workspace @noobstore/warehouse dev # http://localhost:3002
yarn workspace @noobstore/warehouse type-check
yarn workspace @noobstore/warehouse test
```

Apply the new warehouse SQL migration only through the project's reviewed Supabase migration process after verifying the target project. Do not apply it to production from this repository task. App pages and APIs require an existing user whose `public.users.role` is `admin`.
