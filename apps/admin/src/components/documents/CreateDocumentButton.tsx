"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import DocumentFormModal from "./DocumentFormModal";

export default function CreateDocumentButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        <Plus className="h-5 w-5" />
        Tạo tài liệu
      </button>
      <DocumentFormModal open={open} onClose={() => setOpen(false)} mode="create" />
    </>
  );
}
