"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

const CONSENT_KEY = "noobstore_cookie_consent";

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "accepted") {
      setConsented(true);
      return;
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY && e.newValue === "accepted") {
        setConsented(true);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (!gaId || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
