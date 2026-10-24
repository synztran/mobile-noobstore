"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminQueryKeys } from "@/lib/react-query/root";

interface Receipt {
  id: string; amount: number; method: string; transaction_reference: string | null;
  received_at: string; verified_at: string; verified_by: string | null;
  note: string; reversal_of: string | null;
}
interface Bank { id: string; platform_name: string; account_number: string; account_name: string }
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export function VerifiedPaymentPanel({ orderId, total, onUpdated }: { orderId: string; total: number; onUpdated: () => void }) {
  const client = useQueryClient();
  const [method, setMethod] = useState("bank");
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [note, setNote] = useState("");
  const [verified, setVerified] = useState(false);
  const [reversalOf, setReversalOf] = useState("");
  const query = useQuery<{ receipts: Receipt[]; banks: Bank[] }>({
    queryKey: ["verified-receipts", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payments`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không thể tải sổ thanh toán");
      return res.json();
    },
  });
  const evidenceQuery = useQuery<{ evidence: { id: string; version: number; amount: number; created_at: string; png_sha256: string }[] }>({
    queryKey: ["payment-evidence", orderId],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}/payment-evidence`, { cache: "no-store" });
      if (!response.ok) throw new Error("Không thể tải bằng chứng QR");
      return response.json();
    },
    refetchInterval: 30000,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, amount: Number(amount), bankId, reference,
          receivedAt: new Date(receivedAt).toISOString(), note, verified, reversalOf: reversalOf || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Không thể ghi nhận thanh toán");
      return json;
    },
    onSuccess: async () => {
      setVerified(false); setAmount(""); setReference(""); setNote(""); setReversalOf("");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["verified-receipts", orderId] }),
        client.invalidateQueries({ queryKey: adminQueryKeys.orderDetail(orderId) }),
        client.invalidateQueries({ queryKey: ["orders"] }),
      ]);
      onUpdated();
    },
  });
  if (query.isPending) return <div className="skeleton h-32 w-full" aria-label="Đang tải sổ thanh toán" />;
  if (query.isError) return <div role="alert" className="alert alert-error">Không tải được sổ thanh toán. <button className="btn btn-sm" onClick={() => query.refetch()}>Thử lại</button></div>;
  const { receipts, banks } = query.data;
  const collected = receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
  return <section className="space-y-3 border-t border-slate-300 pt-4" aria-label="Xác minh thanh toán">
    <h3 className="font-semibold">Xác minh tiền đã nhận</h3>
    <p className="text-sm">Đã ghi nhận {money(collected)} · Còn thiếu {money(Math.max(0, total - collected))}</p>
    {collected > total && <p role="status" className="alert alert-warning">Dư {money(collected - total)} — cần kiểm tra và xử lý riêng.</p>}
    <p className="alert alert-warning text-sm">Chỉ ghi nhận sau khi kiểm tra tiền thực vào tài khoản cửa hàng hoặc tiền mặt/COD đã thu. Không dùng ảnh khách gửi làm bằng chứng.</p>
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}>
      <fieldset disabled={mutation.isPending} className="space-y-3">
        <label className="form-control gap-1">Loại thu tiền
          <select className="select select-bordered w-full" value={method} onChange={e => { setMethod(e.target.value); setVerified(false); }}>
            <option value="bank">Chuyển khoản ngân hàng</option><option value="cash">Tiền mặt tại cửa hàng</option><option value="cod">COD đã đối soát</option>
          </select>
        </label>
        {!reversalOf && <>
          <label className="form-control gap-1">Số tiền thực nhận (VND)<input className="input input-bordered w-full" type="number" min="1" step="1" required value={amount} onChange={e => { setAmount(e.target.value); setVerified(false); }} /></label>
          {method === "bank" && <label className="form-control gap-1">Tài khoản cửa hàng đã nhận tiền
            <select required className="select select-bordered w-full" value={bankId} onChange={e => { setBankId(e.target.value); setVerified(false); }}>
              <option value="">Chọn tài khoản</option>{banks.map(bank => <option key={bank.id} value={bank.id}>{bank.platform_name} · {bank.account_number} · {bank.account_name}</option>)}
            </select>
          </label>}
          <label className="form-control gap-1">Mã giao dịch / biên nhận / đối soát COD<input required minLength={3} maxLength={100} className="input input-bordered w-full" value={reference} onChange={e => { setReference(e.target.value); setVerified(false); }} /></label>
        </>}
        <label className="form-control gap-1">Thời điểm nhận tiền / điều chỉnh<input required type="datetime-local" className="input input-bordered w-full" value={receivedAt} onChange={e => { setReceivedAt(e.target.value); setVerified(false); }} /></label>
        <label className="form-control gap-1">{reversalOf ? "Lý do hủy ghi nhận (ít nhất 10 ký tự)" : "Ghi chú"}<textarea className="textarea textarea-bordered w-full" required={!!reversalOf} minLength={reversalOf ? 10 : undefined} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="checkbox checkbox-sm" checked={verified} onChange={e => setVerified(e.target.checked)} required /><span>{reversalOf ? "Tôi đã kiểm tra và xác nhận cần hủy ghi nhận này. Lịch sử gốc được giữ lại." : "Tôi đã đối chiếu đúng người nhận, mã đơn, mã giao dịch và số tiền thực nhận qua nguồn của cửa hàng."}</span></label>
        <button className="btn btn-primary w-full" disabled={!verified || mutation.isPending} type="submit">{mutation.isPending ? "Đang ghi nhận…" : reversalOf ? "Ghi bút toán hủy" : "Ghi nhận tiền đã xác minh"}</button>
        {reversalOf && <button className="btn btn-ghost w-full" type="button" onClick={() => { setReversalOf(""); setVerified(false); }}>Hủy điều chỉnh</button>}
      </fieldset>
      {mutation.isError && <p className="alert alert-error text-sm" role="alert">{mutation.error.message}</p>}
    </form>
    <h4 className="font-medium">Lịch sử ghi nhận</h4>
    {!receipts.length && <p className="text-sm">Chưa ghi nhận tiền. Có thể ghi nhiều lần chuyển cho cùng đơn.</p>}
    <ul className="space-y-3 text-sm">{receipts.map(receipt => <li key={receipt.id} className="break-words border-b border-slate-200 pb-2">
      <p className="font-medium">{money(Number(receipt.amount))} · {receipt.method === "legacy" ? "Số dư cũ — chưa xác minh độc lập" : receipt.method}</p>
      <p>{receipt.transaction_reference} · {new Date(receipt.received_at).toLocaleString("vi-VN")}</p>
      <p>Người xác minh: {receipt.verified_by ?? "Dữ liệu cũ"} · {new Date(receipt.verified_at).toLocaleString("vi-VN")}</p>
      {receipt.note && <p>{receipt.note}</p>}
      {Number(receipt.amount) > 0 && !receipts.some(other => other.reversal_of === receipt.id) && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setReversalOf(receipt.id); setVerified(false); setNote(""); }}>Điều chỉnh bằng bút toán hủy</button>}
    </li>)}</ul>
    <h4 className="font-medium">QR cửa hàng đã phát hành</h4>
    <p className="text-sm">Chứng minh nội dung máy chủ phát hành, không chứng minh khách đã xem hoặc đã chuyển tiền.</p>
    {evidenceQuery.isPending && <div className="skeleton h-12 w-full" />}
    {evidenceQuery.isError && <p role="alert">Chưa tải được lịch sử QR. <button type="button" className="btn btn-sm" onClick={() => evidenceQuery.refetch()}>Thử lại</button></p>}
    {evidenceQuery.data?.evidence.length === 0 && <p className="text-sm">Chưa phát hành QR được lưu trữ.</p>}
    <ul className="space-y-2 text-sm">{evidenceQuery.data?.evidence.map(item => <li key={item.id} className="break-all">
      <a className="link" href={`/api/orders/${orderId}/payment-evidence?evidence=${item.id}`} target="_blank" rel="noopener noreferrer">Tải QR phiên bản {item.version} · {money(item.amount)}</a>
      <p>{new Date(item.created_at).toLocaleString("vi-VN")} · SHA-256: {item.png_sha256}</p>
    </li>)}</ul>
  </section>;
}
