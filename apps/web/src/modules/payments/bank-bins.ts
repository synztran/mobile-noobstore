/**
 * Reviewed bank BINs for VietQR.
 *
 * Shared by the storefront payment details and the admin QR re-provision
 * panel so both encode the same recipient. Unknown bank configuration fails
 * closed — never guess a BIN.
 */

const BANK_BINS: Record<string, string> = {
  vcb: "970436", vietcombank: "970436", tcb: "970407", techcombank: "970407",
  mb: "970422", mbbank: "970422", acb: "970416", bidv: "970418",
  vtb: "970415", vietinbank: "970415", vpb: "970432", vpbank: "970432",
  tpb: "970423", tpbank: "970423", stb: "970403", sacombank: "970403",
  vib: "970441", msb: "970426", ocb: "970448", hdbank: "970437",
  agribank: "970405", shb: "970443", seabank: "970440", eximbank: "970431",
};

/** `MB Bank` / `mb_bank` / `MB-Bank` all normalize to `mbbank`. */
export function normalizeBankName(platformName: string): string {
  return platformName.toLowerCase().replace(/[\s_-]/g, "");
}

export function bankBinFor(platformName: string): string | null {
  const name = normalizeBankName(platformName);
  return BANK_BINS[name] ?? (/^970\d{3}$/.test(name) ? name : null);
}
