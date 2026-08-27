"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CONSENT_KEY = "noobstore_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-3 right-3 z-[60] mx-auto max-w-lg rounded-2xl border border-gray-200/50 bg-white p-4 shadow-xl"
          role="dialog"
          aria-label="Cookie consent"
        >
          <p className="mb-3 text-xs leading-relaxed text-on-surface-variant">
            Chúng tôi sử dụng cookie để cải thiện trải nghiệm của bạn và phân
            tích lưu lượng truy cập. Cookie giúp chúng tôi cá nhân hóa nội
            dung và quảng cáo phù hợp với sở thích của bạn.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary-container active:scale-95"
            >
              Chấp nhận
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-on-surface-variant transition-colors hover:bg-gray-50 active:scale-95"
            >
              Từ chối
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
