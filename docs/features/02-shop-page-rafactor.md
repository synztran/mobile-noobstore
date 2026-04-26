# Feature: Refactor shop pagg

## 1. Context & Goal
- **Objective:**
  - the current shop page is fetching data is not correct, it should fetch and show up the main product
- **Scope:**
  - only take product have `product_type` is `standard` or `kit`

## 2. Database Schema Changes (Supabase)
- not need action

## 3. Frontend
- Update the function `getProducts` only take product have `product_type` is `standard` or `kit`, hide `product_type` is `component`

## 3. Backend & API Routes (Next.js App Router)
Update and modify current types for new field and update the handle logic api endpoint
- **Endpoint:** `[e.g., GET /api/products/[slug]/route.ts]`
- **Access:** [e.g., Authenticated users only, verify via Supabase SSR client]
