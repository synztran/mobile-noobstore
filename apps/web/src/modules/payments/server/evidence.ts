import "server-only";
import { createHash } from "node:crypto";
import bwipjs from "bwip-js/node";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPaymentEvidenceDocument } from "@/lib/telegram/telegram.service";

export interface Evidence {
  id: string; order_id: string; version: number; fingerprint: string;
  bank_identity: Record<string, string>; amount: number; reference: string;
  payload: string; payload_sha256: string; png_base64: string; png_sha256: string;
  created_at: string;
}
export const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

export async function issueEvidence(orderId: string, reference: string, amount: number,
  bank: { id: string; platform_name: string; account_number: string; account_name: string }, payload: string) {
  const png = await bwipjs.toBuffer({ bcid: "qrcode", text: payload, scale: 5, paddingwidth: 4, paddingheight: 4 });
  const fingerprint = sha256(JSON.stringify([orderId, bank.id, bank.platform_name, bank.account_number, bank.account_name, amount, reference, payload]));
  const { data, error } = await (getAdminClient().rpc as any)("issue_payment_instruction_evidence", {
    p_order_id: orderId, p_fingerprint: fingerprint, p_bank: bank, p_amount: amount,
    p_reference: reference, p_payload: payload, p_payload_sha256: sha256(payload),
    p_png_base64: png.toString("base64"), p_png_sha256: sha256(png),
  });
  if (error || !data) throw new Error("Cannot preserve payment instructions");
  const evidence = data as Evidence;
  evidencePng(evidence); // Detect corrupted persisted bytes before serving.
  return evidence;
}

export function evidencePng(evidence: Evidence): Uint8Array {
  const png = Buffer.from(evidence.png_base64, "base64");
  if (sha256(png) !== evidence.png_sha256 || sha256(evidence.payload) !== evidence.payload_sha256) {
    throw new Error("Payment evidence integrity mismatch");
  }
  return new Uint8Array(png);
}

export async function deliverEvidence(evidence: Evidence) {
  const db = getAdminClient();
  const { data: delivered, error } = await (db.from as any)("payment_evidence_delivery").select("id")
    .eq("evidence_id", evidence.id).eq("channel", "telegram").eq("outcome", "sent").limit(1);
  if (error) throw new Error("Cannot check evidence delivery");
  if (delivered?.length) return;
  let outcome = "failed", messageId: string | null = null;
  try {
    messageId = await sendPaymentEvidenceDocument(evidencePng(evidence),
      `Payment instructions — NOT proof of payment\nOrder: ${evidence.reference}\nVersion: ${evidence.version}\nEvidence: ${evidence.id}\nAmount: ${evidence.amount} VND\nCreated: ${evidence.created_at}\nPNG SHA-256: ${evidence.png_sha256}`,
      `payment-${evidence.id}.png`);
    outcome = "sent";
  } catch { console.error("[payment-evidence] Telegram delivery failed", evidence.id); }
  const saved = await (db.from as any)("payment_evidence_delivery").insert({ evidence_id: evidence.id,
    channel: "telegram", outcome, message_id: messageId });
  if (saved.error) console.error("[payment-evidence] delivery audit failed", evidence.id);
}
