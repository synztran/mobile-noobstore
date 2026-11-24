"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Box, Camera, CheckCircle2, Gavel, Loader2, Sparkles, X } from "lucide-react";
import type { AuctionProductDetails } from "@/types/auction";

interface ProductOption {
  id: string;
  name: string;
  base_price: number;
}

export function AuctionFormModal({
  onClose,
  onSuccess,
  auctionId,
  auctionProductName,
}: {
  onClose: () => void;
  onSuccess: () => void;
  auctionId?: string;
  auctionProductName?: string;
}) {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [customerRanks, setCustomerRanks] = useState<Array<{ level: number; name: string; is_active: boolean }>>([]);

  const [productId, setProductId] = useState("");
  const [startingPrice, setStartingPrice] = useState<number>(100000);
  const [binPrice, setBinPrice] = useState<string>("");
  const [incrementType, setIncrementType] = useState<"fixed" | "percentage">("fixed");
  const [incrementValue, setIncrementValue] = useState<number>(20000);

  // Default starts now, ends in 3 days
  const now = new Date();
  const defaultStartsAt = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [endsAt, setEndsAt] = useState(in3Days);
  const [antiSnipeMinutes, setAntiSnipeMinutes] = useState<number>(5);
  const [winnerCheckoutHours, setWinnerCheckoutHours] = useState<number>(24);
  const [maxWinnerCascades, setMaxWinnerCascades] = useState<number>(3);

  const [requiredLevel, setRequiredLevel] = useState<number>(0);
  const [requiredOrders, setRequiredOrders] = useState<number>(0);
  const [limitBids, setLimitBids] = useState(false);
  const [maxBids, setMaxBids] = useState<number>(3);
  const [auctionStatus, setAuctionStatus] = useState<string>("");
  const [totalBids, setTotalBids] = useState(0);
  const [bidders, setBidders] = useState<Array<{ name: string; amount: number; created_at: string }>>([]);

  const [status, setStatus] = useState<"draft" | "active" | "ended" | "cancelled">("active");
  const [isFeatured, setIsFeatured] = useState(false);
  const [specs, setSpecs] = useState([{ label: "", value: "" }]);
  const [conditionGrade, setConditionGrade] = useState("");
  const [conditionSummary, setConditionSummary] = useState([""]);
  const [conditionAttributes, setConditionAttributes] = useState([{ label: "", value: "" }]);
  const [accessories, setAccessories] = useState([""]);
  const [conditionImages, setConditionImages] = useState<string[]>([]);
  const [conditionImageCaptions, setConditionImageCaptions] = useState<string[]>([]);
  const [pendingInspectionFiles, setPendingInspectionFiles] = useState<Record<string, File>>({});
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isInspectionDropActive, setIsInspectionDropActive] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSpecs = specs.filter((item) => item.label.trim() && item.value.trim());
  const previewGrade = conditionGrade.trim();
  const previewGradeText: Record<string, string> = {
    S: "Grade S • New 100% / Like New Sealed — Nguyên seal hộp hoặc phụ kiện chưa từng bóc. Không có bất kỳ vết xước, cấn, tỳ vết nào. Tình trạng hoàn hảo tuyệt đối.",
    A: "Grade A • Like New 98-99% — Đã mở hộp hoặc test nhanh, hoàn toàn không trầy xước, đủ phụ kiện zin và hộp đi kèm. Mạch hoạt động chuẩn 100%.",
    B: "Grade B • Very Good 90-95% — Có xước dăm nhẹ ở đáy hoặc góc khuất không ảnh hưởng thẩm mỹ nhìn thẳng. Đầy đủ phụ kiện chính.",
    C: "Grade C • Good 80-89% — Có vết trầy xước thấy rõ, có thể thiếu một vài phụ kiện phụ (như keypuller phụ, sticker), giá khởi điểm hời.",
    D: "Grade D • Salvage / Thợ sửa — Hàng cấn móp, lỗi chức năng (liệt phím, lỗi led) bán thanh lý cho dân mod/thợ sửa chữa.",
  };
  const previewSummary = conditionSummary.map((item) => item.trim()).filter(Boolean);
  const previewAttributes = conditionAttributes.filter((item) => item.label.trim() && item.value.trim());
  const previewAccessories = accessories.map((item) => item.trim()).filter(Boolean);

  useEffect(() => {
    fetch("/api/ranks")
      .then((res) => res.ok ? res.json() : [])
      .then((ranks) => setCustomerRanks(Array.isArray(ranks) ? ranks : []))
      .catch(() => setCustomerRanks([]));
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products?productType=all");
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data);
          if (data.length > 0) {
            setProductId(data[0].id);
            setStartingPrice(Number(data[0].base_price) || 100000);
          }
        }
      } catch (e) {
        console.error("Failed to load products:", e);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (!auctionId) return;
    fetch(`/api/auctions/${auctionId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Không tải được phiên đấu giá");
        const details = data.auction.product_details as AuctionProductDetails | null;
        const auction = data.auction;
        setAuctionStatus(auction.status);
        setStatus(auction.status);
        setIsFeatured(Boolean(auction.is_featured));
        setTotalBids(Number(auction.total_bids ?? data.bids?.length ?? 0));
        setBidders((data.bids ?? []).map((bid: any) => ({
          name: [bid.user?.first_name, bid.user?.last_name].filter(Boolean).join(" ") || (bid.user?.email ? `${bid.user.email.slice(0, 2)}•••` : "Khách hàng"),
          amount: Number(bid.amount ?? 0),
          created_at: bid.created_at,
        })));
        setStartingPrice(Number(auction.starting_price));
        setStartsAt(new Date(new Date(auction.starts_at).getTime() - new Date(auction.starts_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        setEndsAt(new Date(new Date(auction.ends_at).getTime() - new Date(auction.ends_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        setAntiSnipeMinutes(Number(auction.anti_snipe_minutes));
        setWinnerCheckoutHours(Number(auction.winner_checkout_hours));
        setMaxWinnerCascades(Number(auction.max_winner_cascades));
        setBinPrice(auction.bin_price == null ? "" : String(auction.bin_price));
        setIncrementType(auction.increment_type);
        setIncrementValue(Number(auction.increment_value));
        setRequiredLevel(Number(auction.required_customer_level ?? 0));
        setRequiredOrders(Number(auction.required_order_count ?? 0));
        setLimitBids(Boolean(auction.limit_bids_per_user));
        setMaxBids(Number(auction.max_bids_per_user ?? 3));
        if (details) {
          setSpecs(details.specs.length ? details.specs : [{ label: "", value: "" }]);
          setConditionGrade(details.condition.grade);
          setConditionSummary(details.condition.summary.length ? details.condition.summary : [""]);
          setConditionAttributes(details.condition.attributes.length ? details.condition.attributes : [{ label: "", value: "" }]);
          setAccessories(details.accessories.length ? details.accessories : [""]);
          setConditionImages(details.condition.images ?? []);
          setConditionImageCaptions(details.condition.image_captions ?? Array(details.condition.images?.length ?? 0).fill(""));
        }
      })
      .catch((err) => setError(err.message));
  }, [auctionId]);

  const canEditPricing = !auctionId || (auctionStatus !== "active" && totalBids === 0);

  const handleInspectionUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    const selections = Array.from(files).map((file) => [URL.createObjectURL(file), file] as const);
    setPendingInspectionFiles((current) => ({ ...current, ...Object.fromEntries(selections) }));
    setConditionImages((current) => [...current, ...selections.map(([preview]) => preview)]);
  };

  const uploadPendingInspectionImages = async (images: string[]) => {
    setUploadingImages(true);
    setUploadError(null);
    const uploadedImages = [...images];
    try {
      for (const [index, previewUrl] of uploadedImages.entries()) {
        const file = pendingInspectionFiles[previewUrl];
        if (!file) continue;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("slug", `auctions/${auctionId ?? (productId || "inspection")}/condition`);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok || typeof data.url !== "string") throw new Error(data.error || "Tải ảnh kiểm định thất bại");
        uploadedImages[index] = data.url;
        setConditionImages((current) => current.map((url) => url === previewUrl ? data.url : url));
        setPendingInspectionFiles((current) => {
          const { [previewUrl]: _uploaded, ...remaining } = current;
          return remaining;
        });
        URL.revokeObjectURL(previewUrl);
      }
      return uploadedImages;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Tải ảnh kiểm định thất bại. Hãy thử lại.");
      return null;
    } finally {
      setUploadingImages(false);
    }
  };

  const moveInspectionImage = (from: number, to: number) => {
    if (from === to) return;
    setConditionImages((images) => {
      const reordered = [...images];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      return reordered;
    });
    setConditionImageCaptions((captions) => {
      const reordered = [...captions];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved ?? "");
      return reordered;
    });
  };

  const removeInspectionImage = (index: number) => {
    setConditionImages((images) => images.filter((_, i) => i !== index));
    setConditionImageCaptions((captions) => captions.filter((_, i) => i !== index));
  };

  const handleProductSelect = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p?.base_price) {
      setStartingPrice(Number(p.base_price));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productId && !auctionId) {
      setError("Vui lòng chọn sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls = Object.keys(pendingInspectionFiles).some((url) => conditionImages.includes(url))
        ? await uploadPendingInspectionImages(conditionImages)
        : conditionImages;
      if (!imageUrls) return;
      const detailValues = {
        specs: specs.filter((row) => row.label.trim() && row.value.trim()),
        condition: {
          grade: conditionGrade.trim(),
          summary: conditionSummary.filter((line) => line.trim()),
          attributes: conditionAttributes.filter((row) => row.label.trim() && row.value.trim()),
          images: imageUrls,
          image_captions: imageUrls.map((_, index) => conditionImageCaptions[index] ?? ""),
        },
        accessories: accessories.filter((item) => item.trim()),
      };
      const product_details = detailValues.condition.grade || detailValues.specs.length || detailValues.condition.summary.length || detailValues.condition.attributes.length || detailValues.condition.images.length || detailValues.accessories.length ? detailValues : null;
      const res = await fetch(auctionId ? `/api/auctions/${auctionId}` : "/api/auctions", {
        method: auctionId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auctionId ? { product_details, bin_price: binPrice ? Number(binPrice) : null, required_customer_level: requiredLevel, required_order_count: requiredOrders, limit_bids_per_user: limitBids, max_bids_per_user: limitBids ? maxBids : null, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), anti_snipe_minutes: antiSnipeMinutes, winner_checkout_hours: winnerCheckoutHours, max_winner_cascades: maxWinnerCascades, status, is_featured: isFeatured, ...(canEditPricing ? { starting_price: startingPrice, increment_type: incrementType, increment_value: incrementValue } : {}) } : {
          product_id: productId,
          starting_price: startingPrice,
          bin_price: binPrice ? Number(binPrice) : null,
          increment_type: incrementType,
          increment_value: incrementValue,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          anti_snipe_minutes: antiSnipeMinutes,
          winner_checkout_hours: winnerCheckoutHours,
          max_winner_cascades: maxWinnerCascades,
          required_customer_level: requiredLevel,
          required_order_count: requiredOrders,
          limit_bids_per_user: limitBids,
          max_bids_per_user: limitBids ? maxBids : null,
          status,
          is_featured: isFeatured,
          product_details,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (auctionId ? "Không thể cập nhật phiên đấu giá" : "Không thể tạo phiên đấu giá"));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="flex max-h-[80vh] w-full max-w-[min(70vw,80rem)] max-sm:max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl shadow-slate-900/10">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Gavel size={20} className="text-emerald-700" />
            {auctionId ? "Chỉnh sửa chi tiết đấu giá" : "Tạo phiên đấu giá mới"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 py-4 md:grid-cols-2">
            <div className="min-h-0 overflow-y-auto md:pr-2">
          <section aria-label="Xem trước nội dung trên storefront" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Xem trước trên cửa hàng</h4>
                <p className="text-[11px] text-slate-600">Chỉ hiển thị các mục đã nhập đầy đủ.</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-emerald-800 border border-emerald-200">Preview</span>
            </div>

            {previewSpecs.length > 0 && <div className="rounded-lg border border-slate-200 bg-white p-3">
              <h5 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">Thông số sản phẩm</h5>
              <div className="grid grid-cols-2 gap-x-4">
                {previewSpecs.map((item, index) => <div key={`${item.label}-${index}`} className="border-b border-slate-100 py-2 last:border-0">
                  <div className="text-[10px] text-slate-500">{item.label.trim()}</div>
                  <div className="text-xs font-bold text-slate-900 break-words">{item.value.trim()}</div>
                </div>)}
              </div>
            </div>}

            {(startingPrice > 0 || incrementValue > 0 || binPrice || requiredLevel > 0 || requiredOrders > 0 || limitBids) && <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1 text-xs">
              <h5 className="font-bold uppercase tracking-wider text-slate-600">Giá & điều kiện tham gia</h5>
              {startingPrice > 0 && <p>Giá khởi điểm: <strong>{new Intl.NumberFormat("vi-VN").format(startingPrice)} ₫</strong></p>}
              {incrementValue > 0 && <p>Bước giá: <strong>{incrementType === "fixed" ? `${new Intl.NumberFormat("vi-VN").format(incrementValue)} ₫` : `${incrementValue}%`}</strong></p>}
              {binPrice && <p>Mua ngay (BIN): <strong>{new Intl.NumberFormat("vi-VN").format(Number(binPrice))} ₫</strong></p>}
              {requiredLevel > 0 && <p>Cấp độ tối thiểu: {requiredLevel}</p>}{requiredOrders > 0 && <p>Số đơn tối thiểu: {requiredOrders}</p>}{limitBids && <p>Giới hạn {maxBids} lượt bid/người</p>}
            </div>}

            {(previewGrade || previewSummary.length > 0 || previewAttributes.length > 0) && <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Camera size={14} className="text-amber-700" />
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">Tình trạng thực tế</h5>
                {previewGrade && <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">{previewGrade}</span>}
              </div>
              {(previewSummary.length > 0 || previewAttributes.length > 0) && <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Đánh giá chi tiết tình trạng</div>}
              {previewSummary.length > 0 && <div className="rounded-md bg-slate-50 p-2 space-y-1">
                {previewSummary.map((item, index) => <div key={`${item}-${index}`} className="flex items-start gap-2 text-[11px] text-slate-800"><span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" /><span>{item}</span></div>)}
              </div>}
              {previewAttributes.length > 0 && <div className="grid grid-cols-2 gap-2">
                {previewAttributes.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-md bg-slate-50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{item.label.trim()}</div>
                  <div className="text-xs font-bold text-slate-900 break-words">{item.value.trim()}</div>
                </div>)}
              </div>}
            {conditionImages.length > 0 && <div className="grid grid-cols-3 gap-2">{conditionImages.map((url, index) => <div key={`${url}-${index}`}><img src={url} alt={`Ảnh kiểm định ${index + 1}`} className="h-24 min-h-24 w-full rounded object-cover" /></div>)}</div>}
            </div>}

            {previewAccessories.length > 0 && <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
              <h5 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600"><Box size={13} /> Bộ phụ kiện đi kèm trong hộp</h5>
            {previewAccessories.map((item, index) => <div key={`${item}-${index}`} className="flex items-start gap-2 text-xs text-slate-800"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{item}</div>)}
            </div>}

            {previewGrade && <p className="text-xs text-slate-600">{previewGradeText[previewGrade]}</p>}
            {previewSpecs.length === 0 && !previewGrade && previewSummary.length === 0 && previewAttributes.length === 0 && previewAccessories.length === 0 && conditionImages.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">Chưa có chi tiết nào để hiển thị.</p>}
          </section>
            {auctionId && <section aria-labelledby="auction-bidders-heading" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 id="auction-bidders-heading" className="text-sm font-bold text-slate-900">Khách hàng đã bid</h4>
                <span className="text-xs text-slate-600">{totalBids} lượt bid · {new Set(bidders.map((bid) => bid.name)).size} khách</span>
              </div>
              {bidders.length > 0 ? <ul className="mt-2 max-h-48 divide-y divide-slate-200 overflow-y-auto">
                {bidders.map((bid, index) => <li key={`${bid.created_at}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <span className="min-w-0 truncate text-slate-700">{bid.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{new Intl.NumberFormat("vi-VN").format(bid.amount)} ₫</span>
                  <time className="shrink-0 text-slate-500" dateTime={bid.created_at}>{new Date(bid.created_at).toLocaleString("vi-VN")}</time>
                </li>)}
              </ul> : <p className="mt-2 text-xs text-slate-500">Chưa có lượt bid.</p>}
            </section>}
            </div>
            <div className="min-h-0 space-y-4 overflow-y-auto md:pl-2">
          {auctionId && <div className="text-sm text-slate-600">Cập nhật chi tiết cho <span className="font-semibold text-slate-900">{auctionProductName || "sản phẩm phiên đấu giá"}</span></div>}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Chi tiết sản phẩm</h4>
            {specs.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input aria-label={`Tên thông số ${index + 1}`} value={row.label} onChange={(e) => setSpecs(specs.map((x, i) => i === index ? { ...x, label: e.target.value } : x))} placeholder="Thông số" className="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs" />
                <input aria-label={`Giá trị thông số ${index + 1}`} value={row.value} onChange={(e) => setSpecs(specs.map((x, i) => i === index ? { ...x, value: e.target.value } : x))} placeholder="Giá trị" className="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs" />
                <button type="button" onClick={() => setSpecs(specs.filter((_, i) => i !== index))} className="px-2 text-rose-700" aria-label="Xóa thông số">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setSpecs([...specs, { label: "", value: "" }])} className="text-xs text-emerald-800 hover:text-emerald-900">+ Thêm thông số</button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Camera size={16} className="text-amber-700" />Tình trạng thực tế</h4>
            <label className="block text-xs font-semibold" htmlFor="condition-grade">Grade kiểm định</label>
            <select id="condition-grade" value={conditionGrade} onChange={(e) => setConditionGrade(e.target.value)} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs">
              <option value="">Chưa phân loại</option>
              {(["S", "A", "B", "C", "D"] as const).map((grade) => <option key={grade} value={grade}>{previewGradeText[grade]}</option>)}
            </select>
            {conditionGrade && <p className="text-xs text-slate-600">{previewGradeText[conditionGrade]}</p>}
            {conditionSummary.map((line, index) => <div key={index} className="flex gap-2"><input aria-label={`Mô tả tình trạng ${index + 1}`} value={line} onChange={(e) => setConditionSummary(conditionSummary.map((x, i) => i === index ? e.target.value : x))} placeholder="Mô tả kiểm định" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs" /><button type="button" onClick={() => setConditionSummary(conditionSummary.filter((_, i) => i !== index))} className="px-2 text-rose-700" aria-label="Xóa mô tả tình trạng">×</button></div>)}
            <button type="button" onClick={() => setConditionSummary([...conditionSummary, ""])} className="text-xs text-emerald-800 hover:text-emerald-900">+ Thêm mô tả</button>
            {conditionAttributes.map((row, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input aria-label={`Tên tiêu chí ${index + 1}`} value={row.label} onChange={(e) => setConditionAttributes(conditionAttributes.map((x, i) => i === index ? { ...x, label: e.target.value } : x))} placeholder="Tiêu chí" className="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs" /><input aria-label={`Kết quả tiêu chí ${index + 1}`} value={row.value} onChange={(e) => setConditionAttributes(conditionAttributes.map((x, i) => i === index ? { ...x, value: e.target.value } : x))} placeholder="Kết quả" className="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-xs" /><button type="button" onClick={() => setConditionAttributes(conditionAttributes.filter((_, i) => i !== index))} className="px-2 text-rose-700" aria-label="Xóa tiêu chí">×</button></div>)}
            <button type="button" onClick={() => setConditionAttributes([...conditionAttributes, { label: "", value: "" }])} className="text-xs text-emerald-800 hover:text-emerald-900">+ Thêm tiêu chí</button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Ảnh kiểm định</h4>
            <p className="text-xs text-slate-600">Kéo ảnh để sắp xếp thứ tự hiển thị. Xóa ảnh khỏi phiên không xóa file đã lưu trữ.</p>
            {conditionImages.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{conditionImages.map((url, index) => <div key={`${url}-${index}`} draggable={!pendingInspectionFiles[url]} onDragStart={() => setDraggedImageIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedImageIndex !== null) moveInspectionImage(draggedImageIndex, index); setDraggedImageIndex(null); }} onDragEnd={() => setDraggedImageIndex(null)} className={`relative rounded-lg border border-slate-200 bg-white p-1 ${pendingInspectionFiles[url] ? "border-dashed border-emerald-300" : "cursor-grab active:cursor-grabbing"} ${draggedImageIndex === index ? "opacity-50" : ""}`}><img src={url} alt={`Ảnh kiểm định ${index + 1}`} className="h-24 w-full rounded object-cover" /><span className="absolute bottom-2 left-2 rounded bg-slate-950/75 px-2 py-0.5 text-[10px] font-bold text-white">#{index + 1}{pendingInspectionFiles[url] ? " · Chờ lưu" : ""}</span><button type="button" aria-label={`Xóa ảnh kiểm định ${index + 1}`} onClick={() => { removeInspectionImage(index); if (pendingInspectionFiles[url]) { URL.revokeObjectURL(url); setPendingInspectionFiles((files) => { const { [url]: _removed, ...remaining } = files; return remaining; }); } }} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg text-rose-700 shadow">×</button><label className="mt-1 block text-[10px] font-semibold text-slate-600">Caption ảnh {index + 1}<input aria-label={`Caption ảnh kiểm định ${index + 1}`} maxLength={500} value={conditionImageCaptions[index] ?? ""} onChange={(event) => setConditionImageCaptions((captions) => conditionImages.map((_, i) => i === index ? event.target.value : captions[i] ?? ""))} placeholder="Mô tả ngắn cho ảnh (tùy chọn)" className="mt-1 h-8 w-full rounded border border-slate-300 px-2 text-xs" /></label></div>)}</div>}
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setIsInspectionDropActive(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsInspectionDropActive(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsInspectionDropActive(false);
                if (event.dataTransfer.files.length) void handleInspectionUpload(event.dataTransfer.files);
              }}
              className={`flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-center transition-colors ${isInspectionDropActive ? "border-emerald-700 bg-emerald-50" : "border-slate-300 bg-white hover:border-emerald-600 hover:bg-emerald-50/40"}`}
            >
              <Camera size={20} className="text-emerald-700" />
              <span className="text-xs font-semibold text-slate-800">Thả ảnh vào đây hoặc chọn nhiều ảnh</span>
              <span className="text-[11px] text-slate-500">Ảnh chỉ được tải lên khi bấm Lưu/Tạo</span>
              <input aria-label="Chọn ảnh kiểm định" type="file" accept="image/*" multiple disabled={submitting} onChange={(e) => { void handleInspectionUpload(e.target.files); e.currentTarget.value = ""; }} className="sr-only" />
            </label>
            {Object.keys(pendingInspectionFiles).some((url) => conditionImages.includes(url)) && <p className="text-xs text-amber-800">{Object.keys(pendingInspectionFiles).filter((url) => conditionImages.includes(url)).length} ảnh sẽ tải lên khi bạn bấm Lưu/Tạo.</p>}
            {uploadingImages && <p role="status" className="text-xs text-slate-600"><Loader2 className="inline animate-spin" size={14} /> Đang tải ảnh...</p>}
            {uploadError && <p role="alert" className="text-xs text-rose-700">{uploadError}</p>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Box size={15} />Phụ kiện đi kèm</h4>
            {accessories.map((item, index) => <div key={index} className="flex gap-2"><input aria-label={`Phụ kiện ${index + 1}`} value={item} onChange={(e) => setAccessories(accessories.map((x, i) => i === index ? e.target.value : x))} placeholder="Tên phụ kiện" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs" /><button type="button" onClick={() => setAccessories(accessories.filter((_, i) => i !== index))} className="px-2 text-rose-700" aria-label="Xóa phụ kiện">×</button></div>)}
            <button type="button" onClick={() => setAccessories([...accessories, ""])} className="text-xs text-emerald-800 hover:text-emerald-900">+ Thêm phụ kiện</button>
          </section>
          {/* Product Picker */}
          {!auctionId && <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn sản phẩm đấu giá <span className="text-rose-400">*</span>
            </label>
             {loadingProducts ? (
              <div className="h-10 flex items-center gap-2 text-xs text-slate-600">
                <Loader2 size={16} className="animate-spin" />
                <span>Đang tải danh sách sản phẩm...</span>
              </div>
            ) : (
              <select
                required
                value={productId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({new Intl.NumberFormat("vi-VN").format(p.base_price)} ₫)
                  </option>
                ))}
              </select>
            )}
          </div>}

          {/* Pricing Grid */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div><h4 className="text-sm font-bold text-slate-900">Cấu hình giá</h4>{!canEditPricing && <p className="mt-1 text-xs text-amber-800">Không thể thay đổi giá khi phiên đang hoạt động hoặc đã có lượt đặt giá.</p>}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá khởi điểm (VND) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                disabled={!canEditPricing}
                min={1000}
                step={1000}
                value={startingPrice}
                onChange={(e) => setStartingPrice(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p aria-live="polite" className="mt-1 text-right text-xs tabular-nums text-slate-600">{new Intl.NumberFormat("vi-VN").format(startingPrice)} ₫</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá mua ngay - BIN (Tùy chọn)
              </label>
              <input
                type="number"
                disabled={!canEditPricing}
                min={startingPrice + 1000}
                step={1000}
                placeholder="Để trống nếu không cho mua ngay"
                value={binPrice}
                onChange={(e) => setBinPrice(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p aria-live="polite" className="mt-1 text-right text-xs tabular-nums text-slate-600">{binPrice && Number.isFinite(Number(binPrice)) ? `${new Intl.NumberFormat("vi-VN").format(Number(binPrice))} ₫` : "Không đặt giá mua ngay"}</p>
            </div>
           </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại bước giá tăng
              </label>
              <select
                disabled={!canEditPricing}
                value={incrementType}
                onChange={(e) => {
                  const val = e.target.value as "fixed" | "percentage";
                  setIncrementType(val);
                  setIncrementValue(val === "percentage" ? 5 : 20000);
                }}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="fixed">Cố định theo số tiền (VND)</option>
                <option value="percentage">Theo % giá hiện tại</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá trị bước tăng {incrementType === "percentage" ? "(%)" : "(VND)"}
              </label>
              <input
                type="number"
                required
                disabled={!canEditPricing}
                min={incrementType === "percentage" ? 1 : 1000}
                value={incrementValue}
                onChange={(e) => setIncrementValue(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <p aria-live="polite" className="mt-1 text-right text-xs tabular-nums text-slate-600">{incrementType === "fixed" ? `${new Intl.NumberFormat("vi-VN").format(incrementValue)} ₫ mỗi lượt` : `${new Intl.NumberFormat("vi-VN").format(incrementValue)}% mỗi lượt`}</p>
            </div>
          </div>
          </section>

          <section aria-labelledby="auction-settings-heading" className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <h4 id="auction-settings-heading" className="text-sm font-bold text-slate-900">Cấu hình phiên đấu giá</h4>
            <p className="mt-1 text-xs text-slate-600">Lịch, trạng thái và quy tắc thanh toán của phiên.</p>
          </div>

          {/* Timing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời gian bắt đầu
              </label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời gian kết thúc
              </label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Rules: Anti-snipe & Settlement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Bù giờ Anti-snipe (phút)
              </label>
              <input
                type="number"
                min={0}
                value={antiSnipeMinutes}
                onChange={(e) => setAntiSnipeMinutes(Number(e.target.value))}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Hạn thanh toán (giờ)
              </label>
              <input
                type="number"
                min={1}
                value={winnerCheckoutHours}
                onChange={(e) => setWinnerCheckoutHours(Number(e.target.value))}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Lượt cascade tối đa
              </label>
              <input
                type="number"
                min={0}
                value={maxWinnerCascades}
                onChange={(e) => setMaxWinnerCascades(Number(e.target.value))}
                className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          {/* Eligibility Conditions */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Điều kiện tham gia</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Cấp bậc khách hàng tối thiểu (Level)
                </label>
                <select
                  value={requiredLevel}
                  onChange={(e) => setRequiredLevel(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                >
                  <option value={0}>Không yêu cầu</option>
                  {customerRanks.map((rank) => <option key={rank.level} value={rank.level}>Level {rank.level} · {rank.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Số đơn hàng đã mua tối thiểu
                </label>
                <input
                  type="number"
                  min={0}
                  value={requiredOrders}
                  onChange={(e) => setRequiredOrders(Number(e.target.value))}
                  placeholder="0 = Không yêu cầu"
                  className="w-full h-9 px-2.5 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={limitBids}
                  onChange={(e) => setLimitBids(e.target.checked)}
                  className="checkbox checkbox-xs checkbox-primary"
                />
                <span>Giới hạn số lượt bid của mỗi người</span>
              </label>

              {limitBids && (
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span>Tối đa:</span>
                  <input
                    type="number"
                    min={1}
                    value={maxBids}
                    onChange={(e) => setMaxBids(Number(e.target.value))}
                    className="w-16 h-8 px-2 rounded-lg bg-white border border-slate-300 text-xs font-mono text-slate-900"
                  />
                  <span>lượt</span>
                </div>
              )}
            </div>
          </section>

          {/* Status & Featured Toggle */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="toggle toggle-warning toggle-sm"
                />
                <span className="flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-400" />
                  Nổi bật Homepage
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                <span className="text-slate-600">Trạng thái:</span>
                <select
                   value={status}
                   onChange={(e) => setStatus(e.target.value as typeof status)}
                  className="h-8 px-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900"
                >
                  <option value="active">Active (Kích hoạt ngay)</option>
                  <option value="draft">Draft (Bản nháp)</option>
                  {auctionId && <><option value="ended">Ended</option><option value="cancelled">Cancelled</option></>}
                </select>
              </label>
            </div>
          </div>
          </section>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

            </div>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>{auctionId ? "Lưu chi tiết" : "Tạo phiên đấu giá"}</span>
            </button>
           </div>
         </form>
       </div>
     </div>
  );
}
