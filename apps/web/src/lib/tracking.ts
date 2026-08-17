export interface CarrierInfo {
  id: string;
  name: string | null;
  logo: string | null;
  tracking_url_template: string | null;
}

/**
 * Build the carrier tracking URL from its URL template and the order's
 * tracking number. Returns null when either piece is missing.
 *
 * Template placeholder: {tracking_number}
 */
export function buildTrackingUrl(
  template: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  if (!template || !trackingNumber) return null;
  return template.replace("{tracking_number}", trackingNumber);
}