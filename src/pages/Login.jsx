import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, setDoc } from "firebase/firestore";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const [isSignUp, setIsSignUp] = useState(false);
    const [username, setUsername] = useState("");

    if (user) return <Navigate to="/markets" replace />;

    async function handleSubmit() {
        if (isSignUp && !username.trim()) {
            setError("Please enter a username");
            return;
        }
        setLoading(true);
        setError("");
        try {
            if (isSignUp) {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(res.user, { displayName: username.trim() });
                await setDoc(doc(db, "users", res.user.uid), { displayName: username.trim() }, { merge: true });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (e) {
            setError(e.code === "auth/email-already-in-use" ? "Email already exists" : 
                     e.code === "auth/weak-password" ? "Password must be at least 6 characters" :
                     "Invalid email or password");
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
                {isSignUp && (
                    <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                        style={input} onFocus={e => e.target.style.borderColor = "#818cf8"}
                        onBlur={e => e.target.style.borderColor = "#27272a"} />
                )}
                <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                    style={input} onFocus={e => e.target.style.borderColor = "#818cf8"}
                    onBlur={e => e.target.style.borderColor = "#27272a"} />
                <input placeholder="Password" type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={input} onFocus={e => e.target.style.borderColor = "#818cf8"}
                    onBlur={e => e.target.style.borderColor = "#27272a"} />
                {error && <p style={{ color: "#f87171", margin: 0, fontSize: 13 }}>{error}</p>}
                <button onClick={handleSubmit} disabled={loading} style={{
                    background: "#818cf8", color: "#09090b", border: "none",
                    borderRadius: 8, padding: "11px 0", fontWeight: 600,
                    fontSize: 14, cursor: "pointer", opacity: loading ? 0.6 : 1,
                    transition: "opacity 0.15s",
                    marginTop: 4
                }}>
                    {loading ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Create Account" : "Sign In")}
                </button>
                <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span style={{ color: "#71717a", fontSize: 13 }}>
                        {isSignUp ? "Already have an account? " : "Don't have an account? "}
                    </span>
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(""); }} style={{
                        background: "none", border: "none", color: "#818cf8", fontSize: 13,
                        fontWeight: 600, cursor: "pointer", padding: 0, textDecoration: "underline"
                    }}>
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
}