interface ProductTagsProps {
  soldOut?: boolean;
  preOrder?: boolean;
  used?: boolean;
  isNew?: boolean;
  bestseller?: boolean;
}

const TAG_BASE =
  "rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-widest shadow-sm";

/**
 * Status tags rendered on top of a product image.
 *
 * Display rules:
 * - When the product is sold out, no other tag is rendered — the sold-out
 *   state is communicated by the overlay in the parent card.
 * - A pre-order tag coexists with everything else; the product price stays
 *   visible as usual (price rendering belongs to the parent card).
 */
export function ProductTags({
  soldOut,
  preOrder,
  used,
  isNew,
  bestseller,
}: ProductTagsProps) {
  if (soldOut) return null;

  return (
    <>
      {bestseller && (
        <div className={`${TAG_BASE} bg-amber-500 text-white`}>Bán chạy</div>
      )}
      {preOrder && (
        <div className={`${TAG_BASE} bg-violet-500 text-white`}>Pre-order</div>
      )}
      {used && (
        <div
          className={`${TAG_BASE} bg-surface-container-highest text-on-surface-variant`}
        >
          Cũ
        </div>
      )}
      {isNew && (
        <div className={`${TAG_BASE} bg-primary text-on-primary`}>MỚI</div>
      )}
    </>
  );
}
