"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type {
  DetectedKey,
  MatchResult,
  ReviewMap,
  Verdict,
} from "@/lib/keycap-check/types";
import { verdictHeadline } from "@/lib/keycap-check/verdict";
import KeyThumb from "./KeyThumb";

interface PrintReportProps {
  verdict: Verdict;
  match: MatchResult;
  renderKeys: DetectedKey[];
  customerKeys: DetectedKey[];
  renderCanvas: HTMLCanvasElement;
  customerCanvases: HTMLCanvasElement[];
  reviews: ReviewMap;
  generatedAt: Date;
}

const PRINT_CSS = `
  #keycap-print-root { display: none; }
  @media print {
    body > *:not(#keycap-print-root) { display: none !important; }
    #keycap-print-root {
      display: block !important;
      color: #0f172a;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    @page { margin: 12mm; }
    #keycap-print-root .avoid-break { break-inside: avoid; }
  }
`;

export default function PrintReport({
  verdict,
  match,
  renderKeys,
  customerKeys,
  renderCanvas,
  customerCanvases,
  reviews,
  generatedAt,
}: PrintReportProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const refById = new Map(renderKeys.map((key) => [key.id, key]));
  const customerById = new Map(customerKeys.map((key) => [key.id, key]));

  const sourceForCustomer = (key: DetectedKey) =>
    customerCanvases[key.imageIndex] ?? null;

  const content = (
    <div id="keycap-print-root">
      <style>{PRINT_CSS}</style>

      <header className="avoid-break" style={{ borderBottom: "2px solid #0f172a", paddingBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" }}>
              NoobStore · QC keycap
            </p>
            <h1 style={{ margin: "2px 0 0", fontSize: 20 }}>Keycap completeness report</h1>
          </div>
          <p style={{ margin: 0, fontSize: 10 }}>
            {generatedAt.toLocaleString("vi-VN")}
          </p>
        </div>
      </header>

      <section
        className="avoid-break"
        style={{
          marginTop: 12,
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: 10,
        }}
      >
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          {verdictHeadline(verdict)}
        </p>
        <table style={{ marginTop: 6, width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <tbody>
            <tr>
              <Cell label="Render" value={verdict.totalReference} />
              <Cell label="Phát hiện" value={verdict.totalDetected} />
              <Cell label="Khớp" value={verdict.matched} />
              <Cell label="Thiếu" value={verdict.missing} />
              <Cell label="Trùng" value={verdict.duplicates} />
              <Cell label="Dư/lạ" value={verdict.extras} />
              <Cell label="Nghi ngờ" value={verdict.uncertain} />
            </tr>
          </tbody>
        </table>
      </section>

      <PrintGroup title="Thiếu" count={match.missingIds.length}>
        {match.missingIds.map((id) => {
          const key = refById.get(id);
          if (!key) return null;
          return (
            <KeyThumb
              key={id}
              source={renderCanvas}
              item={key}
              caption={`Render · ${key.sizeClass}`}
            />
          );
        })}
      </PrintGroup>

      <PrintGroup title="Trùng" count={match.duplicateIds.length}>
        {match.duplicateIds.map((id) => {
          const customer = customerById.get(id);
          if (!customer) return null;
          return (
            <KeyThumb
              key={id}
              source={sourceForCustomer(customer)}
              item={customer}
              caption={`Khách #${customer.imageIndex + 1} · ${customer.sizeClass}`}
            />
          );
        })}
      </PrintGroup>

      <PrintGroup title="Dư / lạ" count={match.extraIds.length}>
        {match.extraIds.map((id) => {
          const customer = customerById.get(id);
          if (!customer) return null;
          return (
            <KeyThumb
              key={id}
              source={sourceForCustomer(customer)}
              item={customer}
              caption={`Khách #${customer.imageIndex + 1} · ${customer.sizeClass}`}
            />
          );
        })}
      </PrintGroup>

      {match.uncertain.length > 0 && (
        <section className="avoid-break" style={{ marginTop: 12 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 13 }}>
            Cặp nghi ngờ ({match.uncertain.length})
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={thStyle}>Render</th>
                <th style={thStyle}>Khách</th>
                <th style={thStyle}>Độ giống</th>
                <th style={thStyle}>Staff</th>
              </tr>
            </thead>
            <tbody>
              {match.uncertain.map((pair) => {
                const ref = refById.get(pair.refId);
                const customer = customerById.get(pair.customerId);
                if (!ref || !customer) return null;
                const decision = reviews[pair.customerId];
                return (
                  <tr key={pair.customerId}>
                    <td style={tdStyle}>{ref.sizeClass}</td>
                    <td style={tdStyle}>
                      #{customer.imageIndex + 1} · {customer.sizeClass}
                    </td>
                    <td style={tdStyle}>{Math.round((1 - pair.distance) * 100)}%</td>
                    <td style={tdStyle}>
                      {decision === "confirmed"
                        ? "Đã xác nhận khớp"
                        : decision === "rejected"
                          ? "Đã loại"
                          : "Chưa xác nhận"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <footer
        className="avoid-break"
        style={{ marginTop: 24, display: "flex", gap: 24, fontSize: 10 }}
      >
        <SignatureLine label="Người kiểm tra" />
        <SignatureLine label="Ngày / giờ" />
        <SignatureLine label="Ghi chú" />
      </footer>
    </div>
  );

  return createPortal(content, document.body);
}

function PrintGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section className="avoid-break" style={{ marginTop: 12 }}>
      <h2 style={{ margin: "0 0 4px", fontSize: 13 }}>
        {title} ({count})
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px" }}>
      <span style={{ color: "#64748b" }}>{label}: </span>
      <strong>{value}</strong>
    </td>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ borderBottom: "1px solid #94a3b8", height: 24 }} />
      <p style={{ margin: "2px 0 0" }}>{label}</p>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  padding: "3px 6px",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  padding: "3px 6px",
};
