import { describe, expect, it } from "vitest";

import { buildVariantsSearchParams } from "@/lib/variants-search-params";

function toRecord(params: URLSearchParams) {
	const record: Record<string, string | null> = {};
	params.forEach((value, key) => {
		record[key] = value;
	});
	return record;
}

describe("buildVariantsSearchParams", () => {
	it("switches variant -> product while keeping an existing query text", () => {
		const current = new URLSearchParams({ q: "navbar", by: "variant", page: "3" });
		const params = buildVariantsSearchParams({ current, q: "navbar", by: "product" });
		expect(toRecord(params)).toEqual({ q: "navbar", by: "product" });
	});

	it("switches product -> variant while keeping an existing query text", () => {
		const current = new URLSearchParams({ q: "navbar", by: "product", page: "1" });
		const params = buildVariantsSearchParams({ current, q: "navbar", by: "variant" });
		expect(toRecord(params)).toEqual({ q: "navbar", by: "variant" });
	});

	it("typing a query updates q and resets page", () => {
		const current = new URLSearchParams({ by: "product", page: "2" });
		const params = buildVariantsSearchParams({ current, q: "abc" });
		expect(toRecord(params)).toEqual({ by: "product", q: "abc" });
	});

	it("clearing the query deletes q and page", () => {
		const current = new URLSearchParams({ q: "abc", page: "2" });
		const params = buildVariantsSearchParams({ current, q: "" });
		expect(toRecord(params)).toEqual({});
	});

	it("deletes a stale page even when nothing else changes", () => {
		const current = new URLSearchParams({ by: "variant", page: "5" });
		const params = buildVariantsSearchParams({ current, q: undefined });
		expect(toRecord(params)).toEqual({ by: "variant" });
	});
});
