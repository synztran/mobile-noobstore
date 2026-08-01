"use client";

import { memo, useCallback, useMemo } from "react";
import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import { DELIVERY_OPTIONS } from "@/constants";
import { DISTRICT_MAP, VIETNAM_CITIES } from "@/constants/vietnam-cities";
import { useShippingForm, type DeliverySpeed } from "@/hooks/useShippingForm";
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
  } = useShippingForm();

  const cityCode = useMemo(
    () => VIETNAM_CITIES.find((c) => c.name === form.city)?.code ?? null,
    [form.city]
  );

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

  const mappingFees: Record<"express" | "standard", number> = {
    express: immediateFee,
    standard: basicFee,
  };

  const deliveryOptions = useMemo(() => {
    return DELIVERY_OPTIONS.map((opt) => {
      const fee =
        opt.id === "express" || opt.id === "standard"
          ? mappingFees[opt.id]
          : opt.price;
      const isPickupOpt = opt.id === "pickup";
      return {
        ...opt,
        price: fee,
        // shipment option only available for non-HCM cities; pickup always visible
        isHidden: isPickupOpt ? false : isHCM ? opt.isHidden : !opt.isHidden,
      };
    });
  }, [immediateFee, basicFee, isHCM]);

  if (!ready) {
    return <ShippingPageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <ShippingHeroHeader />

      <form onSubmit={handleSubmit} className="space-y-4">
        <ContactInfoFields
          fullName={form.fullName}
          apartment={form.apartment}
          phoneNumber={form.phoneNumber}
          isPickup={isPickup}
          fullNameInvalid={!!isInvalid("fullName", true)}
          phoneNumberInvalid={!!isInvalid("phoneNumber", true)}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        {!isPickup && (
          <AddressFields
            city={form.city}
            district={form.district}
            ward={form.ward}
            streetAddress={form.streetAddress}
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
          />
        )}

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

        {isPickup ? (
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
        ) : null}

        <DiscountTeaser />

        <OrderSummary
          subtotal={subtotal}
          shippingCost={shippingCost}
          orderTotal={orderTotal}
          isCalculatingFee={isCalculatingFee}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
};

export default withAuthRedirect(memo(ShippingPage));
