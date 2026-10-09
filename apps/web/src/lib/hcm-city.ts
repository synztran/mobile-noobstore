/**
 * Single source of truth for "is this address inside HCMC?".
 *
 * This used to be a raw `form.city === "Thành phố Hồ Chí Minh"` comparison in
 * four places inside `useShippingForm`. That silently failed for any address
 * whose stored city string was not byte-identical to the picker's label —
 * `Hồ Chí Minh`, `TP. Hồ Chí Minh`, `Ho Chi Minh` all compared false, which hid
 * the in-city carrier delivery tiers and zeroed the district surcharge even
 * though the address was in the city.
 *
 * The fix is to trust `city_code` first: it comes from the `city_code` column on
 * the stored address, so it is not affected by how the name was typed or which
 * geocoder produced it. The name comparison remains as a fallback for records
 * that predate that column, and it normalises away diacritics, casing, and the
 * `Thành phố` / `TP` / `Tỉnh` prefix so all of those spellings agree.
 */

/** Canonical label in `VIETNAM_CITIES`; kept for callers that need the display name. */
export const HCM_CITY = "Thành phố Hồ Chí Minh";

export const HCM_CITY_CODE = "HCM";

/** `HCM_CITY` with diacritics removed, lowercased, prefix dropped. */
const HCM_CITY_NORMALIZED = "ho chi minh";

/**
 * Administrative prefixes that carry no distinguishing information, so
 * "Thành phố X", "TP. X" and "X" all reduce to the same key. Stripped after
 * diacritic removal because "Thành phố" normalizes to two words, "thanh pho".
 */
const CITY_PREFIX_PATTERN = /^(?:thanh pho|tp|tinh)\s+/;

function normalizeCityName(city: string): string {
  return (
    city
      .normalize("NFD")
      // Strip the combining diacritical marks left behind by NFD.
      .replace(/[\u0300-\u036f]/g, "")
      // `đ` has no canonical decomposition, so it survives NFD and needs its own map.
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      // "TP.Hồ Chí Minh" has no space after the period.
      .replace(/[.]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(CITY_PREFIX_PATTERN, "")
      .trim()
  );
}

/**
 * True when the address is inside HCMC.
 *
 * @param city     Human-readable city name. Free text — may be absent or spelled
 *                 several different ways.
 * @param cityCode Stable code, when known. `"HCM"` is authoritative and
 *                 short-circuits before the name is even inspected.
 */
export function isHcmCity(
  city?: string | null,
  cityCode?: string | null
): boolean {
  if (cityCode && cityCode.trim().toUpperCase() === HCM_CITY_CODE) {
    return true;
  }

  if (!city) {
    return false;
  }

  return normalizeCityName(city) === HCM_CITY_NORMALIZED;
}
