export interface RecentlyViewedEntry {
  id: string;
  slug: string;
  name: string;
  thumbnail: string | null;
  viewedAt: number;
}

export const STORAGE_KEY = "noobstore-recently-viewed";
export const MAX_RECORDED = 12;
export const MAX_DISPLAYED = 8;

/**
 * Merge a freshly viewed entry into an existing list: de-duplicate by id
 * (moving the entry to the front) and cap the list at MAX_RECORDED, evicting
 * the oldest entries. Pure and side-effect free.
 */
export function mergeViewed(
  current: RecentlyViewedEntry[],
  next: RecentlyViewedEntry
): RecentlyViewedEntry[] {
  const withoutDuplicate = current.filter((e) => e.id !== next.id);
  return [next, ...withoutDuplicate].slice(0, MAX_RECORDED);
}
