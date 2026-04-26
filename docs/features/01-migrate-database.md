# Feature: Mobile-Web Daily Logging Integration

## 1. High-Level Goal
Refactor the mobile-first web app to read and write daily logs and balances using the new Supabase database instead of MongoDB.

## 2. Global Rules (Refer to AGENTS.md)
- Stack: Next.js 15, Tailwind, Zustand.
- Fetching: Client components must use `/api/` routes. Server components must use `src/lib/supabase/server.ts`.

## 3. Scope of Work
- **API Routes:** Rewrite `POST /api/logs` and `GET /api/logs` to query the new Supabase `daily_logs` and `accounts` tables.
- **UI State:** Ensure the Zustand store correctly hydrates the new relational data format (handling accounts and logs as separate entities, not nested).

## 4. Execution Plan
1. Rewrite the backend API routes for fetching balances.
2. Rewrite the backend API routes for adding a daily log.
3. Update the frontend React hooks to match the new Supabase return types.
