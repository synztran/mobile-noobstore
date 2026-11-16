"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { withAuthRedirect } from "@/modules/user/ui/withAuthRedirect";
import { DELIVERY_OPTIONS } from "@/constants";
import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { useShippingForm, type DeliverySpeed } from "@/hooks/useShippingForm";
import { resolveDeliveryOptions } from "@/lib/delivery-options";
import { ShippingMethod } from "@/lib/shipping-method";
import { cartItemsToGA, trackBeginCheckout } from "@/lib/analytics";
import { useCartStore } from "@/modules/cart/client/hooks/useCartStore";
import AddressFields from "./AddressFields";
import ContactInfoFields from "./ContactInfoFields";
import DeliveryMethodSection from "./DeliveryMethodSection";
import DiscountTeaser from "./DiscountTeaser";
import OrderSummary from "./OrderSummary";
import PickupSection from "./PickupSection";
import ShippingHeroHeader from "./ShippingHeroHeader";
import { ShippingPageSkeleton } from "./ShippingPageSkeleton";

const ShippingPage = () => {
  const {
    ready,
    form,
    setForm,
    distanceKm,
    isCalculatingFee,
    isSubmitting,
    cityTouched,
    setCityTouched,
    delivery,
    setDelivery,
    pickupDate,
    setPickupDate,
    pickupTime,
    setPickupTime,
    minPickupDate,
    pickupSlots,
    isPickup,
    isFeePending,
    handleChange,
    handleBlur,
    handleCityChange,
    isInvalid,
    isPickupFieldInvalid,
    setTouched,
    handleSubmit,
    isHCM,
    subtotal,
    shippingCost,
    orderTotal,
    immediateFee,
    basicFee,
    customerLocation,
    routeCoordinates,
    storeCoords,
    handleAddressSelect,
    hasPreOrder,
    preOrderEstimate,
    touched,
    addressDistanceError,
  } = useShippingForm();

  const cartItems = useCartStore((s) => s.items);
  const beginCheckoutFired = useRef(false);

  useEffect(() => {
    if (!ready || beginCheckoutFired.current || cartItems.length === 0) return;
    beginCheckoutFired.current = true;
    trackBeginCheckout(cartItemsToGA(cartItems), subtotal);
  }, [ready, cartItems, subtotal]);

  const cityCode = useMemo(
    () => VIETNAM_CITIES.find((c) => c.name === form.city)?.code ?? null,
    [form.city]
  );

  useEffect(() => {
    if (addressDistanceError) {
      const el = document.getElementById("address-street-field");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [addressDistanceError]);

  const handleDistrictChange = useCallback(
    (district: string) => {
      const districtCode = cityCode
        ? ((DISTRICT_MAP[cityCode] ?? []).find((d) => d.name === district)
            ?.code ?? "")
        : "";
      setForm((prev) => ({
        ...prev,
        streetAddress: "",
        district,
        districtCode,
        ward: "",
        wardCode: "",
      }));
    },
    [cityCode, setForm]
  );

  const handleWardChange = useCallback(
    (ward: string) => {
      setForm((prev) => ({ ...prev, streetAddress: "", ward }));
    },
    [setForm]
  );

  const handleWardCodeChange = useCallback(
    (wardCode: string) => {
      setForm((prev) => ({ ...prev, wardCode }));
    },
    [setForm]
  );

  const handleCityTouched = useCallback(
    () => setCityTouched(true),
    [setCityTouched]
  );

  const handleDeliveryChange = useCallback(
    (id: string) => {
      const speed = id as DeliverySpeed;
      if (speed === delivery) return;
      setDelivery(speed);
      setPickupDate("");
      setPickupTime("");
    },
    [delivery, setDelivery, setPickupDate, setPickupTime]
  );

  const handlePickupBlur = useCallback(
    (field: "pickupDate" | "pickupTime") => {
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    [setTouched]
  );

  const deliveryOptions = useMemo(
    () =>
      resolveDeliveryOptions({
        options: DELIVERY_OPTIONS,
        isHCM: !!isHCM,
        distanceFees: { express: immediateFee, standard: basicFee },
      }).map(({ option, price, isHidden }) => ({
        ...option,
        price,
        isHidden,
      })),
    [immediateFee, basicFee, isHCM]
  );

  if (!ready) {
    return <ShippingPageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <ShippingHeroHeader />

      <form
        onSubmit={handleSubmit}
        className="shipping-form lg:grid lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start lg:gap-8"
      >
        {/* Left Column: Form Fields */}
        <div className="space-y-4">
          {/* Card 1: Contact Info */}
          <section className="rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-ambient-sm md:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                👤
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight text-on-surface">
                  Thông tin người nhận
                </h2>
                <p className="text-[11px] text-on-surface-variant">
                  Thông tin dùng để liên hệ và xác nhận giao hàng
                </p>
              </div>
            </div>
            <ContactInfoFields
              fullName={form.fullName}
              phoneNumber={form.phoneNumber}
              fullNameInvalid={!!isInvalid("fullName", true)}
              phoneNumberInvalid={!!isInvalid("phoneNumber", true)}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </section>

          {/* Card 2: Delivery Destination & Mode */}
          <section className="rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-ambient-sm md:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10">
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                  📍
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight text-on-surface">
                    {isPickup ? "Nhận hàng tại cửa hàng" : "Địa chỉ nhận hàng"}
                  </h2>
                  <p className="text-[11px] text-on-surface-variant">
                    {isPickup
                      ? "Đến trực tiếp cửa hàng NoobStore nhận sản phẩm"
                      : "Giao hàng tận nơi trên toàn quốc"}
                  </p>
                </div>
              </div>

              {/* Mode Toggle Switch */}
              <div className="flex items-center gap-1.5 rounded-xl bg-surface-container p-1">
                <button
                  type="button"
                  onClick={() => handleDeliveryChange(ShippingMethod.Standard)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${
                    !isPickup
                      ? "bg-surface text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Giao tận nơi
                </button>
                <button
                  type="button"
                  onClick={() => handleDeliveryChange(ShippingMethod.Pickup)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all ${
                    isPickup
                      ? "bg-surface text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  Nhận tại shop
                </button>
              </div>
            </div>

            {!isPickup ? (
              <AddressFields
                city={form.city}
                district={form.district}
                ward={form.ward}
                streetAddress={form.streetAddress}
                apartment={form.apartment}
                notes={form.notes}
                cityCode={cityCode}
                cityTouched={cityTouched}
                streetTouched={!!touched.streetAddress}
                isHCM={!!isHCM}
                onCityChange={handleCityChange}
                onDistrictChange={handleDistrictChange}
                onWardChange={handleWardChange}
                onWardCodeChange={handleWardCodeChange}
                onAddressSelect={handleAddressSelect}
                onChange={handleChange}
                onBlur={handleBlur}
                onCityTouched={handleCityTouched}
                customerLocation={customerLocation}
                storeCoords={storeCoords}
                routeCoordinates={routeCoordinates}
                distanceKm={distanceKm}
                isCalculatingFee={isCalculatingFee}
                addressDistanceError={addressDistanceError}
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🏬</span>
                    <div className="text-xs">
                      <p className="font-bold text-on-surface">
                        Cửa hàng NoobStore TP.HCM
                      </p>
                      <p className="mt-0.5 text-on-surface-variant">
                        70/4b đường 47, Phường Hiệp Bình Chánh, Thủ Đức, TP.Hồ
                        Chí Minh
                      </p>
                      <p className="mt-1 font-semibold text-primary">
                        Giờ mở cửa: 08:00 - 19:00 (Hàng ngày)
                      </p>
                    </div>
                  </div>
                </div>

                <PickupSection
                  hasPreOrder={hasPreOrder}
                  pickupDate={pickupDate}
                  pickupTime={pickupTime}
                  minPickupDate={minPickupDate}
                  pickupSlots={pickupSlots}
                  isPickupFieldInvalid={isPickupFieldInvalid}
                  onDateChange={setPickupDate}
                  onTimeChange={setPickupTime}
                  onBlur={handlePickupBlur}
                />
              </div>
            )}
          </section>

          {/* Card 3: Shipping Method (only when delivery) */}
          {!isPickup && (
            <section className="rounded-2xl border border-outline-variant/20 bg-surface p-4 shadow-ambient-sm md:p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                  🚚
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight text-on-surface">
                    Phương thức vận chuyển
                  </h2>
                  <p className="text-[11px] text-on-surface-variant">
                    Thời gian dự kiến và chi phí tương ứng
                  </p>
                </div>
              </div>
              <DeliveryMethodSection
                hasPreOrder={hasPreOrder}
                preOrderEstimate={preOrderEstimate}
                delivery={delivery}
                setDelivery={handleDeliveryChange}
                deliveryOptions={deliveryOptions}
                isCalculatingFee={isCalculatingFee}
                distanceKm={distanceKm}
                immediateFee={immediateFee}
                basicFee={basicFee}
              />
            </section>
          )}
        </div>

        {/* Right Column: Sticky Cart Preview & Order Summary */}
        <aside className="mt-4 space-y-4 lg:sticky lg:top-20 lg:mt-0">
          <DiscountTeaser />
          <OrderSummary
            subtotal={subtotal}
            shippingCost={shippingCost}
            orderTotal={orderTotal}
            isCalculatingFee={isCalculatingFee}
            isSubmitting={isSubmitting}
            shippingFeePending={isFeePending}
          />
        </aside>
      </form>
    </div>
  );
};

export default withAuthRedirect(memo(ShippingPage));
