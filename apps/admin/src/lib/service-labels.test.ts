import { describe, expect, it } from "vitest";
import { isDuplicateSiblingLabel } from "./service-labels";

describe("isDuplicateSiblingLabel", () => {
	it("matches trimmed labels case-insensitively within the supplied parent", () => {
		expect(isDuplicateSiblingLabel("  switch type ", [{ label: "Switch Type" }])).toBe(true);
		expect(isDuplicateSiblingLabel("switch type", [{ label: "Switch" }])).toBe(false);
	});

	it("ignores the current row while editing", () => {
		expect(isDuplicateSiblingLabel("SAME", [{ id: 3, label: "Same" }], 3)).toBe(false);
		expect(isDuplicateSiblingLabel("SAME", [{ id: 3, label: "Same" }, { id: 4, label: "same" }], 3)).toBe(true);
	});
});
