import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ ip: vi.fn(), global: vi.fn(), send: vi.fn() }));
vi.mock("./ratelimit", () => ({ getAlertIpLimiter: () => ({ limit: mocks.ip }), getAlertLimiter: () => ({ limit: mocks.global }) }));
vi.mock("@/lib/telegram/telegram.service", () => ({ notifyRateLimitHit: mocks.send }));
import { fireRateLimitAlert, isCspReportPath } from "./rate-limit-alert";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ip.mockResolvedValue({ success: true });
  mocks.global.mockResolvedValue({ success: true });
});
describe("rate-limit warning isolation", () => {
  it("exempts only exact CSP reporting path", () => {
    expect(isCspReportPath("/api/security/csp-report")).toBe(true);
    expect(isCspReportPath("/api/security/csp-report/other")).toBe(false);
    expect(isCspReportPath("/api/user/profile")).toBe(false);
  });
  it("shares IP cooldown across rejected paths", async () => {
    mocks.ip.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
    await fireRateLimitAlert("ip", "/api/wishlist", true);
    await fireRateLimitAlert("ip", "/api/user/profile", true);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.ip.mock.calls).toEqual([["ip"], ["ip"]]);
    expect(mocks.global).toHaveBeenCalledTimes(1);
  });
  it("retains global cap and ignores limiter outages", async () => {
    mocks.global.mockResolvedValueOnce({ success: false });
    await fireRateLimitAlert("ip", "/api/wishlist", false);
    mocks.ip.mockRejectedValueOnce(new Error("offline"));
    await expect(fireRateLimitAlert("ip", "/api/wishlist", false)).resolves.toBeUndefined();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
