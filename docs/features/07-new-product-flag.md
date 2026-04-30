# Feature: New product field to identify is used product, a new tags too

## 1. High-Level Goal
have field identify that product is 2nd product and have a tag to display this information

## 2. Database Schema (MongoDB)
- Collection: `products`
- Fields:
  - `is_used` (boolean)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

## 3. Backend API Routes (Node.js)
api endpoint related to product include `GET` and `POST`
check if product have field `is_used` add new tag option
{
  id: current_id + 1,
  label: "san pham 2nd",
  value: "used_product",
  icon: "",
}

## 4. Frontend Architecture (Next.js 14)
TBA

## 5. Step-by-Step Execution Plan
This is the most important section for the AI. Tell it exactly what order to write the code.
1. Generate script update supabase new column in product table
2. Update the Node.js API routes for GET and POST.


### Command
Read this feature.md file. Execute exactly Step 1 and wait for my approval. Ensure you follow all global rules in AGENTS.md.
