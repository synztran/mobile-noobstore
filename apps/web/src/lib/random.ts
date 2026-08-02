import { randomBytes, randomInt } from "crypto";

/**
 * CSPRNG helpers to replace `Math.random` in any place where the output forms
 * an identifier, redemption code, or lottery draw.
 *
 * - `Math.random()` is not guaranteed cryptographically secure and its sequence
 *   is shared process-wide, which is unsuitable for redeemable codes or a
 *   paid reward draw.
 * - `randomInt` from Node's `crypto` uses the OS CSPRNG.
 */

/** Uniform float in [0, 1) from a CSPRNG (48-bit fraction). */
export function randomFloat(): number {
  return randomBytes(6).readUIntBE(0, 6) / 2 ** 48;
}

/** Uniform random uppercase-base36 string of the given length. */
export function randomBase36(length: number): string {
  const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/** Uniform random hex string of the given byte length. */
export function randomHex(byteLength: number): string {
  return randomBytes(byteLength).toString("hex");
}