export function isDuplicateSiblingLabel(
	label: string,
	siblings: Array<{ id?: number; label: string }>,
	excludeId?: number,
): boolean {
	const normalized = label.trim().toLowerCase();
	return siblings.some(
		(sibling) => (excludeId === undefined || sibling.id !== excludeId) && sibling.label.trim().toLowerCase() === normalized,
	);
}
