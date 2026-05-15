import { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    if (user) return <Navigate to="/markets" replace />;

    async function handleLogin() {
        setLoading(true);
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch {
            setError("Invalid email or password");
            setLoading(false);
        }
    }

    const input = {
        background: "#141416", border: "1px solid #27272a", borderRadius: 8,
        padding: "11px 14px", color: "#e4e4e7", fontSize: 14, outline: "none",
        width: "100%", boxSizing: "border-box", transition: "border-color 0.15s",
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center",
            justifyContent: "center", background: "#09090b", flexDirection: "column", gap: 20,
        }}>
            <div style={{ textAlign: "center" }}>
                <h1 style={{ color: "#e4e4e7", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
                    RotaMarket
                </h1>
                <p style={{ color: "#52525b", marginTop: 6, fontSize: 13 }}>Election Prediction Market — AY 2026-27</p>
            </div>

            <div style={{
                background: "#111113", padding: 28, borderRadius: 12,
                width: 320, display: "flex", flexDirection: "column", gap: 12,
                border: "1px solid #1e1e24",
            }}>
                <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                    style={input} onFocus={e => e.target.style.borderColor = "#818cf8"}
                    onBlur={e => e.target.style.borderColor = "#27272a"} />
                <input placeholder="Password" type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    style={input} onFocus={e => e.target.style.borderColor = "#818cf8"}
                    onBlur={e => e.target.style.borderColor = "#27272a"} />
                {error && <p style={{ color: "#f87171", margin: 0, fontSize: 13 }}>{error}</p>}
                <button onClick={handleLogin} disabled={loading} style={{
                    background: "#818cf8", color: "#09090b", border: "none",
                    borderRadius: 8, padding: "11px 0", fontWeight: 600,
                    fontSize: 14, cursor: "pointer", opacity: loading ? 0.6 : 1,
                    transition: "opacity 0.15s",
                }}>
                    {loading ? "Signing in…" : "Sign In"}
                </button>
            </div>
        </div>
    );
}