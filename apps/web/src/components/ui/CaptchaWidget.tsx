"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { forwardRef, useImperativeHandle, useRef } from "react";

export interface CaptchaWidgetHandle {
  reset: () => void;
}

interface CaptchaWidgetProps {
  onTokenChange: (token: string | null) => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

export const isCaptchaEnabled = Boolean(SITE_KEY);

export const CaptchaWidget = forwardRef<
  CaptchaWidgetHandle,
  CaptchaWidgetProps
>(function CaptchaWidget({ onTokenChange }, ref) {
  const captchaRef = useRef<HCaptcha>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      captchaRef.current?.resetCaptcha();
      onTokenChange(null);
    },
  }));

  if (!SITE_KEY) return null;

  return (
    <HCaptcha
      ref={captchaRef}
      sitekey={SITE_KEY}
      onVerify={(token) => onTokenChange(token)}
      onExpire={() => onTokenChange(null)}
      onError={() => onTokenChange(null)}
    />
  );
});
