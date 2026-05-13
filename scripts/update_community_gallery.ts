import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const imagesPath = path.resolve(__dirname, "../apps/web/src/lib/images.ts");

const images = await import(imagesPath);
const {
	GROUP_IMAGE_1,
	GROUP_IMAGE_2,
	GROUP_IMAGE_3,
	GROUP_IMAGE_4,
	GROUP_IMAGE_5,
	GROUP_IMAGE_6,
	GROUP_IMAGE_7,
	GROUP_IMAGE_8,
	GROUP_IMAGE_9,
	GROUP_IMAGE_10,
	GROUP_IMAGE_11,
	GROUP_IMAGE_12,
	GROUP_IMAGE_13,
	GROUP_IMAGE_14,
} = images;

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const communityImages = [
	{
		src: GROUP_IMAGE_1,
		owner: "alex.keyboards",
		info: "65% custom build, GMK keycaps, FR4 plate, lubed switches.",
		isVertical: true,
		details: {
			Name: "TGR 910 Customize",
			Keycaps: "GMK Doich",
			Switches: "Cherry VB Black",
		},
	},
	{
		src: GROUP_IMAGE_2,
		owner: "mech.melody",
		info: "Alice layout, PBT keycaps, gasket mount, silent reds.",
	},
	{
		src: GROUP_IMAGE_3,
		owner: "keebsbykim",
		info: "75% layout, RGB underglow, tactile switches.",
	},
	{
		src: GROUP_IMAGE_4,
		owner: "switch.smith",
		info: "60% compact, handwired, artisan keycap.",
	},
	{
		src: GROUP_IMAGE_5,
		owner: "rgbdreams",
		info: "TKL, polycarbonate case, pudding keycaps.",
	},
	{
		src: GROUP_IMAGE_12,
		owner: "capslockcafe",
		info: "Full size, custom cable, clicky switches.",
		isVertical: true,
	},
	{
		src: GROUP_IMAGE_7,
		owner: "pastelkeebs",
		info: "65% pastel theme, silent linear switches.",
	},
	{
		src: GROUP_IMAGE_8,
		owner: "keebscape",
		info: "Split keyboard, OLED display, hotswap PCB.",
	},
	{
		src: GROUP_IMAGE_9,
		owner: "boardbuilder",
		info: "40% ortho, custom firmware, DSA keycaps.",
	},
	{
		src: GROUP_IMAGE_10,
		owner: "nighttype",
		info: "65% RGB, aluminum case, lubed stabs.",
	},
	{
		src: GROUP_IMAGE_11,
		owner: "nighttype",
		info: "65% RGB, aluminum case, lubed stabs.",
	},
	{
		src: GROUP_IMAGE_6,
		owner: "nighttype",
		info: "65% RGB, aluminum case, lubed stabs.",
	},
	{
		src: GROUP_IMAGE_13,
		owner: "nighttype",
		info: "65% RGB, aluminum case, lubed stabs.",
		isVertical: true,
	},
	{
		src: GROUP_IMAGE_14,
		owner: "nighttype",
		info: "65% RGB, aluminum case, lubed stabs.",
		isVertical: true,
	},
];

async function updateCommunityGallery() {
	for (const image of communityImages) {
		const { src, owner, info, isVertical, details } = image;

		const { error } = await supabase.from("community_gallery").insert({
			image_url: src,
			alt_text: `${owner} — ${info}`,
		});

		if (error) {
			console.error(`Failed to insert image for owner ${owner}:`, error);
		} else {
			console.log(`Successfully inserted image for owner ${owner}`);
		}
	}
}

updateCommunityGallery().catch((err) => console.error("Script failed:", err));
