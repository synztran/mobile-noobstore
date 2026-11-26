import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: true, role: "admin", duplicate: false, siblingLabels: [] as string[], inserted: null as Record<string, unknown> | null }));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user ? { id: "admin" } : null }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: state.role } }) }) }) }) }) }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ from: (table: string) => {
	const b: Record<string, (...args: any[]) => any> = {};
	let parentQuery = false;
	b.select = () => b;
	b.eq = (key: string) => { parentQuery = table === "service_options" && key === "service_id"; return b; };
	b.maybeSingle = async () => ({ data: table === "services" ? { id: "svc-1" } : state.duplicate ? { id: "opt-1" } : null });
	b.then = (resolve: (value: unknown) => unknown) => resolve({ data: parentQuery ? state.siblingLabels.map((label) => ({ label })) : [], error: null });
	b.insert = (value: Record<string, unknown>) => { state.inserted = value; return b; };
	b.order = () => b; b.limit = () => b;
	return b;
} }) }));
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: vi.fn() }));

import { POST } from "./route";

const request = (body: unknown) => new NextRequest("http://localhost/api/service-options", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { state.user = true; state.role = "admin"; state.duplicate = false; state.siblingLabels = []; state.inserted = null; });

describe("POST /api/service-options", () => {
	it("rejects same-parent duplicate case-insensitively", async () => {
		state.siblingLabels = ["Switch Type"];
		const response = await POST(request({ service_id: "svc-1", label: " switch type " }));
		expect(response.status).toBe(409);
	});
	it("allows a label not already present", async () => {
		const response = await POST(request({ service_id: "svc-1", label: "Switch Type" }));
		expect(response.status).toBe(200);
		expect(state.inserted?.label).toBe("Switch Type");
	});
	it("requires admin authorization", async () => {
		state.user = false;
		expect((await POST(request({ service_id: "svc-1", label: "x" }))).status).toBe(401);
	});
});
