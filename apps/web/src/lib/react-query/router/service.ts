import { createQueryKeys } from "@lukemorales/query-key-factory";

export const serviceQueryKeys = createQueryKeys("service", {
	bookingConfig: null,
	detail: (slug: string) => [slug],
});
