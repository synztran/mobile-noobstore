import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import type { HeroCampaign } from "@/app/api/home/hero/route";
import { createQueryKeys } from "@lukemorales/query-key-factory";

export interface TrustProp {
	id: string;
	title: string;
	description: string;
	icon: string;
}

export interface Creator {
	id: string;
	name: string;
	avatar_url: string | null;
	handle: string | null;
	quote: string | null;
}

export const homeQueryKeys = createQueryKeys("home", {
	hero: null,
	communityGallery: (limit: number) => [limit],
	noteworthy: (categorySlug: string) => [categorySlug],
	trustProps: null,
	creators: null,
});
