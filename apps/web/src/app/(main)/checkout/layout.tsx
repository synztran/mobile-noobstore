"use client";

import Icon from "@/components/ui/Icon";
import { useIsMounted } from "@/hooks/useIsMounted";
import { useCartStore } from "@/modules/cart/client/useCartStore";
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
  const cartId = useCartStore((s) => s.cartId);
  const orderId = useCheckoutStore((s) => s.orderId);
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
      href: orderId ? `/checkout/checking/${orderId}` : "/checkout/checking",
      icon: "rate_review",
      label: "Hoàn tất",
      step: 3,
    },
  ];

  const currentStep = steps.findIndex((s) =>
    pathname.includes(s.href.split("/")[2])
  );

  return (
    <div className="min-h-screen bg-background">
      {/* TopAppBar */}
      <nav className="fixed top-0 z-50 w-full">
        <div className="glass-nav top-nav-pad flex items-center justify-between px-4">
          <Link
            href="/"
            className="transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <Icon name="arrow_back" className="text-2xl text-primary" />
          </Link>
          <h1 className="font-sans text-lg font-bold uppercase tracking-tight text-on-surface">
            Thanh toán
          </h1>
          <Link
            href="/shop"
            className="transition-opacity duration-200 hover:opacity-70 active:scale-95"
          >
            <Icon name="shopping_bag" className="text-2xl text-primary" />
          </Link>
        </div>

        {/* DaisyUI Steps bar */}
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

      <main className="pb-18 mx-auto mt-[calc(env(safe-area-inset-top,0px)+9rem)] w-full px-4">
        {children}
      </main>
    </div>
  );
}
