import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: { id: "admin" } as { id: string } | null, role: "admin" as string | null, duplicate: null as { id: string } | null, inserted: null as Record<string, unknown> | null, dbError: null as { code: string; message: string } | null }));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mocks.role ? { role: mocks.role } : null }) }) }) }) }) }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ from: (table: string) => {
	expect(table).toBe("services");
	const builder: Record<string, (...args: any[]) => any> = {};
	builder.select = () => builder;
	builder.eq = () => builder;
	builder.maybeSingle = async () => ({ data: mocks.duplicate });
	builder.insert = (row: Record<string, unknown>) => { mocks.inserted = row; return builder; };
	builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: { id: "service-1", ...mocks.inserted }, error: mocks.dbError });
	return builder;
} }) }));
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: vi.fn() }));

import { POST } from "./route";

const valid = { name: "Repair", slug: "repair", service_type: "repair", base_price: 1000, handling_days: 2 };
const request = (body: unknown) => new NextRequest("http://localhost/api/services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => { mocks.user = { id: "admin" }; mocks.role = "admin"; mocks.duplicate = null; mocks.inserted = null; mocks.dbError = null; });

describe("POST /api/services", () => {
	it("creates a service with validated defaults", async () => {
		const response = await POST(request(valid));
		expect(response.status).toBe(201);
		expect(mocks.inserted).toMatchObject({ ...valid, is_active: true, is_bookable_on_services_page: false });
	});
	it("rejects missing required fields and negative values", async () => {
		expect((await POST(request({ ...valid, slug: " " }))).status).toBe(400);
		expect((await POST(request({ ...valid, base_price: -1 }))).status).toBe(400);
	});
	it("rejects duplicate slug", async () => {
		mocks.duplicate = { id: "existing" };
		expect((await POST(request(valid))).status).toBe(409);
	});
	it("requires an authenticated admin", async () => {
		mocks.user = null;
		expect((await POST(request(valid))).status).toBe(401);
		mocks.user = { id: "customer" };
		mocks.role = "customer";
		expect((await POST(request(valid))).status).toBe(403);
	});
});
