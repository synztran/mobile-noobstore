"use client";

import { useAuth } from "@/modules/user/client/AuthProvider";
import { usePathname } from "next/navigation";
import { Upload } from "lucide-react";
import { DocumentUploadDrawer } from "@/components/community/DocumentUploadDrawer";

/**
 * Floating "create document" FAB shown only on the documents pages to admin
 * users, in the same corner position the global product-search FAB occupies.
 */
export function DocumentUploadFloating() {
  const { profile } = useAuth();
  const pathname = usePathname();
  if (!pathname.startsWith("/documents")) return null;
  if (profile?.role !== "admin") return null;

  return (
    <DocumentUploadDrawer
      triggerAriaLabel="Chia sẻ tài liệu"
      triggerClassName="fixed bottom-[4dvh] right-4 z-[55] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-gradient text-white shadow-ambient-lg transition-transform active:scale-90"
      triggerChildren={<Upload size={18} />}
    />
  );
}
