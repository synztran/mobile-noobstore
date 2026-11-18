"use client";

import { useCallback, useEffect, useState } from "react";

export interface PhotoSettings {
  backgroundUrl: string | null;
}

/**
 * Reads the store standard-background setting (app_config key
 * `product_standard_bg`) via the admin API route.
 */
export function useStandardBackground() {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/photo-settings", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as PhotoSettings;
        setBackgroundUrl(data.backgroundUrl);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { backgroundUrl, loading, refresh };
}