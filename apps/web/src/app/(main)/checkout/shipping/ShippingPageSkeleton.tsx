"use client";

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-2xl bg-surface-container-high ${className ?? ""}`} />
);

const SkeletonLabel = () => (
  <div className="mb-2 ml-1 block">
    <SkeletonBlock className="h-2.5 w-16" />
  </div>
);

export const ShippingPageSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container p-4">
        <div className="flex animate-pulse items-center gap-4">
          <SkeletonBlock className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-20" />
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
        </div>
      </div>

      {/* Form fields */}
      <div className="grid animate-pulse grid-cols-2 gap-4">
        <div className="col-span-2">
          <SkeletonLabel />
          <SkeletonBlock className="h-[50px] w-full" />
        </div>
        <div className="col-span-2">
          <SkeletonLabel />
          <SkeletonBlock className="h-[50px] w-full" />
        </div>
        <div className="col-span-1">
          <SkeletonLabel />
          <SkeletonBlock className="h-[50px] w-full" />
        </div>
        <div className="col-span-1">
          <SkeletonLabel />
          <SkeletonBlock className="h-[50px] w-full" />
        </div>
      </div>

      {/* City selector */}
      <div className="animate-pulse">
        <SkeletonLabel />
        <SkeletonBlock className="h-[50px] w-full" />
      </div>

      {/* District / Ward */}
      <div className="animate-pulse space-y-2">
        <SkeletonLabel />
        <SkeletonBlock className="h-[50px] w-full" />
        <div className="mt-3">
          <SkeletonLabel />
          <SkeletonBlock className="h-[50px] w-full" />
        </div>
      </div>

      {/* Delivery options */}
      <div className="animate-pulse space-y-3">
        <SkeletonBlock className="mb-2 ml-1 h-2.5 w-36" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border-2 border-transparent bg-surface-container p-4"
          >
            <SkeletonBlock className="h-11 w-11 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <SkeletonBlock className="h-4 w-2/5 rounded-full" />
              <SkeletonBlock className="h-3 w-1/2 rounded-full" />
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-full" />
            <SkeletonBlock className="h-5 w-5 rounded-full" />
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="animate-pulse overflow-hidden rounded-3xl bg-surface-container-low">
        <div className="space-y-3 px-5 pb-4 pt-5">
          <SkeletonBlock className="h-2.5 w-28" />
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="h-px bg-outline-variant/30" />
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-5 w-16" />
            <SkeletonBlock className="h-7 w-24" />
          </div>
        </div>
        <SkeletonBlock className="h-14 w-full rounded-none" />
      </div>
    </div>
  );
};
