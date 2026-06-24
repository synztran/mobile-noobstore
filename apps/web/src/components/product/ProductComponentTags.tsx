import { ITag } from "@/app/api/products/route";
import { memo } from "react";

interface ProductComponentTagsProps {
  verticalTags?: ITag[];
  horizontalTags?: ITag[];
}

const ProductTags = ({
  verticalTags,
  horizontalTags,
}: ProductComponentTagsProps) => {
  if (!verticalTags?.length && !horizontalTags?.length) return null;
  if (verticalTags?.length) {
    return (
      <div className="absolute right-3 top-3 z-20 flex flex-col items-center gap-2 leading-none">
        {verticalTags
          .filter((tag) => tag.icon)
          .map((tag) => (
            <div key={tag.id}></div>
          ))}
      </div>
    );
  }

  return (
    <div
      className={`absolute bottom-1.5 left-2 z-20 flex w-full items-center gap-2`}
    >
      {horizontalTags?.map((tag) => (
        <span
          key={tag.id}
          className={`leading-1 flex max-w-max items-center justify-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-on-surface shadow-sm backdrop-blur ${tag.textColor ?? "text-on-surface"} ${tag.bgColor ?? "bg-surface-container-lowest"}`}
        >
          {tag.label}
        </span>
      ))}
    </div>
  );
};

export default memo(ProductTags);
