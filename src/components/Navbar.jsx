import { Link, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";

const C = {
    bg: "rgba(9, 9, 11, 0.75)", border: "transparent", accent: "#e4e4e7",
    text: "#71717a", active: "#e4e4e7",
};

export default function Navbar() {
    const { userData } = useAuth();
    const { pathname } = useLocation();

    const links = [
        { to: "/markets", label: "Markets", icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
        { to: "/leaderboard", label: "Ranks", icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> },
        { to: "/portfolio", label: "Portfolio", icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg> },
        { to: "/profile", label: "Profile", icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
        ...(userData?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }] : []),
    ];

    return (
        <nav className="nav-wrapper" style={{
            background: C.bg, borderBottom: `1px solid rgba(255,255,255,0.03)`,
            padding: "0 24px", display: "flex", alignItems: "center",
            justifyContent: "space-between", height: 60, position: "sticky",
            top: 0, zIndex: 100, backdropFilter: "blur(16px)",
            width: "100%", boxSizing: "border-box"
        }}>
            <Link className="nav-brand" to="/markets" style={{ color: C.accent, fontWeight: 700, fontSize: 16, letterSpacing: "-0.5px", flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                RotaMarket
            </Link>

            <div className="nav-links hide-scrollbar" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {links.map(l => {
                    const active = pathname === l.to || pathname.startsWith(l.to + "/");
                    return (
                        <Link key={l.to} to={l.to} style={{
                            color: active ? C.active : C.text,
                            padding: "8px 12px", borderRadius: 8,
                            fontSize: 13, fontWeight: active ? 600 : 500,
                            background: active ? "rgba(255,255,255,0.06)" : "transparent",
                            transition: "all 0.2s ease",
                            whiteSpace: "nowrap",
                            display: "flex", alignItems: "center", gap: 8
                        }}>
                            <span style={{ opacity: active ? 1 : 0.7 }}>{l.icon}</span>
                            <span className="nav-label">{l.label}</span>
                        </Link>
                    );
                })}

                <div className="balance-badge" style={{
                    color: "#e4e4e7", fontWeight: 600, fontSize: 13,
                    marginLeft: 4, padding: "6px 12px", borderRadius: 8,
                    background: "rgba(129,140,248,0.15)", border: "none",
                    whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6
                }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    ₹{userData?.balance?.toLocaleString() ?? "—"}
                </div>
            </div>

            <button className="nav-logout" onClick={() => signOut(auth)} style={{
                background: "transparent", border: "none", color: "#52525b",
                borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 13,
                marginLeft: 4, transition: "color 0.2s", flexShrink: 0,
                display: "flex", alignItems: "center", gap: 6
            }} onMouseEnter={e => e.currentTarget.style.color = "#f87171"} onMouseLeave={e => e.currentTarget.style.color = "#52525b"}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                <span className="nav-label">Logout</span>
            </button>
        </nav>
    );
}