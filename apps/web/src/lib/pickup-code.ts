import { createHash, randomInt } from "crypto";

export const PICKUP_CODE_TTL_MS = 5 * 60 * 1000;
export const PICKUP_CODE_DIGITS = 6;
export const MAX_PICKUP_CODE_TRIES = 5;
export const PICKUP_CODE_LOCK_MS = 15 * 60 * 1000;

export function generatePickupCode(): string {
  let code = "";
  for (let i = 0; i < PICKUP_CODE_DIGITS; i++) {
    code += String(randomInt(0, 10));
  }
  return code;
}

export function hashPickupCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function isPickupCodeExpired(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return true;
  return Date.parse(expiresAt) <= now;
}

export function isPickupCodeLocked(lockedUntil: string | null, now = Date.now()): boolean {
  if (!lockedUntil) return false;
  return Date.parse(lockedUntil) > now;
}

export function pickupCodeSecondsLeft(expiresAt: string | null, now = Date.now()): number {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
}

export function pickupCodeLockSecondsLeft(lockedUntil: string | null, now = Date.now()): number {
  if (!lockedUntil) return 0;
  return Math.max(0, Math.ceil((Date.parse(lockedUntil) - now) / 1000));
}