"use client";

import type { ExportColumn } from "@/lib/csv";
import { exportCSV } from "@/lib/csv";
import { Download } from "lucide-react";

interface Props<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  label?: string;
  disabled?: boolean;
}

export default function ExportCSVButton<T>({
  data,
  columns,
  filename,
  label = "CSV",
  disabled,
}: Props<T>) {
  return (
    <button
      onClick={() => exportCSV(data, columns, filename)}
      disabled={disabled || data.length === 0}
      className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      title="Export to CSV"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
