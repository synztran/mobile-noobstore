import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { user: { id: string; email?: string } | null; role: string | null; authError: boolean; roleError: boolean } = { user: null, role: null, authError: false, roleError: false };
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
import { requireWarehouseAdmin } from "./admin";

function mockClient() {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: state.user }, error: state.authError ? new Error("auth") : null })) },
    from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.role ? { role: state.role } : null, error: state.roleError ? new Error("role") : null }) }) }) })),
  };
}

beforeEach(() => {
  state.user = null;
  state.role = null;
  state.authError = false;
  state.roleError = false;
  mocks.createClient.mockResolvedValue(mockClient());
});

describe("requireWarehouseAdmin", () => {
  it("rejects missing sessions", async () => {
    await expect(requireWarehouseAdmin()).resolves.toMatchObject({ ok: false, status: 401 });
  });
  it("rejects non-admin or failed role verification", async () => {
    state.user = { id: "u1" };
    state.role = "user";
    await expect(requireWarehouseAdmin()).resolves.toMatchObject({ ok: false, status: 403 });
    state.role = "ADMIN";
    await expect(requireWarehouseAdmin()).resolves.toMatchObject({ ok: false, status: 403 });
    state.role = "admin";
    state.roleError = true;
    await expect(requireWarehouseAdmin()).resolves.toMatchObject({ ok: false, status: 403 });
  });
  it("admits only the verified exact admin role", async () => {
    state.user = { id: "admin-1", email: "admin@example.test" };
    state.role = "admin";
    await expect(requireWarehouseAdmin()).resolves.toMatchObject({ ok: true, user: { id: "admin-1" } });
  });
});
