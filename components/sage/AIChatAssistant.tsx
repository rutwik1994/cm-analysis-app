"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ROWS } from "@/lib/data";

// ── Types ─────────────────────────────────────────────────────────────────────
type ChatMessage = { role: "user" | "assistant"; text: string };

// ── Page-aware context label ──────────────────────────────────────────────────
function getPageLabel(pathname: string): string {
  if (pathname === "/")                  return "Spend Analysis";
  if (pathname.startsWith("/contracts")) return "Contract Monitor";
  if (pathname.startsWith("/suppliers")) return "Supplier Tracker";
  if (pathname.startsWith("/budget"))    return "Budget Forecast";
  if (pathname === "/category")          return "Category Overview";
  if (pathname.startsWith("/category/dach"))    return "Category Management · DACH";
  if (pathname.startsWith("/category/us"))      return "Category Management · US";
  if (pathname.startsWith("/category/dkse"))    return "Category Management · DKSE";
  if (pathname.startsWith("/category/benelux")) return "Category Management · BENELUX";
  if (pathname.startsWith("/reports"))   return "Reports";
  return "Procurement Analytics";
}

// ── Build full-dataset context string ─────────────────────────────────────────
// One row per supplier across the whole dataset — kept compact so the model
// always sees all suppliers without truncation.
function buildGlobalContext(pathname: string): string {
  const lines: string[] = [];
  lines.push(`## Active page: ${getPageLabel(pathname)}`);
  lines.push("");

  // Deduplicate suppliers by name + market + category (some suppliers serve multiple markets)
  const supMap = new Map<
    string,
    { supplier: string; category: string; market: string; categoryManager: string; actualEur: number; awardedEur: number }
  >();
  for (const r of ROWS) {
    const key = `${r.supplier}|${r.category}|${r.market}`;
    if (!supMap.has(key)) {
      supMap.set(key, {
        supplier: r.supplier,
        category: r.category,
        market: r.market,
        categoryManager: r.categoryManager,
        actualEur: 0,
        awardedEur: 0,
      });
    }
    const e = supMap.get(key)!;
    e.actualEur  = Math.max(e.actualEur,  r.cumulativeActualSpendEur);
    e.awardedEur = Math.max(e.awardedEur, r.cumulativeAwardedSpendEur);
  }

  const allSups = [...supMap.values()];
  const totalActual  = allSups.reduce((s, v) => s + v.actualEur,  0);
  const totalAwarded = allSups.reduce((s, v) => s + v.awardedEur, 0);
  const utilisation  = totalAwarded > 0 ? Math.round((totalActual / totalAwarded) * 100) : 0;
  const atRisk = allSups.filter(v => v.awardedEur > 0 && v.actualEur / v.awardedEur >= 0.8).length;

  lines.push(`## Portfolio Totals (across all categories and markets)`);
  lines.push(`- Total Actual Spend: €${totalActual.toLocaleString("de-DE")}`);
  lines.push(`- Total Awarded Budget: €${totalAwarded.toLocaleString("de-DE")}`);
  lines.push(`- Budget Utilisation: ${utilisation}%`);
  lines.push(`- Total Supplier-Market lines: ${allSups.length}`);
  lines.push(`- Suppliers at risk (≥80% utilisation): ${atRisk}`);
  lines.push("");

  lines.push(`## All Suppliers in Dataset`);
  lines.push(`Supplier | Category | Market | Category Manager | Actual Spend | Awarded Budget | Utilisation %`);
  for (const v of allSups) {
    const util = v.awardedEur > 0 ? Math.round((v.actualEur / v.awardedEur) * 100) : 0;
    const flag = util >= 80 ? " ⚠ AT RISK" : "";
    lines.push(`${v.supplier} | ${v.category} | ${v.market} | ${v.categoryManager} | €${v.actualEur.toLocaleString("de-DE")} | €${v.awardedEur.toLocaleString("de-DE")} | ${util}%${flag}`);
  }

  return lines.join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AIChatAssistant() {
  const pathname = usePathname();
  const [open,        setOpen]        = useState(false);
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Hide on login page
  if (pathname === "/login") return null;

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Allow any page to ask a question via a custom event:
  //   window.dispatchEvent(new CustomEvent("ai-chat-ask", { detail: "your question" }))
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail !== "string" || !ce.detail.trim()) return;
      setOpen(true);
      send(ce.detail);
    };
    window.addEventListener("ai-chat-ask", handler);
    return () => window.removeEventListener("ai-chat-ask", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function send(questionText: string) {
    if (!questionText.trim() || loading) return;
    setMessages(prev => [...prev, { role: "user", text: questionText }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText, context: buildGlobalContext(pathname) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Request failed");
      setMessages(prev => [...prev, { role: "assistant", text: data.answer }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => [...prev, { role: "assistant", text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    const q = input.trim();
    if (!q) return;
    setInput("");
    send(q);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Ask AI about this data"
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 1000,
          width: 52, height: 52, borderRadius: "50%",
          background: "#067A46", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(6,122,70,.35)",
          transition: "transform 150ms",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 3l12 12M15 3L3 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.953 9.953 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="white" />
            <path d="M8 11h8M8 15h5" stroke="#067A46" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        {messages.length > 0 && !open && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 16, height: 16, borderRadius: "50%",
            background: "#96DC14", border: "2px solid white",
          }} />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 28, zIndex: 999,
          width: 380, height: 520, borderRadius: 16,
          background: "#fff", border: "1px solid #E4E4E4",
          boxShadow: "0 8px 32px rgba(0,0,0,.12)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            background: "#067A46", padding: "14px 18px",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,.15)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l4.93-1.37A9.953 9.953 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="white" />
              </svg>
            </div>
            <div>
              <div style={{ font: "600 14px/18px var(--font-body)", color: "#fff" }}>Ask about this data</div>
              <div style={{ font: "400 11px/14px var(--font-body)", color: "rgba(255,255,255,.7)" }}>
                {getPageLabel(pathname)}
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} style={{
                marginLeft: "auto", background: "transparent", border: 0, cursor: "pointer",
                color: "rgba(255,255,255,.6)", font: "400 11px var(--font-body)", padding: "4px 8px", borderRadius: 6,
              }}>Clear</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16, padding: "0 8px" }}>
                <div style={{ font: "400 13px/20px var(--font-body)", color: "#888", textAlign: "center" }}>
                  Ask anything about the full procurement dataset — suppliers, markets, utilisation, risk.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                  {[
                    "Which suppliers are over budget?",
                    "Which category manager has the most at-risk suppliers?",
                    "What is the spend split across markets?",
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      style={{
                        background: "#F4FAF6", border: "1px solid #C8E6D4", borderRadius: 8,
                        padding: "8px 12px", cursor: "pointer", textAlign: "left",
                        font: "400 12px/18px var(--font-body)", color: "#067A46",
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%", padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: msg.role === "user" ? "#067A46" : "#F4F4F4",
                    color: msg.role === "user" ? "#fff" : "#242424",
                    font: "400 13px/20px var(--font-body)",
                  }}>
                    {msg.role === "assistant" ? (
                      <ReactMarkdown components={{
                        p:      ({ children }) => <p style={{ margin: "0 0 6px" }}>{children}</p>,
                        ul:     ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: 16 }}>{children}</ul>,
                        ol:     ({ children }) => <ol style={{ margin: "4px 0", paddingLeft: 16 }}>{children}</ol>,
                        li:     ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
                        strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#067A46" }}>{children}</strong>,
                        code:   ({ children }) => <code style={{ background: "#E8E8E8", padding: "1px 4px", borderRadius: 3, fontSize: 12 }}>{children}</code>,
                      }}>{msg.text}</ReactMarkdown>
                    ) : msg.text}
                  </div>
                </div>
              ))
            )}
            {loading && (messages.length === 0 || messages[messages.length - 1].role === "user") && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "#F4F4F4" }}>
                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#BBB", display: "inline-block" }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{
            padding: "12px 14px", borderTop: "1px solid #EEE", flexShrink: 0,
            display: "flex", gap: 8, alignItems: "flex-end",
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Ask about spend, suppliers, risk…"
              rows={1}
              style={{
                flex: 1, resize: "none", border: "1px solid #DDD", borderRadius: 10,
                padding: "9px 12px", font: "400 13px/20px var(--font-body)", color: "#242424",
                outline: "none", background: "#FAFAFA",
                maxHeight: 100, overflowY: "auto",
              }}
            />
            <button
              onClick={submit}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: input.trim() && !loading ? "#067A46" : "#E0E0E0",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 150ms",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M9 3l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
