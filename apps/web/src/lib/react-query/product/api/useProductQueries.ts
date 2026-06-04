import type {
	ComponentVariantRule,
	ConfiguratorGroup,
} from "@/app/api/products/[slug]/configurator/route";
import type { ShopProduct } from "@/app/api/products/route";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";

export interface QuickPickResponse {
	products: ShopProduct[];
	configuratorByProductId: Record<string, ConfiguratorGroup[]>;
	rulesByProductId: Record<string, ComponentVariantRule[]>;
	activeProduct?: ShopProduct | null;
}

export function useQuickPick(requestKey: string, enabled: boolean) {
	return useQuery<QuickPickResponse>({
		...appQueryKeys.product.quickPick(requestKey),
		enabled: enabled && !requestKey.endsWith(":"),
		staleTime: 30_000,
		queryFn: async () => {
			const query = new URLSearchParams();
			if (requestKey.startsWith("category:")) {
				const slug = requestKey.replace("category:", "");
				if (slug) query.set("categorySlug", slug);
			} else if (requestKey.startsWith("product:")) {
				const id = requestKey.replace("product:", "");
				if (id) query.set("productId", id);
			}
			const res = await fetch(
				`/api/products/quick-pick?${query.toString()}`,
			);
			if (!res.ok) throw new Error("Failed to fetch quick pick data");
			return res.json() as Promise<QuickPickResponse>;
		},
	});
}
