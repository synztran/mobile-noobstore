import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GiftCardViewer from "@/components/gift-card/GiftCardViewer";
import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildOg } from "@/lib/og";

export const dynamic = "force-dynamic";

type GiftCard = {
	code: string;
	points_value: number;
	batch_label: string | null;
	note: string | null;
	expires_at: string | null;
	is_active: boolean;
	redeemed_at: string | null;
	redeemed_by_user_id: string | null;
	issued_to_user_id: string | null;
	theme_id: string | null;
	is_scratched: boolean;
};

async function getGiftCard(code: string): Promise<GiftCard | null> {
	const supabase = getAdminClient();
	const { data } = await supabase
		.from("gift_cards")
		.select(
			"code, points_value, batch_label, note, expires_at, is_active, redeemed_at, redeemed_by_user_id, issued_to_user_id, theme_id, is_scratched",
		)
		.ilike("code", code)
		.maybeSingle();

	return (data as GiftCard | null) ?? null;
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ code: string }>;
}): Promise<Metadata> {
	const { code } = await params;
	const url = `/gift-card/${code}`;
	const card = await getGiftCard(code);

	// The card code is a redeemable secret — keep it out of the preview text so
	// a shared link doesn't broadcast it. This page is force-dynamic and
	// unauthenticated, so og:url/og:title are the only things a scraper sees.
	if (!card) {
		return buildOg({
			title: "Thẻ quà tặng không tồn tại",
			description: "Thẻ quà tặng này không tồn tại hoặc đã hết hạn.",
			url,
		});
	}

	const points = card.points_value.toLocaleString("vi-VN");

	return buildOg({
		title: "Thẻ quà tặng NoobStore",
		description: `Thẻ quà tặng NoobStore trị giá ${points} điểm.`,
		url,
	});
}

export default async function GiftCardDetailPage({
	params,
}: {
	params: Promise<{ code: string }>;
}) {
	const { code } = await params;
	const card = await getGiftCard(code);
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!card) notFound();

	const now = new Date();
	const isExpired = !!(card.expires_at && new Date(card.expires_at) <= now);
	const isRedeemed = card.redeemed_at !== null || card.redeemed_by_user_id !== null;

	return (
		<GiftCardViewer
			code={card.code}
			pointsValue={card.points_value}
			batchLabel={card.batch_label}
			note={card.note}
			expiresAt={card.expires_at}
			isActive={card.is_active}
			isRedeemed={isRedeemed}
			isExpired={isExpired}
			restricted={card.issued_to_user_id !== null}
			themeId={card.theme_id}
			isScratched={card.is_scratched}
			canReveal={
				!!user &&
				card.is_active &&
				!isRedeemed &&
				!isExpired &&
				(card.issued_to_user_id === null || card.issued_to_user_id === user.id)
			}
		/>
	);
}
