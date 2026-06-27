"use client";

import { Plus, Trash2 } from "lucide-react";

interface Props {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}

export default function AttributesEditor({ value, onChange }: Props) {
  const entries = Object.entries(value);

  const sync = (next: [string, string][]) => {
    const obj: Record<string, string> = {};
    for (const [k, v] of next) {
      obj[k] = v;
    }
    onChange(obj);
  };

  const update = (index: number, field: "key" | "value", val: string) => {
    const next = entries.map((e, i) =>
      i === index
        ? field === "key"
          ? [val, e[1]] as [string, string]
          : [e[0], val] as [string, string]
        : e
    );
    sync(next);
  };

  const remove = (index: number) => {
    sync(entries.filter((_, i) => i !== index));
  };

  const add = () => {
    sync([...entries, ["", ""]]);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        Attributes
      </label>
      {entries.map(([key, val], i) => (
        <div key={i} className="flex items-start gap-2">
          <input
            value={key}
            onChange={(e) => update(i, "key", e.target.value)}
            placeholder="Key"
            className="w-1/3 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={val}
            onChange={(e) => update(i, "value", e.target.value)}
            placeholder="Value"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="mt-1.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600"
      >
        <Plus className="h-4 w-4" />
        Add attribute
      </button>
    </div>
  );
}
