import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubUserDoc = null;

        const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
            if (unsubUserDoc) { unsubUserDoc(); unsubUserDoc = null; }

            if (firebaseUser) {
                setUser(firebaseUser);
                // Real-time listener on user doc so balance/portfolio updates instantly
                unsubUserDoc = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
                    if (snap.exists()) {
                        setUserData({ uid: firebaseUser.uid, ...snap.data() });
                    } else {
                        setUserData({ uid: firebaseUser.uid, displayName: firebaseUser.email, role: "user", balance: 10000, portfolio: {} });
                    }
                    setLoading(false);
                }, () => {
                    setUserData({ uid: firebaseUser.uid, displayName: firebaseUser.email, role: "user", balance: 10000, portfolio: {} });
                    setLoading(false);
                });
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });

        return () => { unsubAuth(); if (unsubUserDoc) unsubUserDoc(); };
    }, []);

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}