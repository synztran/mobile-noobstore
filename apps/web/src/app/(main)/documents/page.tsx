import { DocumentFeed } from "@/components/community/DocumentFeed";
import { KeyboardResources } from "@/components/community/KeyboardResources";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chia sẻ Tài liệu - NoobStore",
  description:
    "Kho tài liệu, keymap và config cho bàn phím cơ từ cộng đồng NoobStore.",
};

export default function DocumentsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
          NoobStore Documents
        </p>
        <h1 className="text-2xl font-black tracking-tight text-on-surface">
          Kho tài liệu & firmware
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-on-surface-variant">
          Chia sẻ và tải tài liệu, keymap, config cho bàn phím cơ của bạn.
        </p>
      </div>

      <KeyboardResources />
      <DocumentFeed />
    </main>
  );
}
