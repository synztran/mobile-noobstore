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
			<div className="absolute top-3 right-3 z-20 flex flex-col items-center gap-2">
				{verticalTags
					.filter((tag) => tag.icon)
					.map((tag) => (
						<div></div>
					))}
			</div>
		);
	}

	return (
		<div
			className={`bottom-1 left-1 absolute w-full h-8 flex items-center gap-2 z-20`}>
			{horizontalTags?.map((tag) => (
				<span
					key={tag.id}
					className={`max-w-max px-2 py-1 rounded-lg backdrop-blur flex items-center justify-center shadow-sm border border-outline-variant/30 text-xs font-bold leading-tight tracking-wide text-on-surface ${tag.textColor ?? "text-on-surface"} ${tag.bgColor ?? "bg-surface-container-lowest"}`}>
					{tag.label}
				</span>
			))}
		</div>
	);
};

export default memo(ProductTags);
