import { describe, expect, it } from "vitest";
import { isClientMissionTriggerAllowed } from "./mission-trigger";

describe("isClientMissionTriggerAllowed", () => {
  it("permits only login progress from browser requests", () => {
    expect(isClientMissionTriggerAllowed("login_count")).toBe(true);
    expect(isClientMissionTriggerAllowed("order_count")).toBe(false);
    expect(isClientMissionTriggerAllowed("spend_amount")).toBe(false);
    expect(isClientMissionTriggerAllowed("play_count")).toBe(false);
    expect(isClientMissionTriggerAllowed(undefined)).toBe(false);
  });
});
