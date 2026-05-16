import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const PHASES = ["SOP", "SPEECH", "Q/A", "RESULTS"];
const PC = { SOP: "#60a5fa", SPEECH: "#fbbf24", GRILLING: "#f87171", RESULTS: "#34d399" };

export default function Admin() {
    const { userData } = useAuth();
    const [appState, setAppState] = useState(null);
    const [markets, setMarkets] = useState([]);
    const [users, setUsers] = useState([]);
    const [ticker, setTicker] = useState("");
    const [settling, setSettling] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        const u1 = onSnapshot(doc(db, "meta", "appState"), s => { if (s.exists()) { setAppState(s.data()); setTicker(s.data().tickerMessage || ""); } });
        const u2 = onSnapshot(collection(db, "markets"), s => setMarkets(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        const u3 = onSnapshot(collection(db, "users"), s => setUsers(s.docs.map(d => ({ uid: d.id, ...d.data() }))));
        return () => { u1(); u2(); u3(); };
    }, []);

    if (userData?.role !== "admin") return <div style={{ color: "#f87171", padding: 40 }}>Not authorized</div>;

    async function settleRace(marketId, winnerKey) {
        setBusy(true); setMsg("");
        try {
            await updateDoc(doc(db, "markets", marketId), { status: "settled", outcome: winnerKey });
            const batch = writeBatch(db);
            const settlementTrades = [];
            for (const u of users) {
                const pf = { ...u.portfolio }; let bal = u.balance || 0; let changed = false;
                const cands = markets.find(m => m.id === marketId)?.candidates || {};
                for (const ck of Object.keys(cands)) {
                    const pk = `${marketId}:${ck}`;
                    if (!pf[pk]) continue;
                    const pos = pf[pk];
                    let payout = 0;
                    if (ck === winnerKey) { payout = pos.shares; bal += payout; }
                    
                    const realizedPnl = Math.round((payout - (pos.shares * (pos.avgCost || 0))) * 100) / 100;
                    settlementTrades.push({
                        userId: u.uid, marketId, type: "settlement", candidate: ck, shares: pos.shares,
                        payout, realizedPnl
                    });

                    delete pf[pk]; changed = true;
                }
                if (changed) batch.update(doc(db, "users", u.uid), { balance: Math.round(bal * 100) / 100, portfolio: pf });
            }
            await batch.commit();
            // We use another batch for trades, or just addDoc in a loop since batch limit is 500
            for (const st of settlementTrades) {
                await addDoc(collection(db, "trades"), { ...st, timestamp: new Date() });
            }
            setMsg(`Settled → ${winnerKey}`); setSettling(null);
        } catch (e) { setMsg("Error: " + e.message); }
        setBusy(false);
    }

    async function settleBinary(marketId, outcome) {
        setBusy(true); setMsg("");
        try {
            await updateDoc(doc(db, "markets", marketId), { status: "settled", outcome });
            const batch = writeBatch(db);
            const settlementTrades = [];
            for (const u of users) {
                const pos = u.portfolio?.[marketId];
                if (!pos) continue;
                const pf = { ...u.portfolio }; delete pf[marketId];
                const payout = pos.side === outcome ? pos.shares : 0;
                const bal = (u.balance || 0) + payout;
                
                const realizedPnl = Math.round((payout - (pos.shares * (pos.avgCost || 0))) * 100) / 100;
                settlementTrades.push({
                    userId: u.uid, marketId, type: "settlement", side: pos.side, shares: pos.shares,
                    payout, realizedPnl
                });

                batch.update(doc(db, "users", u.uid), { balance: Math.round(bal * 100) / 100, portfolio: pf });
            }
            await batch.commit();
            for (const st of settlementTrades) {
                await addDoc(collection(db, "trades"), { ...st, timestamp: new Date() });
            }
            setMsg(`Settled ${outcome.toUpperCase()}`); setSettling(null);
        } catch (e) { setMsg("Error: " + e.message); }
        setBusy(false);
    }

    const sorted = [...markets].sort((a, b) => ({ open: 0, frozen: 1, settled: 2 }[a.status] || 3) - ({ open: 0, frozen: 1, settled: 2 }[b.status] || 3));

    return (
        <div style={{ background: "#09090b", minHeight: "100vh" }}>
            <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 16px 60px" }}>
                <h1 style={{ color: "#e4e4e7", fontSize: 20, fontWeight: 600, margin: "0 0 24px" }}>Admin Panel</h1>

                <Sec title="PHASE">
                    <div style={{ display: "flex", gap: 6 }}>
                        {PHASES.map(p => <button key={p} onClick={() => updateDoc(doc(db, "meta", "appState"), { phase: p })} style={{ flex: 1, padding: "10px", borderRadius: 6, border: "none", cursor: "pointer", background: appState?.phase === p ? PC[p] : "#141416", color: appState?.phase === p ? "#09090b" : "#71717a", fontWeight: 700, fontSize: 12 }}>{p}</button>)}
                    </div>
                </Sec>

                <Sec title="TICKER">
                    <div style={{ display: "flex", gap: 8 }}>
                        <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Message…" style={{ flex: 1, background: "#0c0c0f", border: "1px solid #27272a", borderRadius: 6, padding: "10px 12px", color: "#e4e4e7", fontSize: 13, outline: "none" }} />
                        <button onClick={() => { updateDoc(doc(db, "meta", "appState"), { tickerMessage: ticker }); setMsg("Updated"); setTimeout(() => setMsg(""), 2000); }} style={{ background: "#818cf8", color: "#09090b", border: "none", borderRadius: 6, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Push</button>
                    </div>
                </Sec>

                {msg && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(129,140,248,0.1)", color: "#818cf8", fontSize: 13, marginBottom: 16 }}>{msg}</div>}

                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>MARKETS</div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button disabled={busy} onClick={async () => {
                                setBusy(true); setMsg("");
                                try {
                                    const batch = writeBatch(db);
                                    markets.filter(m => m.status === "open").forEach(m => batch.update(doc(db, "markets", m.id), { status: "frozen" }));
                                    await batch.commit();
                                    setMsg("All open markets frozen");
                                } catch(e) { setMsg(e.message); }
                                setBusy(false);
                            }} style={adminBtn()}>Freeze All</button>
                            <button disabled={busy} onClick={async () => {
                                setBusy(true); setMsg("");
                                try {
                                    const batch = writeBatch(db);
                                    markets.filter(m => m.status === "frozen").forEach(m => batch.update(doc(db, "markets", m.id), { status: "open" }));
                                    await batch.commit();
                                    setMsg("All frozen markets opened");
                                } catch(e) { setMsg(e.message); }
                                setBusy(false);
                            }} style={adminBtn()}>Unfreeze All</button>
                        </div>
                    </div>
                    {sorted.map(m => {
                        const isRace = m.type === "race";
                        const sc = { open: "#34d399", frozen: "#fbbf24", settled: "#52525b" }[m.status];
                        return (
                            <div key={m.id} style={{ background: "#111113", border: "1px solid #1a1a1f", borderRadius: 8, padding: "12px 14px", marginBottom: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                    <span style={{ color: "#d4d4d8", fontSize: 13, fontWeight: 500 }}>{m.title} <span style={{ color: "#3f3f46", fontSize: 10 }}>{isRace ? "[race]" : "[binary]"}</span></span>
                                    <span style={{ color: sc, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{m.status}</span>
                                </div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    {m.status !== "settled" && <button onClick={() => updateDoc(doc(db, "markets", m.id), { status: m.status === "open" ? "frozen" : "open" })} style={adminBtn()}>{m.status === "open" ? "Freeze" : "Unfreeze"}</button>}
                                    {m.status !== "settled" && <button onClick={() => setSettling(settling === m.id ? null : m.id)} style={{ ...adminBtn(), color: settling === m.id ? "#09090b" : "#f87171", background: settling === m.id ? "#f87171" : "transparent", borderColor: settling === m.id ? "#f87171" : "#27272a" }}>Settle</button>}
                                    {m.status === "settled" && m.outcome && <span style={{ color: "#52525b", fontSize: 11 }}>→ {m.outcome}</span>}
                                </div>
                                {settling === m.id && (
                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #1a1a1f" }}>
                                        {isRace ? (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                {Object.entries(m.candidates || {}).map(([k, c]) => (
                                                    <button key={k} disabled={busy} onClick={() => settleRace(m.id, k)} style={{ padding: "6px 12px", borderRadius: 4, border: "none", background: "#818cf8", color: "#09090b", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>{c.name.split(" ")[0]}</button>
                                                ))}
                                                <button onClick={() => setSettling(null)} style={adminBtn()}>Cancel</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button disabled={busy} onClick={() => settleBinary(m.id, "yes")} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", background: "#34d399", color: "#09090b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>YES</button>
                                                <button disabled={busy} onClick={() => settleBinary(m.id, "no")} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", background: "#f87171", color: "#09090b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>NO</button>
                                                <button onClick={() => setSettling(null)} style={adminBtn()}>Cancel</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Sec({ title, children }) { return <div style={{ marginBottom: 24 }}><div style={{ color: "#71717a", fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: 0.5 }}>{title}</div>{children}</div>; }
function adminBtn() { return { background: "transparent", border: "1px solid #27272a", color: "#71717a", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer" }; }