"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useCallback, useState } from "react";
import { DocumentUploadForm } from "./DocumentUploadForm";

interface DocumentUploadDrawerProps {
  triggerClassName?: string;
  triggerChildren?: React.ReactNode;
  triggerAriaLabel?: string;
}

export function DocumentUploadDrawer({
  triggerClassName,
  triggerChildren,
  triggerAriaLabel,
}: DocumentUploadDrawerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  usePreventScroll(drawerOpen);

  const open = useCallback(() => setDrawerOpen(true), []);

  const close = useCallback(() => {
    setDrawerOpen(false);
    setFormKey((k) => k + 1);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={triggerAriaLabel}
        className={triggerClassName}
      >
        {triggerChildren ?? "+ CHIA SẺ TÀI LIỆU"}
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] !mt-0 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={close}
      />

      {/* Bottom sheet */}
      <div
        className={`duration-250 fixed left-0 right-0 z-[999] flex h-full max-h-[92dvh] flex-col rounded-t-5xl bg-surface transition-all ease-out ${
          drawerOpen ? "top-[8dvh]" : "top-[110vh]"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-2">
          <div>
            <div className="text-xl font-black tracking-tight text-on-surface">
              Chia sẻ tài liệu
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 touch-pan-y overflow-y-auto px-5 pb-6">
          <DocumentUploadForm key={formKey} onSuccess={close} />
        </div>
      </div>
    </>
  );
}