"use client";

import { usePathname } from "next/navigation";
import { Edit } from "lucide-react";
import { CreatePostDrawer } from "@/components/community/CreatePostDrawer";

/**
 * Floating "create post" FAB shown only on the community pages, in the same
 * corner position the global product-search FAB otherwise occupies.
 */
export function CreatePostFloating() {
  const pathname = usePathname();
  if (!pathname.startsWith("/community")) return null;

  return (
    <CreatePostDrawer
      triggerAriaLabel="Đăng bài mới"
      triggerClassName="fixed bottom-[4dvh] right-4 z-[55] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-gradient text-white shadow-ambient-lg transition-transform active:scale-90"
      triggerChildren={<Edit size={18} />}
    />
  );
}
