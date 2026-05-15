import { Link, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const C = {
    bg: "#0f0f12", border: "#1e1e24", accent: "#818cf8",
    text: "#a1a1aa", active: "#e4e4e7",
};

export default function Navbar() {
    const { userData } = useAuth();
    const { pathname } = useLocation();

    const links = [
        { to: "/markets", label: "Markets" },
        { to: "/leaderboard", label: "Leaderboard" },
        { to: "/portfolio", label: "Portfolio" },
        ...(userData?.role === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
    ];

    return (
        <nav className="nav-wrapper" style={{
            background: C.bg, borderBottom: `1px solid ${C.border}`,
            padding: "0 20px", display: "flex", alignItems: "center",
            justifyContent: "space-between", height: 52, position: "sticky",
            top: 0, zIndex: 100, backdropFilter: "blur(12px)",
            width: "100%", boxSizing: "border-box", overflow: "hidden"
        }}>
            <Link className="nav-brand" to="/markets" style={{ color: C.accent, fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px", flexShrink: 0 }}>
                RotaMarket
            </Link>

            <div className="nav-links hide-scrollbar" style={{ display: "flex", gap: 2, alignItems: "center" }}>
                {links.map(l => {
                    const active = pathname === l.to || pathname.startsWith(l.to + "/");
                    return (
                        <Link key={l.to} to={l.to} style={{
                            color: active ? C.active : C.text,
                            padding: "6px 12px", borderRadius: 6,
                            fontSize: 13, fontWeight: active ? 600 : 400,
                            background: active ? "rgba(129,140,248,0.08)" : "transparent",
                            transition: "all 0.15s",
                            whiteSpace: "nowrap"
                        }}>
                            {l.label}
                        </Link>
                    );
                })}

                <div style={{
                    color: "#e4e4e7", fontWeight: 600, fontSize: 13,
                    marginLeft: 12, padding: "5px 10px", borderRadius: 6,
                    background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.15)",
                    whiteSpace: "nowrap"
                }}>
                    ₹{userData?.balance?.toLocaleString() ?? "—"}
                </div>
            </div>

            <button className="nav-logout" onClick={() => signOut(auth)} style={{
                background: "transparent", border: "1px solid #27272a", color: "#71717a",
                borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12,
                marginLeft: 12, transition: "all 0.15s", flexShrink: 0
            }}>
                Logout
            </button>
        </nav>
    );
}