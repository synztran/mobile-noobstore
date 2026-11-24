/**
 * Builds the search params for the variants search box on
 * /products/variants.
 *
 * Used by VariantsHeader so the behavior is unit-testable. Rules:
 * - `q` is set when non-empty, deleted when empty ("handle empty query").
 * - `by` is set when provided; when omitted the current `by` is kept.
 * - `page` is always deleted: changing the query or switching the search
 *   field resets to page 1.
 */
export function buildVariantsSearchParams({
	current,
	q,
	by,
}: {
	current: URLSearchParams;
	q: string | undefined;
	by?: string;
}): URLSearchParams {
	const params = new URLSearchParams(current.toString());
	if (q) {
		params.set("q", q);
	} else {
		params.delete("q");
	}
	if (by) {
		params.set("by", by);
	}
	params.delete("page");
	return params;
}
