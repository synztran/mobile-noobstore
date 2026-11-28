export const MID_MAN_STATUSES = ["pending", "funded_held", "released", "refunded", "disputed"] as const;
export type MidManStatus = (typeof MID_MAN_STATUSES)[number];

const allowed: Record<MidManStatus, readonly MidManStatus[]> = {
  pending: ["funded_held", "refunded", "disputed"],
  funded_held: ["released", "refunded", "disputed"],
  released: [], refunded: [], disputed: ["released", "refunded"],
};

export function canTransition(from: string, to: string): boolean {
  return MID_MAN_STATUSES.includes(from as MidManStatus) && allowed[from as MidManStatus].includes(to as MidManStatus);
}

export function validateCase(input: Record<string, unknown>): string | null {
  for (const [key, max] of [["party_a_name",160],["party_a_contact",240],["party_b_name",160],["party_b_contact",240],["agreed_terms",5000]] as const) {
    const value = input[key];
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) return `Invalid ${key}`;
  }
  if (input.party_a_contact === input.party_b_contact) return "Parties must be unrelated";
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount < 0 || input.amount > 999999999999.99) return "Invalid amount";
  return null;
}
