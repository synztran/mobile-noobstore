import "server-only";

import { headers } from "next/headers";
import type { DeviceClass } from "./types";

/**
 * Read the device class forwarded by the edge middleware. Defaults to "mobile"
 * when the header is absent (local dev without middleware, direct Vercel hits).
 *
 * Only import from server components and API routes — never from client code.
 */
export async function getDeviceClass(): Promise<DeviceClass> {
  const h = await headers();
  return (h.get("x-device-class") as DeviceClass) || "mobile";
}
