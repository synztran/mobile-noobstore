"use client";

import { Loader2, RotateCcw, ScanLine, TriangleAlert } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { descriptorForCanvasKey } from "@/lib/keycap-check/crop";
import { buildStatusMaps, matchKeys } from "@/lib/keycap-check/match";
import {
  assignSizeClasses,
  medianKeyShortEdge,
  sizeClassLabel,
} from "@/lib/keycap-check/size-class";
import type {
  DetectedKey,
  KeycapDescriptor,
  KeycapSource,
  MatchResult,
  ReviewDecision,
  ReviewMap,
} from "@/lib/keycap-check/types";
import { buildVerdict } from "@/lib/keycap-check/verdict";
import DetectionOverlay from "./DetectionOverlay";
import ImageDropZone, { type DropZoneItem } from "./ImageDropZone";
import MatchLists from "./MatchLists";
import PrintReport from "./PrintReport";
import VerdictBanner from "./VerdictBanner";

// Keep decoded pixels and OpenCV's temporary Mats bounded on staff laptops.
// RGBA memory scales with the square of this value.
const MAX_SIDE = 1000;

interface UploadItem extends DropZoneItem {
  canvas: HTMLCanvasElement;
}

interface Analysis {
  renderCanvas: HTMLCanvasElement;
  renderKeys: DetectedKey[];
  customerCanvases: HTMLCanvasElement[];
  customerKeys: DetectedKey[];
  match: MatchResult;
}

type ImageSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

function imageSize(source: ImageSource): {
  width: number;
  height: number;
} {
  if (
    typeof HTMLImageElement !== "undefined" &&
    source instanceof HTMLImageElement
  ) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return { width: source.width, height: source.height };
}

/** Draw an image into a canvas, honouring EXIF orientation and manual rotation. */
function drawSourceToCanvas(
  source: ImageSource,
  rotation: number,
  maxSide: number
): HTMLCanvasElement {
  const size = imageSize(source);
  const swap = rotation % 180 !== 0;
  const displayWidth = swap ? size.height : size.width;
  const displayHeight = swap ? size.width : size.height;
  const scale = Math.min(1, maxSide / Math.max(displayWidth, displayHeight, 1));

  const width = Math.max(1, Math.round(displayWidth * scale));
  const height = Math.max(1, Math.round(displayHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.translate(width / 2, height / 2);
  context.rotate((rotation * Math.PI) / 180);
  const drawWidth = size.width * scale;
  const drawHeight = size.height * scale;
  context.drawImage(
    source,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  return canvas;
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không đọc được ảnh."));
    image.src = url;
  });
}

async function decodeFile(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      return await loadImageElement(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function createUploadItem(file: File): Promise<UploadItem | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const decoded = await decodeFile(file);
    const canvas = drawSourceToCanvas(decoded, 0, MAX_SIDE);
    if (decoded instanceof ImageBitmap) decoded.close();
    return {
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      previewUrl: canvas.toDataURL("image/jpeg", 0.72),
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
      canvas,
    };
  } catch {
    return null;
  }
}

function rotateUploadItem(item: UploadItem, delta: number): UploadItem {
  const rotation = (item.rotation + delta + 360) % 360;
  const canvas = drawSourceToCanvas(item.canvas, delta, MAX_SIDE);
  item.canvas.width = 0;
  item.canvas.height = 0;
  return {
    ...item,
    rotation,
    canvas,
    width: canvas.width,
    height: canvas.height,
    previewUrl: canvas.toDataURL("image/jpeg", 0.72),
  };
}

function computeMatch(
  renderCanvas: HTMLCanvasElement,
  renderKeys: DetectedKey[],
  customerCanvases: HTMLCanvasElement[],
  customerKeys: DetectedKey[]
): MatchResult {
  const refDescriptors = new Map<string, KeycapDescriptor>();
  for (const key of renderKeys) {
    const descriptor = descriptorForCanvasKey(renderCanvas, key);
    if (descriptor) refDescriptors.set(key.id, descriptor);
  }

  const customerDescriptors = new Map<string, KeycapDescriptor>();
  for (const key of customerKeys) {
    const canvas = customerCanvases[key.imageIndex];
    if (!canvas) continue;
    const descriptor = descriptorForCanvasKey(canvas, key);
    if (descriptor) customerDescriptors.set(key.id, descriptor);
  }

  return matchKeys(
    renderKeys,
    customerKeys,
    refDescriptors,
    customerDescriptors
  );
}

export default function KeycapCheckClient() {
  const [customerItems, setCustomerItems] = useState<UploadItem[]>([]);
  const [renderItems, setRenderItems] = useState<UploadItem[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const manualSeq = useRef(0);

  const verdict = useMemo(
    () =>
      analysis
        ? buildVerdict(
            analysis.renderKeys.length,
            analysis.customerKeys.length,
            analysis.match,
            reviews
          )
        : null,
    [analysis, reviews]
  );

  const statusMaps = useMemo(
    () =>
      analysis
        ? buildStatusMaps(analysis.match)
        : { byRef: {}, byCustomer: {} },
    [analysis]
  );

  const canAnalyze =
    customerItems.length > 0 && renderItems.length > 0 && !busy;

  async function handleCustomerFiles(files: File[]) {
    setBusy(true);
    setError(null);
    try {
      const items: UploadItem[] = [];
      for (const file of files) {
        const item = await createUploadItem(file);
        if (item) items.push(item);
      }
      if (items.length === 0) {
        setError("Không đọc được ảnh khách. Chỉ hỗ trợ JPG, PNG, WebP.");
        return;
      }
      releaseAnalysisCanvases();
      releaseAnalysisCanvases();
      setCustomerItems((previous) => [...previous, ...items]);
      setAnalysis(null);
      setReviews({});
    } finally {
      setBusy(false);
    }
  }

  async function handleRenderFiles(files: File[]) {
    setBusy(true);
    setError(null);
    try {
      const item = files[0] ? await createUploadItem(files[0]) : null;
      if (!item) {
        setError("Không đọc được ảnh render. Chỉ hỗ trợ JPG, PNG, WebP.");
        return;
      }
      for (const previous of renderItems) {
        previous.canvas.width = 0;
        previous.canvas.height = 0;
      }
      releaseAnalysisCanvases();
      setRenderItems([item]);
      setAnalysis(null);
      setReviews({});
    } finally {
      setBusy(false);
    }
  }

  function removeCustomerItem(id: string) {
    const removed = customerItems.find((item) => item.id === id);
    if (removed) {
      removed.canvas.width = 0;
      removed.canvas.height = 0;
    }
    releaseAnalysisCanvases();
    setCustomerItems((previous) => previous.filter((item) => item.id !== id));
    setAnalysis(null);
    setReviews({});
  }

  function removeRenderItem(id: string) {
    const removed = renderItems.find((item) => item.id === id);
    if (removed) {
      removed.canvas.width = 0;
      removed.canvas.height = 0;
    }
    releaseAnalysisCanvases();
    setRenderItems((previous) => previous.filter((item) => item.id !== id));
    setAnalysis(null);
    setReviews({});
  }

  function rotateCustomerItem(id: string, delta: number) {
    const current = customerItems.find((item) => item.id === id);
    const rotated = current ? rotateUploadItem(current, delta) : null;
    releaseAnalysisCanvases();
    setCustomerItems((previous) =>
      previous.map((item) => (item.id === id && rotated ? rotated : item))
    );
    setAnalysis(null);
    setReviews({});
  }

  function rotateRenderItem(id: string, delta: number) {
    const current = renderItems.find((item) => item.id === id);
    const rotated = current ? rotateUploadItem(current, delta) : null;
    releaseAnalysisCanvases();
    setRenderItems((previous) =>
      previous.map((item) => (item.id === id && rotated ? rotated : item))
    );
    setAnalysis(null);
    setReviews({});
  }

  function resetAll() {
    for (const item of [...customerItems, ...renderItems]) {
      item.canvas.width = 0;
      item.canvas.height = 0;
    }
    if (analysis) {
      analysis.renderCanvas.width = 0;
      analysis.renderCanvas.height = 0;
      for (const canvas of analysis.customerCanvases) {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    setCustomerItems([]);
    setRenderItems([]);
    setAnalysis(null);
    setReviews({});
    setError(null);
    setProgress("");
  }

  function releaseAnalysisCanvases() {
    if (!analysis) return;
    analysis.renderCanvas.width = 0;
    analysis.renderCanvas.height = 0;
    for (const canvas of analysis.customerCanvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  async function analyze() {
    if (!renderItems[0] || customerItems.length === 0) return;
    setError(
      "Tự động nhận diện tạm thời không khả dụng. Vui lòng nhập key thủ công."
    );
  }

  function makeManualKey(
    source: KeycapSource,
    imageIndex: number,
    x: number,
    y: number,
    units: number,
    baseShortEdge: number
  ): DetectedKey {
    const shortEdge = Math.max(12, baseShortEdge);
    const w = shortEdge * units;
    const h = shortEdge;
    return {
      id: `manual-${source}-${manualSeq.current++}`,
      source,
      imageIndex,
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      area: w * h,
      units,
      sizeClass: sizeClassLabel(units),
      manual: true,
    };
  }

  function applyKeys(
    base: Analysis,
    nextRenderKeys: DetectedKey[],
    nextCustomerKeys: DetectedKey[]
  ) {
    const sizedRender = assignSizeClasses(nextRenderKeys, "render");
    const sizedCustomers = assignSizeClasses(nextCustomerKeys, "customer");
    const match = computeMatch(
      base.renderCanvas,
      sizedRender,
      base.customerCanvases,
      sizedCustomers
    );
    setAnalysis({
      ...base,
      renderKeys: sizedRender,
      customerKeys: sizedCustomers,
      match,
    });
    setReviews({});
  }

  function addRenderKey(x: number, y: number, units: number) {
    if (!analysis) return;
    const baseShortEdge = medianKeyShortEdge(analysis.renderKeys) || 40;
    const key = makeManualKey("render", 0, x, y, units, baseShortEdge);
    applyKeys(analysis, [...analysis.renderKeys, key], analysis.customerKeys);
  }

  function removeRenderKey(id: string) {
    if (!analysis) return;
    applyKeys(
      analysis,
      analysis.renderKeys.filter((key) => key.id !== id),
      analysis.customerKeys
    );
  }

  function addCustomerKey(
    imageIndex: number,
    x: number,
    y: number,
    units: number
  ) {
    if (!analysis) return;
    const baseShortEdge = medianKeyShortEdge(analysis.customerKeys) || 40;
    const key = makeManualKey(
      "customer",
      imageIndex,
      x,
      y,
      units,
      baseShortEdge
    );
    applyKeys(analysis, analysis.renderKeys, [...analysis.customerKeys, key]);
  }

  function removeCustomerKey(id: string) {
    if (!analysis) return;
    applyKeys(
      analysis,
      analysis.renderKeys,
      analysis.customerKeys.filter((key) => key.id !== id)
    );
  }

  function handleReview(customerId: string, decision: ReviewDecision) {
    setReviews((previous) => {
      if (previous[customerId] === decision) {
        const next = { ...previous };
        delete next[customerId];
        return next;
      }
      return { ...previous, [customerId]: decision };
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <ImageDropZone
          title="1 · Ảnh keycap của khách"
          hint="Có thể thêm nhiều ảnh (mỗi khay một ảnh). Chụp từ trên xuống, đủ sáng, key nằm trong khay hoặc tách rời."
          items={customerItems}
          multiple
          disabled={busy}
          onFiles={handleCustomerFiles}
          onRemove={removeCustomerItem}
          onRotate={rotateCustomerItem}
        />
        <ImageDropZone
          title="2 · Ảnh render GMK chuẩn"
          hint="Kit render phẳng, nhìn từ trên xuống. Ảnh này là danh sách key chuẩn để đối chiếu."
          items={renderItems}
          disabled={busy}
          onFiles={handleRenderFiles}
          onRemove={removeRenderItem}
          onRotate={rotateRenderItem}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={analyze}
          disabled={!canAnalyze}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ScanLine className="h-4 w-4" />
          )}
          {busy ? "Đang phân tích…" : "Analyze"}
        </button>

        <button
          type="button"
          onClick={resetAll}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Làm lại
        </button>

        {progress && (
          <span className="text-xs font-medium text-slate-500">{progress}</span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!analysis && !busy && (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <ScanLine className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-2 text-sm font-semibold text-slate-700">
            Chưa có kết quả
          </h2>
          <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-slate-500">
            Thêm ảnh khách và ảnh render, sau đó bấm Analyze. Tool chạy hoàn
            toàn trong trình duyệt — ảnh khách không được tải lên server.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-[11px] leading-relaxed text-slate-400">
            Kết quả chỉ in 100% MATCH khi mọi key đều khớp 1:1 và không còn cặp
            nghi ngờ. Ca chưa chắc chắn sẽ được đưa sang staff xác nhận.
          </p>
        </section>
      )}

      {analysis && verdict && (
        <>
          <VerdictBanner verdict={verdict} onPrint={() => window.print()} />

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <DetectionOverlay
                title="Render GMK"
                canvas={analysis.renderCanvas}
                keys={analysis.renderKeys}
                statusByKey={statusMaps.byRef}
                side="render"
                onAdd={addRenderKey}
                onRemove={removeRenderKey}
              />
              <p className="px-1 text-[10px] leading-relaxed text-slate-500">
                Đỏ = thiếu · vàng = nghi ngờ · xanh = khớp. Nếu detector bỏ sót
                hoặc bắt nhầm, dùng nút Thêm/Xoá để sửa trước khi kết luận.
              </p>
            </div>

            <div className="space-y-3">
              {analysis.customerCanvases.map((canvas, index) => (
                <DetectionOverlay
                  key={`customer-overlay-${index}`}
                  title={`Ảnh khách ${index + 1}`}
                  canvas={canvas}
                  keys={analysis.customerKeys.filter(
                    (key) => key.imageIndex === index
                  )}
                  statusByKey={statusMaps.byCustomer}
                  side="customer"
                  onAdd={(x, y, units) => addCustomerKey(index, x, y, units)}
                  onRemove={removeCustomerKey}
                />
              ))}
            </div>
          </div>

          <MatchLists
            match={analysis.match}
            renderKeys={analysis.renderKeys}
            customerKeys={analysis.customerKeys}
            renderCanvas={analysis.renderCanvas}
            customerCanvases={analysis.customerCanvases}
            reviews={reviews}
            onReview={handleReview}
          />

          <PrintReport
            verdict={verdict}
            match={analysis.match}
            renderKeys={analysis.renderKeys}
            customerKeys={analysis.customerKeys}
            renderCanvas={analysis.renderCanvas}
            customerCanvases={analysis.customerCanvases}
            reviews={reviews}
            generatedAt={new Date()}
          />
        </>
      )}
    </div>
  );
}
