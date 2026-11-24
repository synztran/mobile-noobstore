import { describe, expect, it, vi } from "vitest";
import { withHomeDataFallback } from "./home-render-data";

describe("withHomeDataFallback", () => {
	it("returns fallback when a non-critical dependency hangs", async () => {
		vi.useFakeTimers();
		const pending = withHomeDataFallback("test dependency", () => new Promise<string>(() => {}), "fallback");
		await vi.advanceTimersByTimeAsync(5000);
		await expect(pending).resolves.toBe("fallback");
		vi.useRealTimers();
	});
});
