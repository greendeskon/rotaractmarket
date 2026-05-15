import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

const PHASE_COLORS = { SOP: "#60a5fa", SPEECH: "#fbbf24", GRILLING: "#f87171", RESULTS: "#34d399" };

export default function Ticker() {
    const [state, setState] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "meta", "appState"), (snap) => {
            if (snap.exists()) setState(snap.data());
        });
        return unsub;
    }, []);

    if (!state) return null;
    const color = PHASE_COLORS[state.phase] ?? "#71717a";

    return (
        <div style={{
            background: "#0c0c0f", borderBottom: "1px solid #1a1a1f",
            padding: "7px 20px", display: "flex", alignItems: "center", gap: 10,
            overflow: "hidden",
        }}>
            <span style={{
                color, fontWeight: 700, fontSize: 10, padding: "2px 8px",
                borderRadius: 3, border: `1px solid ${color}33`,
                background: `${color}15`, letterSpacing: 1.2,
                textTransform: "uppercase", flexShrink: 0,
            }}>
                {state.phase}
            </span>
            <span style={{ color: "#71717a", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {state.tickerMessage || "—"}
            </span>
        </div>
    );
}