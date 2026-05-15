import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export default function Leaderboard() {
    const [users, setUsers] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), snap => {
            const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            list.sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
            setUsers(list);
        });
        return unsub;
    }, []);

    return (
        <div style={{ background: "#09090b", minHeight: "100vh" }}>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 16px 60px" }}>
                <h1 style={{ color: "#e4e4e7", fontSize: 20, fontWeight: 600, margin: "0 0 4px", letterSpacing: "-0.3px" }}>Leaderboard</h1>
                <p style={{ color: "#52525b", fontSize: 13, marginBottom: 24 }}>Rankings by balance — updated in real time</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {users.map((u, i) => {
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
                                <span style={{ color: "#e4e4e7", fontWeight: 600, fontSize: 14 }}>
                                    ₹{(u.balance ?? 0).toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {users.length === 0 && (
                    <div style={{ color: "#52525b", textAlign: "center", padding: 40, fontSize: 14 }}>No users yet</div>
                )}
            </div>
        </div>
    );
}