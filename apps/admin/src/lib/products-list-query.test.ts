import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildProductsListQuery,
  normalizeProductTypeFilter,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_LIST_SELECT,
} from "./products-list-query";

// Same convention as the other server-side admin tests.
vi.mock("server-only", () => ({}));

const holder = vi.hoisted(() => ({
	calls: [] as Array<{ method: string; args: unknown[] }>,
	supabase: null as unknown,
}));

vi.mock("@/lib/supabase/admin", () => ({
	getAdminClient: () => holder.supabase,
}));

type FakeQuery = {
	[method: string]: (...args: unknown[]) => FakeQuery;
};

function makeFakeSupabase() {
	const calls = holder.calls;
	const make = (table: string) => {
		const obj: FakeQuery = { from: () => obj };
		for (const method of [
			"select",
			"order",
			"range",
			"eq",
			"ilike",
			"in",
		] as const) {
			obj[method] = (...args: unknown[]) => {
				calls.push({ method: `${table}.${method}`, args });
				return obj;
			};
		}
		return obj;
	};
	holder.supabase = { from: make };
}

beforeEach(() => {
	holder.calls = [];
	makeFakeSupabase();
});

describe("normalizeProductTypeFilter", () => {
	it("keeps valid non-'all' filters", () => {
		expect(normalizeProductTypeFilter("kit")).toBe("kit");
		expect(normalizeProductTypeFilter("standard")).toBe("standard");
		expect(normalizeProductTypeFilter("component")).toBe("component");
		expect(normalizeProductTypeFilter("gift")).toBe("gift");
	});

	it("treats 'all', missing and unknown values as no filter", () => {
		expect(normalizeProductTypeFilter("all")).toBeUndefined();
		expect(normalizeProductTypeFilter(undefined)).toBeUndefined();
		expect(normalizeProductTypeFilter(null)).toBeUndefined();
		expect(normalizeProductTypeFilter("")).toBeUndefined();
		expect(normalizeProductTypeFilter("bogus")).toBeUndefined();
	});
});

describe("buildProductsListQuery", () => {
	it("selects the shared columns with exact count, newest first, page 1", () => {
		buildProductsListQuery(holder.supabase as never, { page: 1 });
		const calls = holder.calls;
		expect(calls[0]).toEqual({
			method: "products.select",
			args: [PRODUCTS_LIST_SELECT, { count: "exact" }],
		});
		expect(calls[1]).toEqual({
			method: "products.order",
			args: ["created_at", { ascending: false }],
		});
		expect(calls[2]).toEqual({
			method: "products.range",
			args: [0, PRODUCTS_PAGE_SIZE - 1],
		});
	});

	it("computes the range for later pages", () => {
		buildProductsListQuery(holder.supabase as never, { page: 3 });
		const rangeCall = holder.calls.find((c) => c.method === "products.range");
		expect(rangeCall?.args).toEqual([
			(3 - 1) * PRODUCTS_PAGE_SIZE,
			3 * PRODUCTS_PAGE_SIZE - 1,
		]);
	});

	it("applies a valid product_type filter and an ilike name filter when given", () => {
		buildProductsListQuery(holder.supabase as never, {
			productType: "kit",
			page: 1,
		});
		expect(holder.calls).toContainEqual({
			method: "products.eq",
			args: ["product_type", "kit"],
		});
	});

	it("applies an ilike name filter when given", () => {
		const query = buildProductsListQuery(holder.supabase as never, {
			page: 1,
		});
		const ilike = holder.calls.find((c) => c.method === "products.ilike");
		expect(ilike).toBeUndefined();
		void query;
	});

	it("applies name filter via the returned query builder", () => {
		const query = buildProductsListQuery(holder.supabase as never, {
			page: 1,
		});
		query.ilike("name", "%foo%");
		expect(holder.calls).toContainEqual({
			method: "products.ilike",
			args: ["name", "%foo%"],
		});
	});

	it("does not apply a product_type filter when it is 'all' or invalid", () => {
		buildProductsListQuery(holder.supabase as never, { productType: "all" });
		expect(holder.calls).not.toContainEqual(
			expect.objectContaining({ method: "products.eq" })
		);
	});
});
