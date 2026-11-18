"use client";

import { useState } from "react";
import { X, HelpCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface GuideSection {
  heading: string;
  items: GuideItem[];
}

export type GuideItem =
  | { type: "note"; text: React.ReactNode }
  | { type: "steps"; title: string; when?: string; icon?: React.ReactNode; steps: string[]; tip?: string }
  | { type: "error"; code: string; cause: string; fix: string }
  | { type: "badges"; badges: { label: string; bg: string; fg: string; desc: string }[] };

interface Props {
  title: string;
  kicker?: string;
  sections: GuideSection[];
  /** Button label — defaults to "Hướng dẫn" */
  label?: string;
}

export function PageGuide({ title, kicker = "Tài liệu nội bộ", sections, label = "Hướng dẫn" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="w-btn" onClick={() => setOpen(true)} title={title}>
        <HelpCircle size={15} /> {label}
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(16,35,31,0.55)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "40px 16px", overflowY: "auto",
          }}
        >
          <div style={{
            background: "var(--white)", borderRadius: 16,
            width: "min(720px, 100%)", boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          }}>
            {/* Header */}
            <div style={{
              padding: "22px 28px 18px", borderBottom: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div className="w-kicker">{kicker}</div>
                <h2 style={{ margin: "4px 0 0", fontSize: 20, letterSpacing: "-0.03em" }}>{title}</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  padding: 6, borderRadius: 8, color: "var(--muted)", display: "flex",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
              {sections.map((section, si) => (
                <section key={si}>
                  <h3 style={{
                    margin: "0 0 10px", fontSize: 13, textTransform: "uppercase",
                    letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700,
                  }}>
                    {section.heading}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {section.items.map((item, ii) => {
                      if (item.type === "note") return (
                        <div key={ii} className="w-alert" style={{ margin: 0 }}>{item.text}</div>
                      );

                      if (item.type === "badges") return (
                        <div key={ii} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {item.badges.map((b, bi) => (
                            <div key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                              <span style={{
                                flexShrink: 0, borderRadius: 999, padding: "3px 10px",
                                fontSize: 11, fontWeight: 700, background: b.bg, color: b.fg, marginTop: 1,
                              }}>{b.label}</span>
                              <p style={{ margin: 0, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{b.desc}</p>
                            </div>
                          ))}
                        </div>
                      );

                      if (item.type === "steps") return (
                        <div key={ii} style={{
                          border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px",
                          display: "flex", gap: 14,
                        }}>
                          {item.icon && <div style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                            {item.when && (
                              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                                <strong>Dùng khi:</strong> {item.when}
                              </div>
                            )}
                            <ol style={{ margin: "0 0 0 16px", padding: 0, fontSize: 13, lineHeight: 1.7 }}>
                              {item.steps.map((step, si2) => <li key={si2}>{step}</li>)}
                            </ol>
                            {item.tip && (
                              <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                                💡 {item.tip}
                              </div>
                            )}
                          </div>
                        </div>
                      );

                      if (item.type === "error") return (
                        <div key={ii} style={{
                          border: "1px solid #e6b7b3", borderRadius: 10, padding: "12px 14px",
                          display: "flex", gap: 12,
                        }}>
                          <AlertTriangle size={16} color="#983d38" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div style={{ minWidth: 0 }}>
                            <code style={{ fontSize: 12, fontWeight: 700, color: "#983d38", display: "block", marginBottom: 4 }}>
                              {item.code}
                            </code>
                            <div style={{ fontSize: 12, color: "var(--ink)", marginBottom: 4 }}>
                              <strong>Nguyên nhân:</strong> {item.cause}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--green-dark)" }}>
                              <strong>Xử lý:</strong> {item.fix}
                            </div>
                          </div>
                        </div>
                      );

                      return null;
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: "14px 28px", borderTop: "1px solid var(--line)",
              display: "flex", justifyContent: "flex-end",
            }}>
              <button className="w-btn w-btn-primary" onClick={() => setOpen(false)}>
                <CheckCircle2 size={15} /> Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
