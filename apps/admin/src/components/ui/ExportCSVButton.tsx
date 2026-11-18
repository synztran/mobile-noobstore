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
      className="btn-soft h-9 shrink-0 px-3 py-0"
      title="Export to CSV"
    >
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
