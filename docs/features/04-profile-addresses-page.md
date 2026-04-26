# Feature: build a profile addresses page

## 1. High-Level Goal
build a ui for prodfile address page and the script to update supabase new table and structure

## 2. Database Schema (MongoDB)
we need new table for handling fees, here is a script, but there are missing function help me implement and import record to this table

```
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
```

## 3. Backend API Routes (Node.js)
Update exact endpoints, methods, and expected payloads.
- `GET /api/user/profile`
  - Returns: include address of customer
- `POST /api/user/profile`
  - Body: `address ([])`
  - Returns: `Array<{ user profile include addresses field  }>`

## 4. Frontend Architecture (Next.js 14)
Build new page `profile/addresses` display customer's address have been create
Also need an drawer for create/edit address too
the input will basing on new field have been mention above

## 4.1 Level up curren UI
the form in  drawer `AddressEditorDrawer` need some upgrade
- the selection city must be a select with search, that customer can fill text for searching, moving 2 big city is TP.Ho Chi Minh and Ha Noi in top
- need have same validate for create/update form. Can using yup validate, feel free to install this library without any asking
- I see that we the api call to create new address, the from have been clear, please keep the data still be there, just disabled all input in form until the process finished

## 4.2 ward/district selection
at the current ward/district have been built by input. This is quite hard on handle calculate delivery fee, rebuild this field by select with search input
- but this field need basing on selection city to render a list basing on **Vietnam**
- its mean customer need select the city select first, if not the select of ward/district won't available
- the array `DISTRICT_MAP` have missing few city, help me update it
- we already have arr `VIETNAM_CITIES` and `DISTRICT_MAP` you can mapping it together to get arr ward/distrcit of each city
- Try build a separate component to handle select city and ward/district that we can re-usable later
## 4.3 apply component group select city and district
need apply group select city and district into
- `AddressEditorDrawer` component
- address from in page `checkout/shipping/page.tsx`

## 5. Step-by-Step Execution Plan
This is the most important section for the AI. Tell it exactly what order to write the code.
1. Generate the MongoDB schema and TypeScript interfaces.
2. Update the Node.js API routes for GET and POST.
3. Integrate the components into the profile page.


### Command
Read this feature.md file. Execute exactly Step 1 and wait for my approval. Ensure you follow all global rules in AGENTS.md.
