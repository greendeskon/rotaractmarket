import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function Profile() {
    const { user, userData } = useAuth();
    const [name, setName] = useState(userData?.displayName || "");
    const [msg, setMsg] = useState("");
    const [busy, setBusy] = useState(false);

    async function handleSave() {
        if (!name.trim()) return setMsg("Username cannot be empty");
        setBusy(true); setMsg("");
        try {
            await updateDoc(doc(db, "users", user.uid), { displayName: name.trim() });
            setMsg("Profile updated successfully!");
            setTimeout(() => setMsg(""), 3000);
        } catch(e) {
            setMsg(e.message);
        }
        setBusy(false);
    }

    return (
        <div style={{ background: "#09090b", minHeight: "100vh", padding: "40px 16px" }}>
            <div style={{ maxWidth: 400, margin: "0 auto", background: "#111113", border: "1px solid #1a1a1f", borderRadius: 12, padding: 24 }}>
                <h1 style={{ color: "#e4e4e7", fontSize: 20, fontWeight: 600, margin: "0 0 24px" }}>Profile</h1>
                
                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", color: "#a1a1aa", fontSize: 13, marginBottom: 8 }}>Username</label>
                    <input 
                        value={name} 
                        onChange={e => setName(e.target.value)}
                        style={{ width: "100%", background: "#0c0c0f", border: "1px solid #27272a", borderRadius: 6, padding: "10px 12px", color: "#e4e4e7", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", color: "#a1a1aa", fontSize: 13, marginBottom: 8 }}>Email</label>
                    <input 
                        value={user?.email || ""} 
                        disabled
                        style={{ width: "100%", background: "transparent", border: "1px solid #27272a", borderRadius: 6, padding: "10px 12px", color: "#71717a", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }}
                    />
                </div>

                <button 
                    disabled={busy || name.trim() === userData?.displayName}
                    onClick={handleSave}
                    style={{ width: "100%", background: "#818cf8", color: "#09090b", border: "none", borderRadius: 6, padding: "12px", fontSize: 14, fontWeight: 600, cursor: (busy || name.trim() === userData?.displayName) ? "not-allowed" : "pointer", opacity: (busy || name.trim() === userData?.displayName) ? 0.5 : 1 }}
                >
                    {busy ? "Saving..." : "Save Changes"}
                </button>

                {msg && <div style={{ marginTop: 16, padding: "10px", background: msg.includes("success") ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: msg.includes("success") ? "#34d399" : "#f87171", borderRadius: 6, fontSize: 13, textAlign: "center" }}>{msg}</div>}
            </div>
        </div>
    );
}
