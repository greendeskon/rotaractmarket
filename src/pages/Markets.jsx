import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useParlay } from "../context/ParlayContext";
import Ticker from "../components/Ticker";

const CATS = [
    { key: "coordinator", label: "Coordinator", sub: "Top 2 win · Binary YES/NO" },
    { key: "gensec", label: "Gen Secretary", sub: "1 winner · Shared pool" },
    { key: "jointsec", label: "Joint Secretary", sub: "1 winner · Shared pool" },
    { key: "side", label: "Side Markets", sub: "Binary YES/NO" },
];

export default function Markets() {
    const [markets, setMarkets] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "markets"), snap => {
            setMarkets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return unsub;
    }, []);

    const grouped = {};
    CATS.forEach(c => { grouped[c.key] = markets.filter(m => m.category === c.key); });

    return (
        <div style={{ background: "#09090b", minHeight: "100vh" }}>
            <Ticker />
            <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px 80px" }}>
                {CATS.map(cat => {
                    const items = grouped[cat.key];
                    if (!items?.length) return null;
                    return (
                        <div key={cat.key} style={{ marginBottom: 36 }}>
                            <div style={{ marginBottom: 14 }}>
                                <h2 style={{ color: "#e4e4e7", fontSize: 16, fontWeight: 600, margin: 0 }}>{cat.label}</h2>
                                <span style={{ color: "#52525b", fontSize: 12 }}>{cat.sub}</span>
                            </div>
                            {items.map(m => m.type === "race"
                                ? <RaceCard key={m.id} market={m} onClick={() => navigate(`/markets/${m.id}`)} />
                                : <BinaryRow key={m.id} market={m} onClick={() => navigate(`/markets/${m.id}`)} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Race Card (single-winner shared pool) ── */
function RaceCard({ market, onClick }) {
    const { addLeg, legs } = useParlay();
    const cands = market.candidates || {};
    const entries = Object.entries(cands);
    const total = entries.reduce((s, [, c]) => s + c.shares, 0);
    const sorted = entries.map(([k, c]) => ({ key: k, name: c.name, pct: total > 0 ? Math.round(c.shares / total * 100) : 0 })).sort((a, b) => b.pct - a.pct);
    const max = Math.max(...sorted.map(d => d.pct), 1);
    const sc = { open: "#34d399", frozen: "#fbbf24", settled: "#52525b" }[market.status] ?? "#52525b";

    function handleParlay(e, key, name, pct) {
        e.stopPropagation();
        const err = addLeg(market.id, `${name} wins ${market.title}`, market.category, "yes", pct, { type: "race", candidate: key });
        if (err) alert(err);
    }

    return (
        <div onClick={onClick} style={{ background: "#111113", border: "1px solid #1a1a1f", borderRadius: 10, padding: "16px", marginBottom: 6, cursor: "pointer", transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#27272a"} onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1a1f"}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: "#d4d4d8", fontWeight: 600, fontSize: 14 }}>{market.title}</span>
                <span style={{ color: sc, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{market.status}</span>
            </div>
            {sorted.map(d => {
                const inP = legs.find(l => l.marketId === market.id && l.extra?.candidate === d.key);
                return (
                    <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 80, fontSize: 12, color: "#a1a1aa", textAlign: "right", flexShrink: 0 }}>{d.name.split(" ")[0]}</span>
                        <div style={{ flex: 1, height: 6, background: "#1a1a1f", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${(d.pct / max) * 100}%`, height: "100%", background: "#818cf8", borderRadius: 3, transition: "width 0.4s" }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#e4e4e7", fontWeight: 600, width: 32, flexShrink: 0 }}>{d.pct}¢</span>
                        {market.status === "open" && (
                            <button onClick={e => handleParlay(e, d.key, d.name, d.pct)}
                                style={{ background: inP ? "rgba(129,140,248,0.15)" : "transparent", border: `1px solid ${inP ? "#818cf8" : "#27272a33"}`, color: inP ? "#818cf8" : "#3f3f46", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                                {inP ? "✓" : "+"}
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ── Binary Row (coordinator / side YES-NO) ── */
function BinaryRow({ market, onClick }) {
    const { addLeg, legs } = useParlay();
    const total = market.yesShares + market.noShares;
    const yes = total > 0 ? Math.round(market.yesShares / total * 100) : 50;
    const sc = { open: "#34d399", frozen: "#fbbf24", settled: "#52525b" }[market.status] ?? "#52525b";
    const inP = legs.find(l => l.marketId === market.id);
    const vol = total - 200;

    function handleP(e, side) {
        e.stopPropagation();
        const err = addLeg(market.id, market.title, market.category, side, side === "yes" ? yes : 100 - yes);
        if (err) alert(err);
    }

    return (
        <div onClick={onClick} style={{
            background: inP ? "rgba(129,140,248,0.04)" : "#111113",
            border: `1px solid ${inP ? "rgba(129,140,248,0.15)" : "#1a1a1f"}`,
            borderRadius: 10, padding: "14px 16px", cursor: "pointer", transition: "all 0.15s", marginBottom: 6,
        }}
            onMouseEnter={e => { if (!inP) e.currentTarget.style.borderColor = "#27272a"; }}
            onMouseLeave={e => { if (!inP) e.currentTarget.style.borderColor = "#1a1a1f"; }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ color: "#d4d4d8", fontWeight: 500, fontSize: 14, flex: 1, marginRight: 12 }}>{market.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {vol > 0 && <span style={{ color: "#3f3f46", fontSize: 10 }}>vol:{vol}</span>}
                    <span style={{ color: sc, fontSize: 10, fontWeight: 600, textTransform: "uppercase" }}>{market.status}</span>
                </div>
            </div>
            <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 4, marginBottom: 8, background: "#1a1a1f" }}>
                <div style={{ width: `${yes}%`, background: "#34d399", transition: "width 0.4s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: "#34d399", fontWeight: 600, fontSize: 13 }}>Yes {yes}¢</span>
                    <span style={{ color: "#f87171", fontWeight: 600, fontSize: 13 }}>No {100 - yes}¢</span>
                </div>
                {market.status === "open" && (
                    <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button onClick={e => handleP(e, "yes")} style={pBtn("#34d399", inP?.side === "yes")}>+Y</button>
                        <button onClick={e => handleP(e, "no")} style={pBtn("#f87171", inP?.side === "no")}>+N</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function pBtn(c, active) {
    return { background: active ? c : "transparent", color: active ? "#09090b" : c, border: `1px solid ${c}44`, borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" };
}