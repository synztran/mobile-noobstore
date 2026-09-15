"use client";

import { useEffect, useState } from "react";
import type { DeviceClass } from "../types";

/**
 * Client-side device class detection. Reads the device class from the
 * `x-device-class` header that the middleware forwards. Since this is a
 * client component, it uses a simpler approach: check the cookie or
 * default to "mobile" (the server already handles the real routing).
 */
export function DeviceClassGate({
  desktop,
  mobile,
}: {
  desktop: React.ReactNode;
  mobile: React.ReactNode;
}) {
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("mobile");

  useEffect(() => {
    // Read the override cookie if present
    const cookies = document.cookie.split(";");
    const override = cookies.find((c) =>
      c.trim().startsWith("device-override=")
    );
    if (override) {
      const value = override.split("=")[1]?.trim();
      if (value === "desktop" || value === "mobile") {
        setDeviceClass(value);
        return;
      }
    }

    // Default: check viewport width as a fallback
    // On desktop domain, the middleware already set x-device-class
    // This is just a client-side fallback
    if (window.innerWidth >= 1024) {
      setDeviceClass("desktop");
    }
  }, []);

  return deviceClass === "desktop" ? <>{desktop}</> : <>{mobile}</>;
}
