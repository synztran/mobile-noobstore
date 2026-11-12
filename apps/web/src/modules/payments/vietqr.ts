export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string): string {
  const size = new TextEncoder().encode(value).length;
  if (size > 99) throw new Error("QR Banking field too long");
  return `${id}${String(size).padStart(2, "0")}${value}`;
}

export function vietQR(bankBin: string, account: string, amount: number, reference: string): string {
  if (!/^\d{6}$/.test(bankBin) || !/^\d{4,30}$/.test(account) ||
      !Number.isSafeInteger(amount) || amount <= 0 || !/^[A-Za-z0-9 _-]{1,50}$/.test(reference)) {
    throw new Error("Invalid QR Banking payment details");
  }
  const merchant = field("00", "A000000727") + field("01", field("00", bankBin) + field("01", account)) + field("02", "QRIBFTTA");
  const payload = field("00", "01") + field("01", "12") + field("38", merchant) +
    field("53", "704") + field("54", String(amount)) + field("58", "VN") + field("62", field("08", reference)) + "6304";
  return payload + crc16(payload);
}
