import { describe, expect, it } from "vitest";
import {
	buildMeasurementPayload,
	normalizeClientId,
	normalizeSessionId,
	sanitizeEventName,
	toTimestampMicros,
} from "./ga4";

describe("sanitizeEventName", () => {
	it("lowercases and replaces spaces with underscores", () => {
		expect(sanitizeEventName("Add To Cart")).toBe("add_to_cart");
	});

	it("strips invalid characters", () => {
		expect(sanitizeEventName("purchase!@#")).toBe("purchase");
	});

	it("prefixes names that do not start with a letter", () => {
		expect(sanitizeEventName("123_event")).toBe("evt_123_event");
	});

	it("caps at 40 characters", () => {
		const long = "a".repeat(80);
		expect(sanitizeEventName(long)).toHaveLength(40);
	});

	it("returns empty string for empty input", () => {
		expect(sanitizeEventName("   ")).toBe("");
		expect(sanitizeEventName("!!!")).toBe("");
	});
});

describe("toTimestampMicros", () => {
	it("converts epoch ms to microseconds", () => {
		expect(toTimestampMicros(1_000_000)).toBe(1_000_000_000);
	});

	it("parses an ISO date string", () => {
		const iso = "2026-01-01T00:00:00.000Z";
		const expected = Date.parse(iso) * 1000;
		expect(toTimestampMicros(iso)).toBe(expected);
	});

	it("falls back to now for invalid input", () => {
		const before = Date.now() * 1000;
		const result = toTimestampMicros("not-a-date");
		const after = Date.now() * 1000;
		expect(result).toBeGreaterThanOrEqual(before);
		expect(result).toBeLessThanOrEqual(after);
	});
});

describe("normalizeSessionId", () => {
	it("extracts digits from a cookie-style value", () => {
		expect(normalizeSessionId("GA1.2.123456.789")).toBe(12123456789);
	});

	it("accepts a plain numeric value", () => {
		expect(normalizeSessionId(987654)).toBe(987654);
	});

	it("caps at 15 digits", () => {
		expect(normalizeSessionId("12345678901234567890")).toBe(123456789012345);
	});

	it("falls back to epoch seconds when no digits", () => {
		const result = normalizeSessionId("abc");
		expect(result).toBeGreaterThan(0);
		expect(result).toBe(Math.floor(Date.now() / 1000));
	});
});

describe("normalizeClientId", () => {
	it("passes through a valid client id", () => {
		expect(normalizeClientId("1234567890.1614284624")).toBe(
			"1234567890.1614284624"
		);
	});

	it("trims surrounding whitespace", () => {
		expect(normalizeClientId("  abc.123  ")).toBe("abc.123");
	});

	it("rejects invalid or empty values", () => {
		expect(normalizeClientId("")).toBe("");
		expect(normalizeClientId("a b c")).toBe("");
	});
});

describe("buildMeasurementPayload", () => {
	it("builds a valid payload with sanitized event", () => {
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			events: [{ name: "Add To Cart", params: { value: 100 } }],
		});

		expect(payload).not.toBeNull();
		expect(payload?.client_id).toBe("1234567890.1614284624");
		expect(payload?.events).toHaveLength(1);
		expect(payload?.events[0].name).toBe("NSM_add_to_cart");
		expect(payload?.events[0].params.value).toBe(100);
	});

	it("prefixes every event name with NSM_", () => {
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			events: [{ name: "view_item" }, { name: "purchase" }],
		});

		expect(payload?.events.map((e) => e.name)).toEqual([
			"NSM_view_item",
			"NSM_purchase",
		]);
	});

	it("keeps the prefixed name within GA4's 40-char limit", () => {
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			events: [{ name: "a".repeat(80) }],
		});

		const name = payload?.events[0].name ?? "";
		expect(name.startsWith("NSM_")).toBe(true);
		expect(name.length).toBeLessThanOrEqual(40);
	});

	it("injects session_id and event_time defaults", () => {
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			session_id: "abc123456",
			events: [{ name: "view_item" }],
		});

		expect(payload?.events[0].params.session_id).toBe(123456);
		expect(typeof payload?.events[0].params.event_time).toBe("string");
	});

	it("does not override an explicit session_id param", () => {
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			events: [{ name: "view_item", params: { session_id: 42 } }],
		});

		expect(payload?.events[0].params.session_id).toBe(42);
	});

	it("includes user_id when provided", () => {
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			user_id: "user-1",
			events: [{ name: "purchase" }],
		});

		expect(payload?.user_id).toBe("user-1");
	});

	it("drops events with invalid names", () => {
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			events: [{ name: "   " }, { name: "view_item" }],
		});

		expect(payload?.events).toHaveLength(1);
		expect(payload?.events[0].name).toBe("NSM_view_item");
	});

	it("caps events at 25 per request", () => {
		const many = Array.from({ length: 40 }, (_, i) => ({ name: `event_${i}` }));
		const payload = buildMeasurementPayload({
			client_id: "1234567890.1614284624",
			events: many,
		});

		expect(payload?.events).toHaveLength(25);
	});

	it("returns null when client_id is missing", () => {
		expect(
			buildMeasurementPayload({ client_id: "", events: [{ name: "x" }] })
		).toBeNull();
	});

	it("returns null when no valid events remain", () => {
		expect(
			buildMeasurementPayload({
				client_id: "1234567890.1614284624",
				events: [{ name: "   " }],
			})
		).toBeNull();
	});
});
