import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	error: null as { message: string } | null,
	invalidated: [] as string[],
	fetch: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
	getAdminClient: () => ({
		from: () => ({
			update: () => ({
				eq: async () => ({ error: mocks.error }),
			}),
		}),
	}),
}));

vi.mock("@/lib/redis/cache", () => ({
	invalidateFeesCache: async () => {
		mocks.invalidated.push("config:fees");
		try {
			await mocks.fetch("fee-warm-up");
		} catch (error) {
			console.error(error);
		}
	},
}));

import { PATCH } from "./route";

function request() {
	return new NextRequest("http://localhost/api/fees", {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ delivery_basic_price: 45000 }),
	});
}

beforeEach(() => {
	mocks.error = null;
	mocks.invalidated = [];
	mocks.fetch.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("PATCH /api/fees", () => {
	it("invalidates and refreshes fees after a successful update", async () => {
		const response = await PATCH(request());
		expect(response.status).toBe(200);
		expect(mocks.invalidated).toEqual(["config:fees"]);
		expect(mocks.fetch).toHaveBeenCalledWith("fee-warm-up");
	});

	it("does not warm cache if the database update fails", async () => {
		mocks.error = { message: "database unavailable" };
		const response = await PATCH(request());
		expect(response.status).toBe(500);
		expect(mocks.invalidated).toEqual([]);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});
});
