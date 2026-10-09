import { afterEach, describe, expect, it, vi } from "vitest";
import type { CartItem, ShippingDetails } from "@/lib/data";

vi.mock("gooey-toast", () => ({
  gooeyToast: {
    success: () => {},
    error: () => {},
    info: () => {},
    warning: () => {},
  },
}));

import { useCheckoutStore } from "./index";

function makeShipping(overrides: Partial<ShippingDetails> = {}): ShippingDetails {
  return {
    fullName: "Nguyen Van A",
    streetAddress: "123 Le Loi",
    apartment: "Floor 5",
    city: "Ho Chi Minh",
    cityCode: "79",
    district: "District 1",
    districtCode: "760",
    ward: "Ben Nghe",
    wardCode: "26804",
    postalCode: "70000",
    phoneNumber: "0901234567",
    deliverySpeed: "standard",
    shippingMethodId: "standard",
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    product: {
      id: "prod-1",
      name: "Test Product",
      category: "Keyboards",
      base_price: 1_000_000,
      stock_quantity: 10,
      brand: "TestBrand",
    },
    variant: null,
    quantity: 1,
    ...overrides,
  };
}

describe("useCheckoutStore", () => {
  afterEach(() => {
    useCheckoutStore.getState().clearCheckout();
  });

  // ── setShipping ──────────────────────────────────────────────────────────

  describe("setShipping", () => {
    it("stores shipping details and cost", () => {
      const shipping = makeShipping();
      useCheckoutStore.getState().setShipping(shipping, 30_000);

      const state = useCheckoutStore.getState();
      expect(state.shipping).toEqual(shipping);
      expect(state.shippingCost).toBe(30_000);
    });

    it("updates existing shipping details", () => {
      useCheckoutStore.getState().setShipping(makeShipping({ fullName: "A" }), 10_000);
      useCheckoutStore.getState().setShipping(makeShipping({ fullName: "B" }), 20_000);

      expect(useCheckoutStore.getState().shipping?.fullName).toBe("B");
      expect(useCheckoutStore.getState().shippingCost).toBe(20_000);
    });
  });

  // ── setOrder ─────────────────────────────────────────────────────────────

  describe("setOrder", () => {
    it("stores order details", () => {
      const items = [makeCartItem()];
      useCheckoutStore.getState().setOrder("order-123", "ORD-ABC", 2_500_000, items);

      const state = useCheckoutStore.getState();
      expect(state.orderId).toBe("order-123");
      expect(state.orderNumber).toBe("ORD-ABC");
      expect(state.totalPrice).toBe(2_500_000);
      expect(state.orderedItems).toHaveLength(1);
    });
  });

  // ── payment type ─────────────────────────────────────────────────────────

  describe("payment type", () => {
    it("defaults to full payment", () => {
      expect(useCheckoutStore.getState().paymentType).toBe("full");
    });

    it("switches to deposit_cod", () => {
      useCheckoutStore.getState().setPaymentType("deposit_cod");
      expect(useCheckoutStore.getState().paymentType).toBe("deposit_cod");
    });

    // The store holds the raw value; the 1/20-80 bounds are applied by
    // clampDepositPercentage in lib/deposit.ts, which needs the order total.
    it("stores the deposit percentage as given", () => {
      useCheckoutStore.getState().setDepositPercentage(30);
      expect(useCheckoutStore.getState().depositPercentage).toBe(30);
    });
  });

  // ── shipping draft ───────────────────────────────────────────────────────

  describe("shipping draft", () => {
    it("saves and retrieves draft", () => {
      const draft = {
        fullName: "Test User",
        apartment: "Apt 1",
        phoneNumber: "0901234567",
        city: "Ho Chi Minh",
        district: "District 1",
        districtCode: "760",
        ward: "Ben Nghe",
        wardCode: "26804",
        streetAddress: "123 Main St",
        notes: "Leave at door",
      };

      useCheckoutStore.getState().saveShippingDraft(draft);
      expect(useCheckoutStore.getState().shippingFormDraft).toEqual(draft);
    });

    it("clears draft", () => {
      useCheckoutStore.getState().saveShippingDraft({ fullName: "X" } as never);
      useCheckoutStore.getState().clearShippingDraft();
      expect(useCheckoutStore.getState().shippingFormDraft).toBeNull();
    });
  });

  // ── clearCheckout ────────────────────────────────────────────────────────

  describe("clearCheckout", () => {
    it("resets all fields to defaults", () => {
      const store = useCheckoutStore.getState();
      store.setShipping(makeShipping(), 50_000);
      store.setOrder("ord-1", "ORD-1", 3_000_000, [makeCartItem()]);
      store.setPaymentType("deposit_cod");
      store.setDepositPercentage(30);

      useCheckoutStore.getState().clearCheckout();

      const state = useCheckoutStore.getState();
      expect(state.shipping).toBeNull();
      expect(state.shippingCost).toBe(0);
      expect(state.orderId).toBeNull();
      expect(state.orderNumber).toBeNull();
      expect(state.totalPrice).toBe(0);
      expect(state.orderedItems).toHaveLength(0);
      expect(state.paymentType).toBe("full");
      expect(state.depositPercentage).toBe(50);
      expect(state.shippingFormDraft).toBeNull();
    });
  });
});
