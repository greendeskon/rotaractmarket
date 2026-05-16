import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function Leaderboard() {
    const [users, setUsers] = useState([]);
    const [markets, setMarkets] = useState({});
    const { user } = useAuth();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "markets"), snap => {
            const m = {};
            snap.docs.forEach(d => { m[d.id] = { id: d.id, ...d.data() } });
            setMarkets(m);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), snap => {
            const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            setUsers(list);
        });
        return unsub;
    }, []);

    const rankedUsers = [...users].map(u => {
        let portVal = 0;
        if (u.portfolio && Object.keys(markets).length > 0) {
            for (const [key, pos] of Object.entries(u.portfolio)) {
                if (key.includes(":")) {
                    const [mId, candKey] = key.split(":");
                    const m = markets[mId];
                    if (m && m.type === "race" && m.candidates?.[candKey]) {
                        const tp = Object.values(m.candidates).reduce((s, c) => s + c.shares, 0);
                        if (tp > 0) portVal += pos.shares * (m.candidates[candKey].shares / tp);
                    }
                } else {
                    const m = markets[key];
                    if (m) {
                        const t = (m.yesShares || 0) + (m.noShares || 0);
                        if (t > 0) portVal += pos.shares * (pos.side === "yes" ? m.yesShares / t : m.noShares / t);
                    }
                }
            }
        }
        const netWorth = (u.balance || 0) + portVal;
        return { ...u, netWorth, portVal };
    }).sort((a, b) => b.netWorth - a.netWorth);

    return (
        <div style={{ background: "#09090b", minHeight: "100vh" }}>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 16px 60px" }}>
                <h1 style={{ color: "#e4e4e7", fontSize: 20, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.3px" }}>Leaderboard</h1>
                <p style={{ color: "#52525b", fontSize: 13, marginBottom: 24 }}>Rankings by Net Worth (Balance + Portfolio) — live</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {rankedUsers.map((u, i) => {
                        const isYou = u.uid === user?.uid;
                        const rank = i + 1;
                        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                        return (
                            <div key={u.uid} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: isYou ? "rgba(129,140,248,0.06)" : "#111113",
                                border: `1px solid ${isYou ? "rgba(129,140,248,0.15)" : "#1a1a1f"}`,
                                borderRadius: 8, padding: "12px 14px",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span style={{ color: "#52525b", fontSize: 13, fontWeight: 600, width: 28, textAlign: "center" }}>
                                        {medal || `#${rank}`}
                                    </span>
                                    <span style={{ color: isYou ? "#818cf8" : "#d4d4d8", fontSize: 14, fontWeight: isYou ? 600 : 400 }}>
                                        {u.displayName || "Anon"}{isYou ? " (you)" : ""}
                                    </span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                    <span style={{ color: "#e4e4e7", fontWeight: 600, fontSize: 14 }}>
                                        ₹{Math.round(u.netWorth).toLocaleString()}
                                    </span>
                                    {u.portVal > 0 && (
                                        <span style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>
                                            Bal ₹{Math.round(u.balance || 0).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {rankedUsers.length === 0 && (
                    <div style={{ color: "#52525b", textAlign: "center", padding: 40, fontSize: 14 }}>No users yet</div>
                )}
            </div>
        </div>
    );
}