import { queryPresets } from "@/lib/react-query/config";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";

type TQueryOptions = {
	enabled?: boolean | (() => boolean);
} & Partial<(typeof queryPresets)[keyof typeof queryPresets]>;

export default function useConfigQueries(queryOptions?: TQueryOptions): any {
	const configQuery = useQuery({
		...appQueryKeys.config.getAll,
		queryFn: async () => {
			const res = await fetch("/api/config");
			if (!res.ok) throw new Error("Failed to load config");
			return res.json();
		},
		...queryPresets.temporary,
		...queryOptions,
	});

	return configQuery;
}
