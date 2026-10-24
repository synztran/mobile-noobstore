import { describe, expect, it } from "vitest";
import { crc16, vietQR } from "./vietqr";

describe("VietQR payload", () => {
  it("uses CRC-16/CCITT-FALSE standard test vector", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
  it("encodes bank BIN, account, VND and order reference with valid checksum", () => {
    const payload = vietQR("970422", "0123456789", 125000, "NS12345");
    expect(payload).toContain("0006970422");
    expect(payload).toContain("01100123456789");
    expect(payload).toContain("5303704");
    expect(payload).toContain("5406125000");
    expect(payload).toContain("0807NS12345");
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid amount %s", amount => {
    expect(() => vietQR("970422", "0123456789", amount, "NS12345")).toThrow();
  });
  it("rejects injected account and reference fields", () => {
    expect(() => vietQR("970422", "1234&acc=9999", 1, "NS12345")).toThrow();
    expect(() => vietQR("970422", "0123456789", 1, "<script>")).toThrow();
  });
});
