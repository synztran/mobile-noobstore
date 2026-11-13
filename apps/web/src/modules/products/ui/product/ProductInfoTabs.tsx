"use client";
import { safeHtml } from "@/lib/safe-html";

import type { ProductDetail } from "@/modules/products/types";
import { useShippingEstimate } from "@/lib/react-query/shipping/api/useShippingQueries";
import clsx from "clsx";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";

// Reviews only render when the "Đánh giá" tab is opened — split them out of the
// initial route bundle so the product page hydrates less client JS.
const ProductReviews = dynamic(
  () =>
    import("@/modules/products/ui/product/ProductReviews").then((m) => ({
      default: m.ProductReviews,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-surface-container-high" />
        <div className="h-24 rounded-xl bg-surface-container-low" />
        <div className="h-24 rounded-xl bg-surface-container-low" />
      </div>
    ),
  }
);

interface Props {
  product: ProductDetail;
  editorialContent: string;
  specItems: { label: string; value: string }[];
  productSlug: string;
}

const TABS = ["Mô tả", "Thông số", "Vận chuyển", "Đánh giá"] as const;
const DESKTOP_TABS = ["Mô tả", "Thông số"] as const;
type Tab = (typeof TABS)[number];

// ── Shared tab content ─────────────────────────────────────────────────────
interface ContentProps {
  activeTab: Tab;
  editorialContent: string;
  specItems: { label: string; value: string }[];
  productSlug: string;
  estimates: {
    id: string;
    name: string;
    description: string | null;
    estimated_date_min: string;
    estimated_date_max: string;
  }[];
  estimatesLoading: boolean;
  descExpanded: boolean;
  setDescExpanded: (v: boolean) => void;
}

function TabContent({
  activeTab,
  editorialContent,
  specItems,
  productSlug,
  estimates,
  estimatesLoading,
  descExpanded,
  setDescExpanded,
}: ContentProps) {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);

  useLayoutEffect(() => {
    if (activeTab !== "Mô tả") return;
    const content = descriptionRef.current;
    if (!content) return;

    const measureOverflow = () => {
      const overflows = content.scrollHeight > 90;
      setDescriptionOverflows(overflows);
      if (!overflows) setDescExpanded(false);
    };

    measureOverflow();
    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(content);
    const mutationObserver = new MutationObserver(measureOverflow);
    mutationObserver.observe(content, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [activeTab, editorialContent, setDescExpanded]);

  return (
    <>
      {activeTab === "Mô tả" && (
        <div>
          <div
            className={`duration-350 relative overflow-hidden transition-all ease-[cubic-bezier(0.32,0.72,0,1)] ${
              descExpanded ? "max-h-[9999px]" : "max-h-[90px]"
            }`}
          >
            <div
              ref={descriptionRef}
              className="editor-content pl-[8px] text-sm text-on-surface"
              dangerouslySetInnerHTML={{ __html: safeHtml(editorialContent) }}
            />
            {!descExpanded && descriptionOverflows && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface to-transparent" />
            )}
          </div>
          {descriptionOverflows && (
            <button
              type="button"
              onClick={() => setDescExpanded(!descExpanded)}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-surface-container px-4 py-2.5 text-xs font-black text-on-surface"
            >
              {descExpanded ? "Thu gọn" : "Xem thêm"}
              <ChevronDown
                className={`text-sm transition-transform duration-300 ${
                  descExpanded ? "-rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
      )}

      {activeTab === "Thông số" && (
        <div className="space-y-4">
          {specItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              {specItems.map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold leading-snug text-on-surface">
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Chưa có thông số kỹ thuật cho sản phẩm này.
            </p>
          )}
        </div>
      )}

      {activeTab === "Vận chuyển" && (
        <div className="space-y-4 text-sm text-on-surface-variant">
          {estimatesLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-surface-container-high" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-surface-container-high" />
                    <div className="h-3 w-48 rounded bg-surface-container" />
                  </div>
                </div>
              ))}
            </div>
          ) : estimates.length > 0 ? (
            estimates.map((method, i) => (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
                className="flex gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="currentColor"
                  >
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-on-surface">{method.name}</p>
                  <p className="mt-0.5">{method.description}</p>
                  <p className="mt-0.5 text-xs text-primary">
                    Nhận hàng{" "}
                    {new Date(method.estimated_date_min).toLocaleDateString(
                      "vi-VN"
                    )}
                    {" — "}
                    {new Date(method.estimated_date_max).toLocaleDateString(
                      "vi-VN"
                    )}
                  </p>
                </div>
              </motion.div>
            ))
          ) : null}
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-on-surface">Đổi trả trong 3 ngày</p>
              <p className="mt-0.5">
                Sản phẩm lỗi hoặc sản phẩm còn đủ seal và tag được đổi trả trong
                vòng 3 ngày kể từ khi nhận. Phí vận chuyển người mua chi trả
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-on-surface">Cam kết chính hãng</p>
              <p className="mt-0.5">
                Sản phẩm được kiểm định và cam kết hàng chính hãng 100%.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function ProductInfoTabs({
  product,
  editorialContent,
  specItems,
  productSlug,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Mô tả");
  const [descExpanded, setDescExpanded] = useState(false);
  const { data: shippingData, isLoading: estimatesLoading } =
    useShippingEstimate(activeTab === "Vận chuyển");
  const estimates = shippingData?.estimates ?? [];

  const contentProps: ContentProps = {
    activeTab,
    editorialContent,
    specItems,
    productSlug,
    estimates,
    estimatesLoading,
    descExpanded,
    setDescExpanded,
  };

  return (
    <section className="px-4 md:rounded-2xl md:bg-surface md:p-4 md:shadow-ambient-sm lg:bg-transparent lg:p-0 lg:shadow-none">
      {/* ── Mobile: sticky horizontal tab bar ── */}
      <LayoutGroup>
        <div className="sticky top-[72px] z-10 border-b border-outline-variant/20 bg-surface md:static lg:hidden">
          <div className="flex justify-between gap-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "relative p-2 text-xs font-black uppercase tracking-widest transition-colors",
                  activeTab === tab
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </LayoutGroup>

      {/* ── Mobile tab content ── */}
      <div className="pt-4 lg:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <TabContent {...contentProps} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Desktop: sidebar layout ── */}
      <div className="hidden lg:flex lg:gap-0">
        {/* Sidebar nav */}
        <nav className="w-36 shrink-0 border-r border-outline-variant/20 pr-2 pt-1">
          <ul className="space-y-0.5">
            {DESKTOP_TABS.map((tab) => (
              <li key={tab}>
                <button
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-black uppercase tracking-wider transition-colors",
                    activeTab === tab
                      ? "bg-primary/[0.08] text-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {/* Content */}
        <div className="max-h-[500px] min-w-0 flex-1 overflow-y-auto pl-2 pr-1 pt-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <TabContent {...contentProps} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
