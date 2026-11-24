"use client";

import { useEffect, useState } from "react";

type CaseRow = { id: string; party_a_name: string; party_a_contact: string; party_b_name: string; party_b_contact: string; agreed_terms: string; amount: number; status: string; created_at: string };
type Audit = { id: string; from_status: string | null; to_status: string; operator_id: string; note: string; created_at: string };
const labels: Record<string, string> = { pending:"Chờ xử lý", funded_held:"Đã ghi nhận giữ (tracking)", released:"Đã đánh dấu hoàn tất", refunded:"Đã đánh dấu hoàn tiền", disputed:"Đang tranh chấp" };
const next: Record<string, string[]> = { pending:["funded_held","refunded","disputed"], funded_held:["released","refunded","disputed"], disputed:["released","refunded"] };

export default function MidManClient() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selected, setSelected] = useState<CaseRow | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ party_a_name:"", party_a_contact:"", party_b_name:"", party_b_contact:"", agreed_terms:"", amount:"" });
  async function load() {
    const response = await fetch("/api/mid-man", { cache:"no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Không tải được hồ sơ");
    setCases(body.cases);
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  async function openCase(row: CaseRow) {
    setSelected(row); setError("");
    const response = await fetch(`/api/mid-man/${row.id}`, { cache:"no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "Không tải được lịch sử"); return; }
    setSelected(body.case); setAudit(body.audit);
  }
  async function createCase(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/mid-man", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, amount:Number(form.amount)}) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không tạo được hồ sơ");
      setForm({party_a_name:"", party_a_contact:"", party_b_name:"", party_b_contact:"", agreed_terms:"", amount:""});
      await load(); await openCase(body.case);
    } catch (e) { setError(e instanceof Error ? e.message : "Lỗi không xác định"); }
    finally { setBusy(false); }
  }
  async function transition(status: string) {
    if (!selected) return;
    const note = window.prompt("Ghi chú chuyển trạng thái (tuỳ chọn)") ?? "";
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/mid-man/${selected.id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status,note}) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không chuyển được trạng thái");
      await load(); const updated = cases.find((row) => row.id === selected.id) ?? selected;
      await openCase({...updated, status:body.status});
    } catch (e) { setError(e instanceof Error ? e.message : "Lỗi không xác định"); }
    finally { setBusy(false); }
  }
  return <main className="space-y-6 p-6">
    <header><h1 className="text-2xl font-bold">Mid-man · theo dõi hồ sơ</h1><p className="mt-2 rounded bg-amber-100 p-3 text-amber-950">Chỉ là công cụ ghi nhận hồ sơ và trạng thái. Không giữ, chuyển, giải ngân hoặc hoàn tiền.</p></header>
    {error && <p role="alert" className="rounded bg-red-100 p-3 text-red-800">{error}</p>}
    <form onSubmit={createCase} className="grid gap-3 rounded border p-4 md:grid-cols-2">
      <h2 className="font-semibold md:col-span-2">Tạo hồ sơ giữa hai bên</h2>
      {([ ["party_a_name","Tên bên A"],["party_a_contact","Liên hệ bên A"],["party_b_name","Tên bên B"],["party_b_contact","Liên hệ bên B"] ] as const).map(([key,label]) => <label key={key} className="grid gap-1">{label}<input required maxLength={240} className="input input-bordered" value={form[key]} onChange={(e) => setForm({...form,[key]:e.target.value})}/></label>)}
      <label className="grid gap-1">Điều khoản đã thống nhất<textarea required maxLength={5000} className="textarea textarea-bordered" value={form.agreed_terms} onChange={(e) => setForm({...form,agreed_terms:e.target.value})}/></label>
      <label className="grid gap-1">Giá trị thoả thuận (VND)<input required min="0" step="1" type="number" className="input input-bordered" value={form.amount} onChange={(e) => setForm({...form,amount:e.target.value})}/></label>
      <button disabled={busy} className="btn btn-primary md:col-span-2">Tạo hồ sơ tracking</button>
    </form>
    <section className="grid gap-6 lg:grid-cols-2"><div><h2 className="mb-3 font-semibold">Hồ sơ gần đây</h2><ul className="space-y-2">{cases.map((row) => <li key={row.id}><button onClick={() => openCase(row)} className="w-full rounded border p-3 text-left hover:bg-base-200"><span className="font-medium">{row.party_a_name} ↔ {row.party_b_name}</span><span className="block text-sm">{labels[row.status] ?? row.status} · {new Intl.NumberFormat("vi-VN").format(row.amount)}₫</span></button></li>)}{!cases.length && <li className="text-sm">Chưa có hồ sơ.</li>}</ul></div>
    {selected && <article className="space-y-3 rounded border p-4"><h2 className="font-semibold">Chi tiết: {selected.party_a_name} ↔ {selected.party_b_name}</h2><p>{selected.party_a_contact} · {selected.party_b_contact}</p><p>{selected.agreed_terms}</p><p>{labels[selected.status] ?? selected.status} · {new Intl.NumberFormat("vi-VN").format(selected.amount)}₫</p><div className="flex flex-wrap gap-2">{(next[selected.status] ?? []).map((status) => <button key={status} disabled={busy} onClick={() => transition(status)} className="btn btn-sm">{labels[status]}</button>)}</div><h3 className="font-medium">Audit trail</h3><ol className="space-y-2">{audit.map((entry) => <li key={entry.id} className="border-l-2 pl-3 text-sm">{entry.from_status ? `${labels[entry.from_status]} → ` : "Tạo mới → "}{labels[entry.to_status]} · {entry.operator_id} · {new Date(entry.created_at).toLocaleString("vi-VN")} {entry.note}</li>)}</ol></article>}</section>
  </main>;
}
