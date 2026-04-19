import { Keyboard, Layers, Settings2 } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
	{
		num: "01",
		Icon: Keyboard,
		label: "BÀN PHÍM",
		slug: "keyboards",
		span: true,
		iconSize: "text-[8rem]",
	},
	{
		num: "02",
		Icon: Settings2,
		label: "SWITCH",
		slug: "switches",
		span: false,
		iconSize: "text-[6rem]",
	},
	{
		num: "03",
		Icon: Layers,
		label: "PHỤ KIỆN",
		slug: "add-ons",
		span: false,
		iconSize: "text-[6rem]",
	},
];

export function QuickCategories() {
	return (
		<section className="p-6 bg-surface-container-low">
			<div className="grid grid-cols-2 gap-4">
				{CATEGORIES.map(
					({ num, Icon: IconComp, label, slug, span, iconSize }) => (
						<Link
							key={slug}
							href={`/shop?category=${slug}`}
							className={`bg-surface-container-lowest p-6 rounded-xl relative overflow-hidden group active:scale-95 transition-transform ${
								span ? "col-span-2" : ""
							}`}>
							<div className="relative z-10">
								<p className="text-[10px] tracking-widest text-on-surface-variant font-bold">
									{num}
								</p>
								<h3
									className={`font-extrabold uppercase tracking-tight ${
										span ? "text-xl" : "text-lg"
									}`}>
									{label}
								</h3>
							</div>
							<IconComp
								className={`absolute -right-4 -bottom-4 opacity-5 text-on-surface ${iconSize}`}
								style={{ width: "1em", height: "1em" }}
							/>
						</Link>
					),
				)}
			</div>
		</section>
	);
}
