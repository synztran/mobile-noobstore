import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const admin = "00000000-0000-0000-0000-000000000001";
const bank = "00000000-0000-0000-0000-000000000002";
const orderId = "00000000-0000-0000-0000-000000000003";
const db = new PGlite();

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT coalesce(current_setting('request.jwt.claim.role',true),'service_role') $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE TABLE public.users(id text PRIMARY KEY, email text, role text);
    CREATE TABLE orders(id text PRIMARY KEY, status text DEFAULT 'pending', total_price bigint, payment_type text DEFAULT 'full', deposit_amount bigint DEFAULT 0, remaining_amount bigint DEFAULT 0, paid_at timestamptz, deposit_paid_at timestamptz);
    CREATE TABLE payment_information(id text PRIMARY KEY, platform_name text, account_number text, platform_type text);
    CREATE TABLE admin_audit_log(admin_user_id text NOT NULL REFERENCES public.users(id), admin_email text NOT NULL, action text, entity_type text, entity_id text, new_data jsonb);
    INSERT INTO auth.users VALUES ('${admin}');
    INSERT INTO public.users VALUES ('${admin}','admin@test.invalid','admin');
    INSERT INTO payment_information VALUES ('${bank}','MB','12345678','bank');
    INSERT INTO orders(id,total_price,deposit_amount,remaining_amount,payment_type)
    VALUES ('${orderId}',1000,300,700,'deposit_cod');
    INSERT INTO orders(id,total_price,paid_at) VALUES ('00000000-0000-0000-0000-000000000005',500,now());
  `);
  await db.exec(readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/158_verified_order_payments.sql", import.meta.url)), "utf8"));
  await db.exec("ALTER TABLE orders ADD COLUMN order_number text DEFAULT 'NS123'; ALTER TABLE payment_information ADD COLUMN account_name text DEFAULT 'STORE';");
  await db.exec(readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/159_payment_instruction_evidence.sql", import.meta.url)), "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });

async function receipt(amount: number, reference: string, reversal: string | null = null) {
  const result = await db.query<{ result: { receipt_id: string; status: string; overpayment: number } }>(
    "SELECT public.record_verified_order_payment($1,$2,$3,'bank',$4,$5,now(),'test correction reason',$6) AS result",
    [orderId, admin, amount, bank, reference, reversal]
  );
  return result.rows[0].result;
}

describe("manual payment database boundary", () => {
  it("matches the production text order key and keeps receipt/auth identities as UUIDs", async () => {
    const result = await db.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='order_payment_receipts'
       AND column_name IN ('id','order_id','verified_by') ORDER BY column_name`
    );
    expect(result.rows).toEqual([
      { column_name: "id", data_type: "uuid" },
      { column_name: "order_id", data_type: "text" },
      { column_name: "verified_by", data_type: "uuid" },
    ]);
    const grants = await db.query<{ allowed: boolean; client_allowed: boolean }>(
      `SELECT has_function_privilege('service_role',
        'public.record_verified_order_payment(text,uuid,bigint,text,text,text,timestamptz,text,uuid)', 'EXECUTE') AS allowed,
        has_function_privilege('authenticated',
        'public.record_verified_order_payment(text,uuid,bigint,text,text,text,timestamptz,text,uuid)', 'EXECUTE') AS client_allowed`
    );
    expect(grants.rows[0]).toEqual({ allowed: true, client_allowed: false });
  });
  it("preserves old timestamps as labelled legacy opening balances", async () => {
    const result = await db.query<{ amount: number; method: string; transaction_reference: string | null }>(
      "SELECT amount, method, transaction_reference FROM order_payment_receipts WHERE order_id='00000000-0000-0000-0000-000000000005'"
    );
    expect(Number(result.rows[0].amount)).toBe(500);
    expect(result.rows[0].method).toBe("legacy");
    expect(result.rows[0].transaction_reference).toBeNull();
  });
  it("rejects manual timestamp/status bypass and supports partial, deposit and full receipts", async () => {
    await expect(db.exec(`UPDATE orders SET status='first_paid',deposit_paid_at=now() WHERE id='${orderId}'`)).rejects.toThrow();
    expect((await receipt(100, "REF001")).status).toBe("pending");
    expect((await receipt(200, "REF002")).status).toBe("first_paid");
    await expect(db.exec(`UPDATE orders SET status='second_paid' WHERE id='${orderId}'`)).rejects.toThrow();
    await db.exec(`UPDATE orders SET status='delivering' WHERE id='${orderId}'`);
    await expect(db.exec(`UPDATE orders SET status='delivered',paid_at=now() WHERE id='${orderId}'`)).rejects.toThrow();
    await expect(receipt(700, "REF001")).rejects.toThrow();
    const settled = await receipt(700, "REF003");
    await db.exec(`UPDATE orders SET status='delivered' WHERE id='${orderId}'`);
    await receipt(0, "", settled.receipt_id);
    const row = await db.query<{ paid_at: string | null }>("SELECT paid_at FROM orders WHERE id=$1", [orderId]);
    expect(row.rows[0].paid_at).toBeNull();
    await expect(receipt(0, "", settled.receipt_id)).rejects.toThrow();
    await expect(receipt(700, "REF003")).rejects.toThrow();
  });
  it("rejects customer payment writes and audits bank configuration changes", async () => {
    await db.exec("SET request.jwt.claim.role = 'authenticated'");
    await expect(db.exec(`UPDATE orders SET total_price=1 WHERE id='${orderId}'`)).rejects.toThrow();
    await expect(receipt(100, "REF004")).rejects.toThrow();
    await db.exec("SET request.jwt.claim.role = 'service_role'");
    await db.exec("UPDATE payment_information SET account_number='99999999'");
    const audit = await db.query<{ count: number }>("SELECT count(*)::int FROM payment_configuration_audit");
    expect(audit.rows[0].count).toBe(1);
  });
  it("locks receipt rows against direct edits, including service-role writes", async () => {
    const result = await db.query<{ can_insert: boolean; can_update: boolean; can_delete: boolean }>(
      `SELECT has_table_privilege('service_role','public.order_payment_receipts','INSERT') AS can_insert,
      has_table_privilege('service_role','public.order_payment_receipts','UPDATE') AS can_update,
      has_table_privilege('authenticated','public.order_payment_receipts','DELETE') AS can_delete`
    );
    expect(result.rows[0]).toEqual({ can_insert: false, can_update: false, can_delete: false });
  });
  it("settles full-payment orders, flags overpayment, and rejects receipts after cancellation", async () => {
    const full = "00000000-0000-0000-0000-000000000006";
    await db.exec(`INSERT INTO orders(id,total_price) VALUES ('${full}',500)`);
    const record = (amount: number, ref: string) => db.query<{ result: { status: string; overpayment: number } }>(
      "SELECT public.record_verified_order_payment($1,$2,$3,'cash',NULL,$4,now(),'cash collected') AS result",
      [full, admin, amount, ref]
    );
    const result = await record(550, "CASH-001");
    expect(result.rows[0].result.status).toBe("confirmed");
    expect(result.rows[0].result.overpayment).toBe(50);
    await expect(record(550, "CASH-001")).rejects.toThrow();
    await db.exec(`UPDATE orders SET status='cancelled' WHERE id='${full}'`);
    await expect(record(100, "CASH-002")).rejects.toThrow();
  });
  it("archives instruction versions once, rejects stale amounts, and queues bank-change alerts", async () => {
    const id = "evidence-text-order";
    await db.exec(`INSERT INTO orders(id,total_price) VALUES ('${id}',1000)`);
    const issue = (fingerprint: string, amount = 1000) => db.query<{ evidence: { id: string; version: number } }>(
      `SELECT to_jsonb(public.issue_payment_instruction_evidence($1,$2,$3::jsonb,$4,'NS123','payload',$5,'cG5n',$5)) AS evidence`,
      [id, fingerprint.repeat(64), JSON.stringify({ id: bank, platform_name: "MB", account_number: "99999999", account_name: "STORE" }), amount, "a".repeat(64)]
    );
    const first = (await issue("a")).rows[0].evidence;
    expect(first.version).toBe(1);
    expect((await issue("a")).rows[0].evidence.id).toBe(first.id);
    expect((await issue("b")).rows[0].evidence.version).toBe(2);
    await expect(issue("c", 500)).rejects.toThrow();
    const permissions = await db.query<{ writable: boolean; readable: boolean }>(
      "SELECT has_table_privilege('service_role','payment_instruction_evidence','UPDATE') AS writable, has_table_privilege('authenticated','payment_instruction_evidence','SELECT') AS readable"
    );
    expect(permissions.rows[0]).toEqual({ writable: false, readable: false });
    const alerts = await db.query<{ kind: string }>("SELECT kind FROM payment_security_alerts WHERE kind='bank_config_changed'");
    expect(alerts.rows[0].kind).toBe("bank_config_changed");
  });
});
