import "server-only";

export async function withHomeDataFallback<T>(
	label: string,
	load: () => Promise<T>,
	fallback: T,
): Promise<T> {
	try {
		let timeout: ReturnType<typeof setTimeout> | undefined;
		try {
			return await Promise.race([
				load(),
				new Promise<never>((_, reject) => {
					timeout = setTimeout(() => reject(new Error("Home data request timed out")), 5000);
				}),
			]);
		} finally {
			if (timeout) clearTimeout(timeout);
		}
	} catch (error) {
		console.error(`[home] ${label} unavailable; rendering fallback`, error);
		return fallback;
	}
}
