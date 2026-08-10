import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GiftCardViewer from "@/components/gift-card/GiftCardViewer";
import { getAdminClient } from "@/lib/supabase/admin";

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
};

async function getGiftCard(code: string): Promise<GiftCard | null> {
	const supabase = getAdminClient();
	const { data } = await supabase
		.from("gift_cards")
		.select(
			"code, points_value, batch_label, note, expires_at, is_active, redeemed_at, redeemed_by_user_id, issued_to_user_id",
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
	const card = await getGiftCard(code);

	if (!card) {
		return { title: "Thẻ quà tặng không tồn tại - NoobStore" };
	}

	return {
		title: `Gift Card ${card.code} - NoobStore`,
		description: `Thẻ quà tặng ${card.code} trị giá ${card.points_value.toLocaleString(
			"vi-VN",
		)} điểm.`,
		openGraph: {
			title: `Gift Card ${card.code} - NoobStore`,
			description: `Thẻ quà tặng trị giá ${card.points_value.toLocaleString(
				"vi-VN",
			)} điểm.`,
		},
	};
}

export default async function GiftCardDetailPage({
	params,
}: {
	params: Promise<{ code: string }>;
}) {
	const { code } = await params;
	const card = await getGiftCard(code);

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
		/>
	);
}