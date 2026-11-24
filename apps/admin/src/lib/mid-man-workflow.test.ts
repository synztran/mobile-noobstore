import { describe, expect, it } from "vitest";
import { canTransition, validateCase } from "./mid-man-workflow";

describe("mid-man tracking workflow", () => {
  it("allows only defined forward transitions; terminal states cannot be repeated", () => {
    expect(canTransition("pending", "funded_held")).toBe(true);
    expect(canTransition("funded_held", "released")).toBe(true);
    expect(canTransition("released", "refunded")).toBe(false);
    expect(canTransition("funded_held", "funded_held")).toBe(false);
  });
  it("rejects missing, same-party, and negative-amount cases", () => {
    expect(validateCase({})).toMatch("party_a_name");
    const input = { party_a_name:"A", party_a_contact:"same", party_b_name:"B", party_b_contact:"same", agreed_terms:"terms", amount:1 };
    expect(validateCase(input)).toMatch("unrelated");
    expect(validateCase({ ...input, party_b_contact:"other", amount:-1 })).toMatch("amount");
    expect(validateCase({ ...input, party_b_contact:"other", amount:1 })).toBeNull();
  });
});
