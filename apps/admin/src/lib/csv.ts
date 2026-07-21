export interface ExportColumn<T> {
  label: string;
  accessor: (row: T) => string | number | null | undefined;
}

export function exportCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
) {
  const headers = columns.map((c) => c.label);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = c.accessor(row);
      if (val == null) return "";
      return String(val);
    }),
  );
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
