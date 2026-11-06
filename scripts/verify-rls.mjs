#!/usr/bin/env node
/**
 * verify-rls.mjs
 *
 * CI guard for the database's authorization boundary.
 *
 * Background: `apps/web` (storefront) and `apps/admin` share ONE Supabase
 * project, so a policy that targets `authenticated` also matches every
 * customer account, and `anon` is the public key shipped to browsers. The
 * middleware and the `(admin)` layout are NOT the security boundary for data —
 * RLS is, plus the EXECUTE grants on the SECURITY DEFINER RPCs.
 *
 * Migration 131 fixed four classes of hole. This script replays every
 * migration in order (the same way Postgres would) and fails the build if any
 * of them silently comes back:
 *
 *   1. A write policy (ALL/INSERT/UPDATE/DELETE) with an always-true predicate
 *      that is not scoped `TO service_role`. A policy with no TO clause applies
 *      to PUBLIC, which includes `anon`. Public SELECT (catalog data) is
 *      intentional and allowed.
 *   2. An owner-write policy on a table that holds money, tokens, or
 *      authorization state — the exact miss in 127, which dropped the 032-era
 *      policy names while 035's wider FOR ALL policy stayed behind.
 *   3. A SECURITY DEFINER function that is granted to anon/authenticated, or
 *      that trusts a caller-supplied `p_user_id`, without a REVOKE + a
 *      service-role-only GRANT. Postgres grants EXECUTE to PUBLIC on every new
 *      function, so the absence of a REVOKE is itself the hazard.
 *   4. A table created in `public` that never gets RLS enabled.
 *
 * Run: `yarn check:rls`
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase/migrations");

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`[verify-rls] FAIL: ${msg}`);
};
const note = (msg) => console.log(`[verify-rls] note: ${msg}`);

if (!existsSync(migrationsDir)) {
  console.error(
    `[verify-rls] FAIL: ${path.relative(root, migrationsDir)} not found. ` +
      "Migrations must be committed for this guard to mean anything."
  );
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// This repo's production database includes migrations that are intentionally
// not committed to the public app repo. Still replay the available SQL history
// and report the coverage; fail only when the folder is entirely missing.
if (files.length < 100) {
  note(
    `only ${files.length} migration files are present; replay checks cover committed history only`
  );
}

const read = (f) => readFileSync(path.join(migrationsDir, f), "utf8");
const stripComments = (s) => s.replace(/--[^\n]*/g, " ");

/** Tables that must never be writable by their owner via RLS. */
const SENSITIVE_TABLES = new Set([
  "user_event_tokens", // gacha currency
  "user_mission_progress", // grants gacha currency when claimed
  "users", // role + points_balance
  "profiles", // privilege columns get added here over time
  "point_transactions",
  "point_rules",
  "gift_cards",
  "gift_card_redemptions",
  "gift_products",
  "admin_audit_log",
]);

/**
 * Tables whose PUBLIC-scoped always-true write policy is the intent: a
 * deliberate anonymous opt-in form. Keep this list short and justified.
 */
const PUBLIC_WRITE_ALLOWLIST = new Map([
  [
    "newsletter_subscribers",
    "public newsletter opt-in form (insert-only, no PII store)",
  ],
  ["release_subscribers", "public product-release opt-in form (insert-only)"],
]);

// ─── Replay the policy lifecycle ─────────────────────────────────────────────
// Tables/policies are tracked by identity: 035 and 127 rewrite rows other
// migrations created, so a naive "does this string appear" grep is wrong.

const TBL = '(?:"?(?:public|storage|auth)"?\\s*\\.\\s*)?"?([a-z0-9_]+)"?';
const NAME = '(?:"([^"]+)"|([a-z0-9_ ]+?))';
const reCreatePolicy = new RegExp(
  `^create policy (?:if not exists )?${NAME} on ${TBL}([\\s\\S]*)$`,
  "i"
);
const reDropPolicy = new RegExp(
  `^drop policy (?:if exists )?${NAME} on ${TBL}`,
  "i"
);
const reEnableRls = new RegExp(
  `^alter table (?:only )?${TBL} enable row level security`,
  "i"
);
const reCreateTable = new RegExp(
  `^create table (?:if not exists )?${TBL}`,
  "i"
);
const reDropTable = new RegExp(`^drop table (?:if exists )?${TBL}`, "i");

const tables = new Map(); // name -> { rls: bool, policies: Map<name, {file, body}> }
const table = (n) => {
  if (!tables.has(n)) tables.set(n, { rls: false, policies: new Map() });
  return tables.get(n);
};
const seenTables = new Set();

for (const file of files) {
  // Dollar-quoted bodies can contain semicolons, so blank them before
  // splitting into statements; policies never live inside them.
  const sql = stripComments(read(file)).replace(
    /\$[a-z_]*\$[\s\S]*?\$[a-z_]*\$/gi,
    " __BODY__ "
  );

  for (const raw of sql.split(";")) {
    const stmt = raw.replace(/\s+/g, " ").trim();
    if (!stmt) continue;
    let m;

    if ((m = stmt.match(reCreateTable))) {
      seenTables.add(m[1]);
      table(m[1]);
      continue;
    }
    if ((m = stmt.match(reDropTable))) {
      tables.delete(m[1]);
      continue;
    }
    if ((m = stmt.match(reEnableRls))) {
      table(m[1]).rls = true;
      continue;
    }
    if ((m = stmt.match(reDropPolicy))) {
      table(m[3]).policies.delete((m[1] ?? m[2]).trim());
      continue;
    }
    if ((m = stmt.match(reCreatePolicy))) {
      table(m[3]).policies.set((m[1] ?? m[2]).trim(), {
        file,
        body: m[4].replace(/\s+/g, " ").trim(),
      });
      continue;
    }
  }

  // Migration 153 enables RLS for a literal allowlist of warehouse tables in
  // a DO/FOREACH loop. Dollar-quoted bodies are blanked above because policy
  // parsing must not inspect function bodies; recognize this narrow, auditable
  // pattern separately rather than treating every dynamic ALTER as trusted.
  const originalSql = stripComments(read(file));
  if (
    /FOREACH\s+table_name\s+IN\s+ARRAY\s+ARRAY\s*\[/i.test(originalSql) &&
    /ALTER TABLE public\.%I ENABLE ROW LEVEL SECURITY/i.test(originalSql)
  ) {
    const body =
      originalSql
        .match(/\$[a-z_]*\$([\s\S]*?)\$[a-z_]*\$/gi)
        ?.map((block) => block.slice(block.indexOf("\n") + 1)) ?? [];
    const loop = body
      .map((block) =>
        block.match(
          /FOREACH\s+table_name\s+IN\s+ARRAY\s+ARRAY\s*\[([\s\S]*?)\]\s*LOOP/i
        )
      )
      .find(Boolean);
    if (loop) {
      for (const [, name] of loop[1].matchAll(/'([a-z0-9_]+)'/gi)) {
        table(name).rls = true;
      }
    }
  }
}

// ─── Rule 1 + 2: policy predicates ───────────────────────────────────────────

const cmdOf = (body) =>
  (body.match(/\bfor\s+(all|select|insert|update|delete)\b/i) ?? [
    ,
    "all",
  ])[1].toUpperCase();
const rolesOf = (body) => {
  // `TO a, b` sits before USING/WITH CHECK.
  const m = body.match(/\bto\s+([a-z_, ]+?)\s*(?:using|with\s+check|$)/i);
  if (!m) return ["PUBLIC"]; // no TO clause == PUBLIC, which includes anon
  return m[1]
    .split(",")
    .map((r) => r.trim().toUpperCase())
    .filter(Boolean);
};
const isAlwaysTrue = (body) =>
  /\busing\s*\(\s*true\s*\)/i.test(body) ||
  /\bwith\s+check\s*\(\s*true\s*\)/i.test(body);
const isOwnerScoped = (body) => /\bauth\.uid\(\)/.test(body);
const writes = (cmd) => cmd !== "SELECT";

for (const [tableName, t] of tables) {
  for (const [policyName, { file, body }] of t.policies) {
    const cmd = cmdOf(body);
    if (!writes(cmd)) continue;
    const roles = rolesOf(body);
    const reachable = roles.some(
      (r) => r === "PUBLIC" || r === "ANON" || r === "AUTHENTICATED"
    );

    if (
      isAlwaysTrue(body) &&
      reachable &&
      !PUBLIC_WRITE_ALLOWLIST.has(tableName)
    ) {
      fail(
        `${file}: policy "${policyName}" on ${tableName} grants ${cmd} to ` +
          `${roles.join(", ")} with an always-true predicate. A policy with no ` +
          "TO clause applies to PUBLIC (anon included); scope it TO service_role."
      );
    }

    if (SENSITIVE_TABLES.has(tableName) && isOwnerScoped(body) && reachable) {
      fail(
        `${file}: policy "${policyName}" on ${tableName} grants ${cmd} to ` +
          `${roles.join(", ")} scoped only to the owner. ${tableName} holds ` +
          "tokens/points/authorization state — owners may read it, never write it."
      );
    }
  }
}

// ─── Rule 3: SECURITY DEFINER RPC exposure ───────────────────────────────────

// Function privileges survive CREATE OR REPLACE, so a REVOKE anywhere in the
// migration history counts — 027 revokes cancel_expired_orders() and 066 later
// recreates the body without touching grants, which is still safe.
const globallyRevokedFromPublic = new Set();
for (const file of files) {
  const src = stripComments(read(file));
  const reRevoke =
    /revoke[^;]*?on\s+function\s+(?:public\.)?"?([a-z0-9_]+)"?[^;]*?from[^;]*?\bpublic\b/gi;
  for (const m of src.matchAll(reRevoke)) globallyRevokedFromPublic.add(m[1]);
}

const LOCKDOWN_FILE = files.find((f) => f.startsWith("131_"));
let lockedNames = new Set();
if (LOCKDOWN_FILE) {
  // Read only the `locked text[] := ARRAY[ ... ]` list (the same file also
  // holds a table list). Entries may or may not carry a trailing comma.
  const src = stripComments(read(LOCKDOWN_FILE));
  const array = src.match(/locked\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\]/);
  if (!array) {
    fail(
      `${LOCKDOWN_FILE}: expected a \`locked text[] := ARRAY[...]\` list of RPC ` +
        "names; without it the grant rule cannot tell what is protected"
    );
  } else {
    for (const m of array[1].matchAll(/'([a-z0-9_]+)'/g)) {
      lockedNames.add(m[1]);
    }
  }
} else {
  note("no 131_* migration found — skipping the RPC grant rule");
}
note(
  `grant lockdown list (migration ${LOCKDOWN_FILE ?? "n/a"}): ${[...lockedNames].join(", ") || "(empty)"}`
);

const reFunction = new RegExp(
  `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?"?([a-z0-9_]+)"?\\s*\\(([^)]*)\\)([\\s\\S]*?)\\$([a-z_]*)\\$`,
  "gi"
);

const MUTATES =
  /\b(insert\s+into|delete\s+from|update\s+[a-z0-9_."]+\s+set)\b/i;

for (const file of files) {
  const src = stripComments(read(file));
  const reFn = new RegExp(reFunction.source, "gi");
  let m;
  while ((m = reFn.exec(src))) {
    const [, name, params, header, tag] = m;

    // Slice the body out so we can tell a mutator from a read-only helper
    // (e.g. can_post_community is SECURITY DEFINER but STABLE and DML-free).
    const delim = `$${tag}$`;
    const bodyStart = reFn.lastIndex;
    const bodyEnd = src.indexOf(delim, bodyStart);
    const body = bodyEnd === -1 ? "" : src.slice(bodyStart, bodyEnd);
    if (bodyEnd !== -1) reFn.lastIndex = bodyEnd + delim.length;

    const isDefiner = /\bsecurity\s+definer\b/i.test(header);
    if (!isDefiner) continue;
    // Trigger functions cannot be invoked directly, so their PUBLIC EXECUTE
    // grant is not reachable.
    if (/\breturns\s+trigger\b/i.test(header)) continue;

    const trustsCallerId = /\bp_user_id\b/i.test(params);
    const mutates = MUTATES.test(body);
    // Read-only helpers are legitimately granted to authenticated when an RLS
    // policy calls them (the predicate runs as the querying user).
    if (!trustsCallerId && !mutates) continue;

    if (lockedNames.has(name)) continue;

    if (globallyRevokedFromPublic.has(name)) continue;

    fail(
      `${file}: ${name}() is SECURITY DEFINER and ` +
        (trustsCallerId
          ? "trusts a caller-supplied p_user_id"
          : "mutates data") +
        ", and no migration revokes PUBLIC EXECUTE. Callers must go through the " +
        "service-role client: add it to the list in " +
        `${LOCKDOWN_FILE ?? "a lockdown migration"} or REVOKE from PUBLIC.`
    );
  }
}

// ─── Rule 4: every public table has RLS enabled ──────────────────────────────

for (const name of seenTables) {
  const t = tables.get(name);
  if (!t) continue; // created then dropped
  if (!t.rls) {
    fail(
      `table public.${name} never gets "ENABLE ROW LEVEL SECURITY" — with ` +
        "Supabase's default grants, every row is then readable through the " +
        "public anon key."
    );
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

if (failures > 0) {
  console.error(
    `\n[verify-rls] ${failures} check(s) failed. ` +
      "See supabase/migrations/131_lock_down_rls_and_rpc_grants.sql for the intended shape."
  );
  process.exit(1);
}

console.log(
  `[verify-rls] OK — replayed ${files.length} migrations: ` +
    `${tables.size} tables (all RLS-enabled), ` +
    `${[...tables.values()].reduce((n, t) => n + t.policies.size, 0)} live policies, ` +
    `${lockedNames.size} RPC(s) restricted to service_role.`
);
