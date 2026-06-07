#!/usr/bin/env bash
# sync_supabase.sh
#
# Syncs schema + data from SOURCE to TARGET Supabase project.
# Requires: supabase CLI logged in + pg_dump/psql (brew install libpq)
#
# Source (noobstore)    : zvjpabkpabvxfouupxgo — Northeast Asia (Tokyo)
# Target (sneaker-store): rjpybkzwuhbglodbebtf — Oceania (Sydney)

set -euo pipefail
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

SOURCE_REF="${SOURCE_REF:-zvjpabkpabvxfouupxgo}"
TARGET_REF="${TARGET_REF:-rjpybkzwuhbglodbebtf}"
TARGET_DB_PASS="${TARGET_DB_PASS:-8qVLx7v6mxtpfufn}"

DUMP_DIR="/tmp/supabase_sync_$$"
mkdir -p "$DUMP_DIR"

DATA_TABLES=(
  categories
  community_gallery
  creators
  fees
  gacha_events
  gacha_missions
  gacha_rewards
  hero_campaigns
  payment_information
  products
  product_variants
  product_components
  services
  trust_props
  vouchers
)

echo ""
echo "══════════════════════════════════════════════"
echo "  Supabase Sync: $SOURCE_REF → $TARGET_REF"
echo "══════════════════════════════════════════════"
echo ""

# ── Resolve source connection via CLI dry-run ────────────────────────────────
echo "▶ Resolving source connection..."
DRY=$(supabase db dump --dry-run --linked 2>/dev/null)
SRC_HOST=$(echo "$DRY" | grep 'PGHOST=' | head -1 | sed 's/.*PGHOST="\(.*\)".*/\1/')
SRC_PORT=$(echo "$DRY" | grep 'PGPORT=' | head -1 | sed 's/.*PGPORT="\(.*\)".*/\1/')
SRC_USER=$(echo "$DRY" | grep 'PGUSER=' | head -1 | sed 's/.*PGUSER="\(.*\)".*/\1/')
SRC_PASS=$(echo "$DRY" | grep 'PGPASSWORD=' | head -1 | sed 's/.*PGPASSWORD="\(.*\)".*/\1/')
SRC_DB=$(echo "$DRY"   | grep 'PGDATABASE=' | head -1 | sed 's/.*PGDATABASE="\(.*\)".*/\1/')

if [[ -z "$SRC_HOST" ]]; then
  echo "  ✗ Could not resolve source connection. Are you logged in to Supabase CLI?"
  exit 1
fi

# Derive target host: same node prefix, replace ref and use Sydney region
# Extract the node number (e.g. aws-1) from source host
NODE_PREFIX=$(echo "$SRC_HOST" | grep -oE 'aws-[0-9]+')
TARGET_HOST="${NODE_PREFIX}-ap-southeast-2.pooler.supabase.com"
TARGET_URL="postgresql://postgres.${TARGET_REF}:${TARGET_DB_PASS}@${TARGET_HOST}:5432/postgres"

SOURCE_URL="postgresql://${SRC_USER}:${SRC_PASS}@${SRC_HOST}:${SRC_PORT}/${SRC_DB}"

echo "  Source: ${SRC_HOST}"
echo "  Target: ${TARGET_HOST}"
echo ""

# ── Step 1: Dump schema (exact flags Supabase CLI uses) ──────────────────────
echo "▶ [1/4] Dumping schema from source..."
PGHOST="$SRC_HOST" PGPORT="$SRC_PORT" PGUSER="$SRC_USER" PGPASSWORD="$SRC_PASS" PGDATABASE="$SRC_DB" \
pg_dump \
  --schema-only \
  --quote-all-identifier \
  --role "postgres" \
  --exclude-schema "information_schema|pg_*|_analytics|_realtime|_supavisor|auth|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault" \
| sed -E 's/^\\(un)?restrict .*$/-- &/' \
| sed -E 's/^CREATE SCHEMA "/CREATE SCHEMA IF NOT EXISTS "/' \
| sed -E 's/^CREATE TABLE "/CREATE TABLE IF NOT EXISTS "/' \
| sed -E 's/^CREATE SEQUENCE "/CREATE SEQUENCE IF NOT EXISTS "/' \
| sed -E 's/^CREATE VIEW "/CREATE OR REPLACE VIEW "/' \
| sed -E 's/^CREATE FUNCTION "/CREATE OR REPLACE FUNCTION "/' \
| sed -E 's/^CREATE TRIGGER "/CREATE OR REPLACE TRIGGER "/' \
| sed -E 's/^CREATE PUBLICATION "supabase_realtime/-- &/' \
| sed -E 's/^CREATE EVENT TRIGGER /-- &/' \
| sed -E 's/^         WHEN TAG IN /-- &/' \
| sed -E 's/^   EXECUTE FUNCTION /-- &/' \
| sed -E 's/^ALTER EVENT TRIGGER /-- &/' \
| sed -E 's/^ALTER PUBLICATION "supabase_realtime_/-- &/' \
| sed -E 's/^ALTER FOREIGN DATA WRAPPER (.+) OWNER TO /-- &/' \
| sed -E 's/^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"/-- &/' \
| sed -E "/^--/d" \
> "$DUMP_DIR/schema.sql"
echo "  ✓ Schema dumped"

# ── Step 2: Dump data (selected tables only) ─────────────────────────────────
echo "▶ [2/4] Dumping data from source..."
TABLE_ARGS=()
for tbl in "${DATA_TABLES[@]}"; do
  TABLE_ARGS+=(--table "public.${tbl}")
done

PGHOST="$SRC_HOST" PGPORT="$SRC_PORT" PGUSER="$SRC_USER" PGPASSWORD="$SRC_PASS" PGDATABASE="$SRC_DB" \
pg_dump \
  --data-only \
  --quote-all-identifier \
  --role "postgres" \
  --column-inserts --rows-per-insert 100000 \
  "${TABLE_ARGS[@]}" \
  --file "$DUMP_DIR/data.sql"
echo "  ✓ Data dumped (${#DATA_TABLES[@]} tables)"
echo "  ✓ Data dumped (${#DATA_TABLES[@]} tables)"

# ── Step 3: Drop data tables so schema recreates them with correct columns ────
# Tables may exist with stale schemas from old migrations; drop them (CASCADE
# handles FK dependents) so the schema dump recreates them fresh.
echo "▶ [3/4] Dropping stale data tables on target..."
psql "$TARGET_URL" -v ON_ERROR_STOP=0 --command="
  DROP TABLE IF EXISTS public.product_components CASCADE;
  DROP TABLE IF EXISTS public.product_variants    CASCADE;
  DROP TABLE IF EXISTS public.products            CASCADE;
  DROP TABLE IF EXISTS public.categories          CASCADE;
  DROP TABLE IF EXISTS public.community_gallery   CASCADE;
  DROP TABLE IF EXISTS public.creators            CASCADE;
  DROP TABLE IF EXISTS public.fees                CASCADE;
  DROP TABLE IF EXISTS public.gacha_events        CASCADE;
  DROP TABLE IF EXISTS public.gacha_missions      CASCADE;
  DROP TABLE IF EXISTS public.gacha_rewards       CASCADE;
  DROP TABLE IF EXISTS public.hero_campaigns      CASCADE;
  DROP TABLE IF EXISTS public.payment_information CASCADE;
  DROP TABLE IF EXISTS public.services            CASCADE;
  DROP TABLE IF EXISTS public.trust_props         CASCADE;
  DROP TABLE IF EXISTS public.vouchers            CASCADE;
" 2>&1 | grep -E "ERROR" | sed 's/^/  /' || true
echo "  ✓ Stale tables dropped"

# ── Step 4: Apply schema to target ───────────────────────────────────────────
echo "▶ [4/4a] Applying schema to target..."
psql "$TARGET_URL" \
  -v ON_ERROR_STOP=0 \
  --file="$DUMP_DIR/schema.sql" \
  2>&1 | grep -E "ERROR" | sed 's/^/  /' || true
echo "  ✓ Schema applied"

# ── Step 4b: Apply data to target ────────────────────────────────────────────
echo "▶ [4/4b] Applying data to target..."
psql "$TARGET_URL" \
  -v ON_ERROR_STOP=0 \
  --file="$DUMP_DIR/data.sql" \
  2>&1 | grep -E "ERROR" | sed 's/^/  /' || true
echo "  ✓ Data applied"

rm -rf "$DUMP_DIR"

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Sync complete!"
echo "══════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  • Verify: Supabase Dashboard → Table Editor on target project"
echo "  • Update NEXT_PUBLIC_SUPABASE_URL + keys in .env.local / Vercel"
