"use client";

import { MousePointer2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { DetectedKey, MatchStatus } from "@/lib/keycap-check/types";

type EditMode = "inspect" | "add" | "remove";

interface DetectionOverlayProps {
  title: string;
  canvas: HTMLCanvasElement;
  keys: DetectedKey[];
  statusByKey: Record<string, MatchStatus>;
  side: "customer" | "render";
  onAdd?: (x: number, y: number, units: number) => void;
  onRemove?: (id: string) => void;
}

const ADD_UNITS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 3, 6.25];

function statusColor(status: MatchStatus | undefined, side: "customer" | "render"): string {
  switch (status) {
    case "matched":
      return "#059669";
    case "uncertain":
      return "#d97706";
    case "missing":
      return "#dc2626";
    case "duplicate":
      return "#ea580c";
    case "extra":
      return "#be123c";
    default:
      return side === "render" ? "#0284c7" : "#4f46e5";
  }
}

export default function DetectionOverlay({
  title,
  canvas,
  keys,
  statusByKey,
  side,
  onAdd,
  onRemove,
}: DetectionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayWidth, setDisplayWidth] = useState(0);
  const [mode, setMode] = useState<EditMode>("inspect");
  const [addUnits, setAddUnits] = useState(1);

  const editable = Boolean(onAdd || onRemove);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of keys) {
      map.set(key.sizeClass, (map.get(key.sizeClass) ?? 0) + 1);
    }
    return [...map.entries()].sort(
      (a, b) => Number.parseFloat(a[0]) - Number.parseFloat(b[0]),
    );
  }, [keys]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) setDisplayWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = canvasRef.current;
    if (!target || displayWidth <= 0) return;

    const scale = displayWidth / canvas.width;
    const displayHeight = canvas.height * scale;
    const dpr = window.devicePixelRatio || 1;

    target.width = Math.round(displayWidth * dpr);
    target.height = Math.round(displayHeight * dpr);
    target.style.width = `${displayWidth}px`;
    target.style.height = `${displayHeight}px`;

    const context = target.getContext("2d");
    if (!context) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, displayWidth, displayHeight);
    context.imageSmoothingEnabled = true;
    context.drawImage(canvas, 0, 0, displayWidth, displayHeight);

    context.font = "600 10px ui-sans-serif, system-ui, sans-serif";
    context.textBaseline = "top";

    keys.forEach((key, index) => {
      const color = statusColor(statusByKey[key.id], side);
      const x = key.x * scale;
      const y = key.y * scale;
      const w = Math.max(1, key.w * scale);
      const h = Math.max(1, key.h * scale);

      context.lineWidth = key.manual ? 2.5 : 1.5;
      context.strokeStyle = color;
      context.strokeRect(x, y, w, h);

      context.fillStyle = color;
      context.globalAlpha = 0.12;
      context.fillRect(x, y, w, h);
      context.globalAlpha = 1;

      const label = `${index + 1}`;
      const textWidth = context.measureText(label).width;
      const labelX = x + 2;
      const labelY = y + 2;
      context.fillStyle = "rgba(15, 23, 42, 0.78)";
      context.fillRect(labelX, labelY, textWidth + 6, 13);
      context.fillStyle = "#ffffff";
      context.fillText(label, labelX + 3, labelY + 2);
    });
  }, [canvas, displayWidth, keys, side, statusByKey]);

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (!editable || mode === "inspect") return;
    const target = canvasRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const scale = rect.width / canvas.width;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    if (mode === "add") {
      onAdd?.(x, y, addUnits);
      return;
    }

    const hit = [...keys]
      .reverse()
      .find(
        (key) =>
          x >= key.x &&
          x <= key.x + key.w &&
          y >= key.y &&
          y <= key.y + key.h,
      );
    if (hit) onRemove?.(hit.id);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {keys.length} key
          </span>
        </div>

        {editable && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setMode("inspect")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                mode === "inspect"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <MousePointer2 className="h-3 w-3" />
              Xem
            </button>
            {onAdd && (
              <button
                type="button"
                onClick={() => setMode("add")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  mode === "add"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Plus className="h-3 w-3" />
                Thêm
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => setMode("remove")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  mode === "remove"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Trash2 className="h-3 w-3" />
                Xoá
              </button>
            )}
            {mode === "add" && (
              <select
                value={addUnits}
                onChange={(event) => setAddUnits(Number(event.target.value))}
                className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px] text-slate-700"
                title="Kích thước key sẽ thêm"
              >
                {ADD_UNITS.map((units) => (
                  <option key={units} value={units}>
                    {units}u
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {counts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {counts.map(([label, count]) => (
            <span
              key={label}
              className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200"
            >
              {label} · {count}
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} className="mt-2 overflow-hidden rounded-lg bg-slate-900/5">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className={
            mode === "add"
              ? "block cursor-copy"
              : mode === "remove"
                ? "block cursor-crosshair"
                : "block cursor-default"
          }
        />
      </div>

      {mode !== "inspect" && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
          {mode === "add"
            ? `Bấm vào vị trí key bị bỏ sót để thêm hộp ${addUnits}u.`
            : "Bấm vào hộp key sai để xoá khỏi kết quả."}
        </p>
      )}
    </section>
  );
}
