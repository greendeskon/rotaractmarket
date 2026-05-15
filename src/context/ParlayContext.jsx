import { createContext, useContext, useState } from "react";
import { db } from "../firebase";
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";

const Ctx = createContext();

export function ParlayProvider({ children }) {
    const [legs, setLegs] = useState([]);
    const [stake, setStake] = useState(100);
    const [open, setOpen] = useState(false);

    // addLeg(marketId, title, category, side, odds, extra?)
    // extra = { type: "race", candidate: "arshita" } for race markets
    function addLeg(marketId, title, category, side, odds, extra) {
        // Same market + same candidate check
        if (extra?.type === "race") {
            if (legs.find(l => l.marketId === marketId && l.extra?.candidate === extra.candidate)) return "Already added";
            // Can't pick two candidates from same single-winner race
            if (legs.find(l => l.marketId === marketId)) return "Only 1 candidate per race — single winner";
        } else {
            if (legs.find(l => l.marketId === marketId)) return "Already added";
        }
        if (legs.length >= 5) return "Max 5 legs";
        setLegs(p => [...p, { marketId, title, category, side, odds, extra }]);
        setOpen(true);
        return null;
    }

    function removeLeg(marketId, candidateKey) {
        setLegs(p => p.filter(l => {
            if (candidateKey) return !(l.marketId === marketId && l.extra?.candidate === candidateKey);
            return l.marketId !== marketId;
        }));
    }
    function clear() { setLegs([]); setOpen(false); }

    const prob = legs.reduce((p, l) => p * (l.odds / 100), 1);
    const mult = prob > 0 ? 1 / prob : 0;
    const payout = Math.round(stake * mult * 100) / 100;

    async function submit(userId) {
        if (legs.length < 2) throw new Error("Need 2+ legs");
        const userRef = doc(db, "users", userId);
        await runTransaction(db, async (t) => {
            const u = (await t.get(userRef)).data();
            if (u.balance < stake) throw new Error("Insufficient balance");
            t.update(userRef, { balance: Math.round((u.balance - stake) * 100) / 100 });
        });
        await addDoc(collection(db, "parlays"), {
            userId,
            legs: legs.map(l => ({
                marketId: l.marketId, side: l.side, oddsAtTime: l.odds, title: l.title,
                ...(l.extra?.candidate ? { candidate: l.extra.candidate } : {}),
            })),
            stake, potentialPayout: payout,
            combinedOdds: Math.round(prob * 10000) / 100,
            multiplier: Math.round(mult * 100) / 100,
            status: "pending", createdAt: serverTimestamp(),
        });
        clear();
    }

    return (
        <Ctx.Provider value={{ legs, stake, setStake, open, setOpen, addLeg, removeLeg, clear, prob, mult, payout, submit }}>
            {children}
        </Ctx.Provider>
    );
}

export function useParlay() { return useContext(Ctx); }
