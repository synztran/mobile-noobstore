import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: true, role: "admin", siblingLabels: [] as string[], inserted: null as Record<string, unknown> | null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user ? { id: "admin" } : null }, error: null }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: state.role } }) }) }) }) }) }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: () => ({ from: (_table: string) => {
	const b: Record<string, (...args: any[]) => any> = {};
	let siblingQuery = false;
	b.select = () => b; b.eq = (key: string) => { siblingQuery = key === "option_id"; return b; };
	b.maybeSingle = async () => ({ data: { id: 10 } });
	b.then = (resolve: (value: unknown) => unknown) => resolve({ data: siblingQuery ? state.siblingLabels.map((label) => ({ label })) : [], error: null });
	b.insert = (value: Record<string, unknown>) => { state.inserted = value; return b; };
	b.order = () => b; b.limit = () => b;
	return b;
} }) }));
vi.mock("@/lib/audit-log", () => ({ logAuditEvent: vi.fn() }));

import { POST } from "./route";
const request = (body: unknown) => new NextRequest("http://localhost/api/service-option-values", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { state.user = true; state.role = "admin"; state.siblingLabels = []; state.inserted = null; });

describe("POST /api/service-option-values", () => {
	it("rejects duplicate value labels case-insensitively", async () => {
		state.siblingLabels = ["Cherry"];
		expect((await POST(request({ option_id: 10, label: " cherry " }))).status).toBe(409);
	});
	it("allows same label when not present under the option", async () => {
		expect((await POST(request({ option_id: 10, label: "Cherry" }))).status).toBe(200);
	});
	it("requires admin authorization", async () => {
		state.user = false;
		expect((await POST(request({ option_id: 10, label: "Cherry" }))).status).toBe(401);
	});
});
