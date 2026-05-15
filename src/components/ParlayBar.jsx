import { useParlay } from "../context/ParlayContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function ParlayBar() {
    const { legs, stake, setStake, open, setOpen, removeLeg, clear, prob, mult, payout, submit } = useParlay();
    const { user } = useAuth();
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");
    const [showInfo, setShowInfo] = useState(false);

    if (!open && legs.length === 0) return null;

    // Minimized state — just show a pill
    if (!open && legs.length > 0) {
        return (
            <button onClick={() => setOpen(true)} style={{
                position: "fixed", bottom: 16, right: 16, zIndex: 200,
                background: "#818cf8", color: "#09090b", border: "none",
                borderRadius: 20, padding: "10px 18px", cursor: "pointer",
                fontWeight: 700, fontSize: 13, boxShadow: "0 4px 20px rgba(129,140,248,0.3)",
            }}>
                Parlay ({legs.length}) →
            </button>
        );
    }

    async function handleSubmit() {
        setBusy(true); setMsg("");
        try { await submit(user.uid); setMsg("✓ Parlay placed!"); setTimeout(() => setMsg(""), 3000); }
        catch (e) { setMsg(e.message); }
        setBusy(false);
    }

    const combinedOdds = Math.round(prob * 10000) / 100;

    return (
        <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
            background: "#0f0f12", borderTop: "1px solid #27272a",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
        }}>
            <div style={{ maxWidth: 580, margin: "0 auto", padding: "16px 16px 20px" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#818cf8", fontWeight: 700, fontSize: 14 }}>
                            Parlay Builder
                        </span>
                        <span style={{ background: "#818cf8", color: "#09090b", fontSize: 11, fontWeight: 800, padding: "2px 7px", borderRadius: 10 }}>
                            {legs.length}
                        </span>
                        <button onClick={() => setShowInfo(!showInfo)} style={{
                            background: "none", border: "1px solid #27272a", color: "#52525b", borderRadius: 10,
                            padding: "1px 8px", fontSize: 11, cursor: "pointer",
                        }}>?</button>
                    </div>
                    <button onClick={() => setOpen(false)} style={{
                        background: "none", border: "none", color: "#52525b", cursor: "pointer", fontSize: 20, lineHeight: 1,
                    }}>×</button>
                </div>

                {/* Info explainer */}
                {showInfo && (
                    <div style={{
                        background: "rgba(129,140,248,0.06)", border: "1px solid rgba(129,140,248,0.12)",
                        borderRadius: 8, padding: "12px 14px", marginBottom: 12, fontSize: 12, color: "#a1a1aa", lineHeight: 1.5,
                    }}>
                        <div style={{ color: "#818cf8", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>How Parlays Work</div>
                        <div style={{ marginBottom: 4 }}>A parlay combines multiple bets into one. <b style={{ color: "#e4e4e7" }}>All legs must win</b> for the parlay to pay out — if any leg loses, you lose your stake.</div>
                        <div style={{ marginBottom: 4 }}>The odds multiply together, so risk is higher but so is the reward.</div>
                        <div style={{ display: "flex", gap: 16, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(129,140,248,0.1)" }}>
                            <div><span style={{ color: "#52525b" }}>Max legs:</span> <span style={{ color: "#e4e4e7" }}>5</span></div>
                            <div><span style={{ color: "#52525b" }}>Min legs:</span> <span style={{ color: "#e4e4e7" }}>2</span></div>
                            <div><span style={{ color: "#52525b" }}>Per race:</span> <span style={{ color: "#e4e4e7" }}>1 leg max</span></div>
                        </div>
                    </div>
                )}

                {/* Legs */}
                <div style={{ marginBottom: 12 }}>
                    {legs.map((l, i) => (
                        <div key={l.marketId} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "8px 10px", marginBottom: 4,
                            background: "#141416", borderRadius: 6, border: "1px solid #1e1e24",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                <span style={{ color: "#52525b", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>#{i + 1}</span>
                                <span style={{
                                    color: l.side === "yes" ? "#34d399" : "#f87171", fontWeight: 700,
                                    fontSize: 11, padding: "1px 6px", borderRadius: 3,
                                    background: l.side === "yes" ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                                    flexShrink: 0,
                                }}>{l.side.toUpperCase()}</span>
                                <span style={{ color: "#d4d4d8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {l.title}
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                <span style={{ color: "#818cf8", fontSize: 12, fontWeight: 600 }}>{l.odds}¢</span>
                                <button onClick={() => removeLeg(l.marketId)} style={{
                                    background: "none", border: "none", color: "#3f3f46", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px",
                                }}>×</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats row */}
                <div className="stat-row" style={{
                    display: "flex", gap: 1, marginBottom: 12,
                    background: "#1a1a1f", borderRadius: 8, overflow: "hidden",
                }}>
                    <StatBox label="Combined Prob" value={`${combinedOdds}%`} color="#a1a1aa" />
                    <StatBox label="Multiplier" value={`${mult.toFixed(1)}×`} color="#818cf8" />
                    <StatBox label="Potential Payout" value={`₹${payout}`} color="#34d399" />
                </div>

                {/* Stake + actions */}
                <div className="parlay-actions" style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ color: "#52525b", fontSize: 11, display: "block", marginBottom: 4 }}>Stake (₹)</label>
                        <input type="number" min={1} value={stake} onChange={e => setStake(Math.max(1, +e.target.value || 1))}
                            style={{
                                background: "#111113", border: "1px solid #27272a", borderRadius: 6,
                                padding: "10px 12px", color: "#e4e4e7", fontSize: 14, width: "100%",
                                boxSizing: "border-box", outline: "none",
                            }} />
                    </div>
                    <div className="parlay-btn-group" style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                        <button onClick={handleSubmit} disabled={busy || legs.length < 2} style={{
                            padding: "10px 20px", borderRadius: 6, border: "none", cursor: legs.length < 2 ? "default" : "pointer",
                            background: legs.length < 2 ? "#27272a" : "#818cf8",
                            color: legs.length < 2 ? "#52525b" : "#09090b",
                            fontWeight: 700, fontSize: 13, opacity: busy ? 0.5 : 1, whiteSpace: "nowrap",
                        }}>
                            {busy ? "Placing…" : legs.length < 2 ? "Add more legs" : `Place Parlay (${mult.toFixed(1)}×)`}
                        </button>
                        <button onClick={clear} style={{
                            padding: "10px 12px", borderRadius: 6, border: "1px solid #27272a",
                            background: "transparent", color: "#52525b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
                        }}>Clear</button>
                    </div>
                </div>

                {msg && (
                    <div style={{
                        marginTop: 8, padding: "6px 10px", borderRadius: 6, fontSize: 12,
                        color: msg.startsWith("✓") ? "#34d399" : "#f87171",
                        background: msg.startsWith("✓") ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
                    }}>{msg}</div>
                )}
            </div>
        </div>
    );
}

function StatBox({ label, value, color }) {
    return (
        <div style={{ flex: 1, padding: "10px 12px", textAlign: "center", background: "#141416" }}>
            <div style={{ color: "#52525b", fontSize: 10, fontWeight: 600, marginBottom: 3, letterSpacing: 0.3 }}>{label}</div>
            <div style={{ color, fontWeight: 700, fontSize: 16 }}>{value}</div>
        </div>
    );
}
