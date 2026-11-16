"use client";

import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useCheckoutStore, useDiscountStore } from "@/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const mounted = useIsMounted();
  const orderNumber = useCheckoutStore((s) => s.orderNumber);
  const resetDiscount = useDiscountStore((s) => s.resetDiscount);

  // Clear applied voucher when the customer leaves the checkout flow
  useEffect(() => {
    return () => {
      resetDiscount();
    };
  }, [resetDiscount]);

  const steps = [
    {
      href: "/checkout/shipping",
      icon: "local_shipping",
      label: "Vận chuyển",
      step: 1,
    },
    {
      href: "/checkout/summary",
      icon: "summary",
      label: "Kiểm tra",
      step: 2,
    },
    {
      href: orderNumber ? `/checkout/checking/${orderNumber}` : "/checkout/checking",
      icon: "rate_review",
      label: "Hoàn tất",
      step: 3,
    },
  ];

  const currentStep = steps.findIndex((s) =>
    pathname.includes(s.href.split("/")[2])
  );

  return (
    <div className="min-h-screen bg-background md:min-h-0 md:bg-transparent">
      {/* Mobile TopAppBar & Stepper (Screen < 768px) */}
      <nav className="fixed top-0 z-[999] w-full md:hidden">
        <div className="glass-nav top-nav-pad flex items-center justify-between px-4">
          <Link
            href="/"
            className="transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <ArrowLeft className="h-6 w-6 text-primary" />
          </Link>
          <h1 className="font-sans text-lg font-bold uppercase tracking-tight text-on-surface">
            Thanh toán
          </h1>
          <Link
            href="/shop"
            className="transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <ShoppingBag className="h-6 w-6 text-primary" />
          </Link>
        </div>

        {/* DaisyUI Steps bar on Mobile */}
        <div className="glass-nav border-t border-outline-variant/10 px-4 py-2">
          {!mounted ? (
            <div className="flex w-full animate-pulse justify-around py-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-4 w-16 rounded-full bg-surface-container"
                />
              ))}
            </div>
          ) : (
            <ul className="steps steps-horizontal w-full">
              {steps.map(({ href, label, step }) => {
                const idx = step - 1;
                const isPast = idx < currentStep;
                const isActive = idx === currentStep;
                const canNavigate = isPast && currentStep !== 3;

                return (
                  <li
                    key={href}
                    data-content={isPast ? "✓" : String(step)}
                    className={[
                      "step text-[10px] font-bold uppercase tracking-widest",
                      isPast || isActive ? "step-primary" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {canNavigate ? (
                      <Link
                        href={href}
                        className="flex flex-col items-center gap-0.5"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="flex flex-col items-center gap-0.5">
                        {label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      {/* Desktop Dedicated Stepper & Brand Bar (Screen >= 768px) */}
      <header className="hidden border-b border-outline-variant/20 bg-surface/80 backdrop-blur-md md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-primary">
              Thanh toán an toàn
            </span>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-3 sm:gap-6">
            {steps.map(({ href, label, step }, index) => {
              const idx = step - 1;
              const isPast = idx < currentStep;
              const isActive = idx === currentStep;
              const canNavigate = isPast && currentStep !== 3;

              return (
                <div key={href} className="flex items-center gap-3 sm:gap-4">
                  {index > 0 && (
                    <div
                      className={`h-[2px] w-6 sm:w-10 transition-colors ${
                        isPast || isActive ? "bg-primary" : "bg-outline-variant/30"
                      }`}
                    />
                  )}
                  {canNavigate ? (
                    <Link
                      href={href}
                      className="group flex items-center gap-2 text-xs font-bold transition-colors hover:text-primary"
                    >
                      <div
                        className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-black transition-all ${
                          isPast
                            ? "bg-primary text-surface"
                            : isActive
                              ? "bg-primary text-surface ring-4 ring-primary/20"
                              : "bg-surface-container text-on-surface-variant group-hover:bg-primary/20"
                        }`}
                      >
                        {isPast ? "✓" : step}
                      </div>
                      <span
                        className={
                          isActive
                            ? "font-extrabold text-primary"
                            : isPast
                              ? "text-on-surface"
                              : "text-on-surface-variant/70"
                        }
                      >
                        {label}
                      </span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <div
                        className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-black transition-all ${
                          isPast
                            ? "bg-primary text-surface"
                            : isActive
                              ? "bg-primary text-surface ring-4 ring-primary/20"
                              : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {isPast ? "✓" : step}
                      </div>
                      <span
                        className={
                          isActive
                            ? "font-extrabold text-primary"
                            : isPast
                              ? "text-on-surface"
                              : "text-on-surface-variant/70"
                        }
                      >
                        {label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link
              href="/shop"
              className="flex items-center gap-1 font-bold text-primary transition-opacity hover:opacity-80"
            >
              <ShoppingBag size={14} />
              <span>Tiếp tục mua hàng</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-[calc(env(safe-area-inset-top,0px)+9rem)] w-full px-4 pb-18 md:mt-6 md:max-w-7xl md:px-6 md:pb-16 lg:px-8">
        {children}
      </main>
    </div>
  );
}
