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
    const [trades, setTrades] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "markets"), snap => {
            setMarkets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubT = onSnapshot(collection(db, "trades"), snap => {
            const tr = snap.docs.map(d => d.data());
            tr.sort((a,b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            setTrades(tr);
        });
        return () => { unsub(); unsubT(); };
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
                                <h2 style={{ color: "#e4e4e7", fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" }}>{cat.label}</h2>
                                <span style={{ color: "#71717a", fontSize: 13 }}>{cat.sub}</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {items.map(m => {
                                    const mTrades = trades.filter(t => t.marketId === m.id);
                                    return m.type === "race"
                                        ? <RaceCard key={m.id} market={m} trades={mTrades} onClick={() => navigate(`/markets/${m.id}`)} />
                                        : <BinaryRow key={m.id} market={m} trades={mTrades} onClick={() => navigate(`/markets/${m.id}`)} />;
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── Sparkline SVG Helper ── */
function Sparkline({ data, color, width = 60, height = 24 }) {
    if (!data || data.length < 2) return <div style={{ width, height, opacity: 0.2 }}><svg width={width} height={height}><path d={`M0,${height/2} L${width},${height/2}`} stroke={color} strokeWidth="1.5" strokeDasharray="2,2" fill="none"/></svg></div>;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / range) * height}`).join(" ");
    return (
        <svg width={width} height={height} style={{ overflow: "visible" }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

/* ── Race Card (single-winner shared pool) ── */
function RaceCard({ market, trades, onClick }) {
    const { addLeg, legs } = useParlay();
    const cands = market.candidates || {};
    const entries = Object.entries(cands);
    const total = entries.reduce((s, [, c]) => s + c.shares, 0);
    const sorted = entries.map(([k, c]) => ({ key: k, name: c.name, pct: total > 0 ? Math.round(c.shares / total * 100) : 0 })).sort((a, b) => b.pct - a.pct);
    const max = Math.max(...sorted.map(d => d.pct), 1);

    function handleParlay(e, key, name, pct) {
        e.stopPropagation();
        const err = addLeg(market.id, `${name} wins ${market.title}`, market.category, "yes", pct, { type: "race", candidate: key });
        if (err) alert(err);
    }

    return (
        <div onClick={onClick} style={{ 
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", 
            borderRadius: 12, padding: "20px", cursor: "pointer", transition: "all 0.2s ease" 
        }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }} 
           onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                    <div style={{ color: "#e4e4e7", fontWeight: 600, fontSize: 15, marginBottom: 4, letterSpacing: "-0.2px" }}>{market.title}</div>
                    <div style={{ color: "#52525b", fontSize: 11, fontWeight: 500 }}>
                        vol {total.toLocaleString()}
                    </div>
                </div>
                {market.status !== "open" && <span style={{ color: market.status==="frozen"?"#fbbf24":"#52525b", fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4 }}>{market.status.toUpperCase()}</span>}
            </div>
            {sorted.map((d, i) => {
                const inP = legs.find(l => l.marketId === market.id && l.extra?.candidate === d.key);
                const candTrades = trades.filter(t => t.candidate === d.key).map(t => t.price);
                const isUp = candTrades.length > 1 && candTrades[candTrades.length - 1] >= candTrades[candTrades.length - 2];
                const trendColor = isUp ? "#34d399" : "#f87171";
                
                return (
                    <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ width: 80, fontSize: 13, color: "#a1a1aa", textAlign: "right", flexShrink: 0, fontWeight: i === 0 ? 600 : 400 }}>{d.name.split(" ")[0]}</span>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${(d.pct / max) * 100}%`, height: "100%", background: i === 0 ? "#818cf8" : "#52525b", borderRadius: 2, transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                            </div>
                            <div style={{ width: 40, flexShrink: 0, opacity: i < 3 ? 1 : 0.3 }}>
                                <Sparkline data={candTrades} color={trendColor} width={40} height={16} />
                            </div>
                        </div>
                        <span style={{ fontSize: 14, color: "#e4e4e7", fontWeight: 600, width: 36, flexShrink: 0, textAlign: "right" }}>{d.pct}¢</span>
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
function BinaryRow({ market, trades, onClick }) {
    const { addLeg, legs } = useParlay();
    const total = market.yesShares + market.noShares;
    const yes = total > 0 ? Math.round(market.yesShares / total * 100) : 50;
    const inP = legs.find(l => l.marketId === market.id);
    
    const yesTrades = trades.map(t => t.side === "no" ? 100 - t.price : t.price);
    const isUp = yesTrades.length > 1 && yesTrades[yesTrades.length - 1] >= yesTrades[yesTrades.length - 2];
    const trendColor = isUp ? "#34d399" : "#f87171";

    function handleP(e, side) {
        e.stopPropagation();
        const err = addLeg(market.id, market.title, market.category, side, side === "yes" ? yes : 100 - yes);
        if (err) alert(err);
    }

    return (
        <div onClick={onClick} style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 12, padding: "18px 20px", cursor: "pointer", transition: "all 0.2s ease",
        }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ flex: 1, paddingRight: 16 }}>
                    <div style={{ color: "#e4e4e7", fontWeight: 600, fontSize: 15, marginBottom: 6, letterSpacing: "-0.2px", lineHeight: 1.4 }}>{market.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "#52525b", fontSize: 11, fontWeight: 500 }}>vol {total.toLocaleString()}</span>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
                            <Sparkline data={yesTrades} color={trendColor} width={36} height={14} />
                        </div>
                    </div>
                </div>
                {market.status !== "open" && <span style={{ color: market.status==="frozen"?"#fbbf24":"#52525b", fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4, flexShrink: 0 }}>{market.status.toUpperCase()}</span>}
            </div>
            
            <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 6, marginBottom: 12, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ width: `${yes}%`, background: "#34d399", transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)" }} />
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ color: "#34d399", fontWeight: 600, fontSize: 14 }}>Yes {yes}¢</span>
                    <span style={{ color: "#f87171", fontWeight: 600, fontSize: 14 }}>No {100 - yes}¢</span>
                </div>
                {market.status === "open" && (
                    <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
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