import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp, getDocs, collection } from "firebase/firestore";

const app = initializeApp({
    apiKey: "AIzaSyBld8X5SlhZVZErwjmAurP6ByRMfbsjDP0",
    authDomain: "rotaractmarket.firebaseapp.com",
    projectId: "rotaractmarket",
    storageBucket: "rotaractmarket.firebasestorage.app",
    messagingSenderId: "265789794418",
    appId: "1:265789794418:web:b6aa3bcdbaafd07002baeb",
});
const db = getFirestore(app);

const CANDIDATES = ["arshita", "guramant", "lorena", "nandinee", "princy", "raghav", "sarthak", "yashika"];
const CAND_NAMES = { arshita: "Arshita", guramant: "Guramant Kaur", lorena: "Lorena Kundalwal", nandinee: "Nandinee Patel", princy: "Princy Sanghvi", raghav: "Raghav Bansal", sarthak: "Sarthak Jain", yashika: "Yashika Juyal" };

const users = [
    { uid: "eGroY1qAS5YALDcNPQuIFwhuzih1", displayName: "daksh", role: "admin" },
    { uid: "SRBZoBhjIGXGCYalmwfhhRg9myz2", displayName: "greendesk", role: "user" },
    { uid: "3wDZ6JrFn9dsCXtda7QFEBA4liQ2", displayName: "RajuBoi69", role: "user" },
    { uid: "i0kPZG59xWQL2VyNqos6NX9def42", displayName: "exvp💔", role: "user" }
];

async function seed() {
    // Users
    for (const u of users) {
        await setDoc(doc(db, "users", u.uid), { displayName: u.displayName, role: u.role, balance: 10000, portfolio: {}, createdAt: serverTimestamp() });
        console.log(`✓ User: ${u.displayName}`);
    }

    // Delete all trades
    const tradesSnap = await getDocs(collection(db, "trades"));
    for (const d of tradesSnap.docs) await deleteDoc(d.ref);
    console.log("✓ Cleared all trades");

    // Delete all parlays
    const parlaysSnap = await getDocs(collection(db, "parlays"));
    for (const d of parlaysSnap.docs) await deleteDoc(d.ref);
    console.log("✓ Cleared all parlays");

    // Delete old individual gensec/jointsec markets
    for (const c of CANDIDATES) {
        for (const prefix of ["gensec_", "jointsec_"]) {
            await deleteDoc(doc(db, "markets", prefix + c)).catch(() => { });
        }
    }
    console.log("✓ Cleaned old markets");

    // Coordinator — binary YES/NO (multi-winner, top 2)
    const coordCandidates = ["arshita", "dipanshi", "lorena", "pari", "raghav"];
    const coordNames = { arshita: "Arshita", dipanshi: "Dipanshi Goel", lorena: "Lorena Kundalwal", pari: "Pari Aggarwal", raghav: "Raghav Bansal" };
    for (const c of coordCandidates) {
        await setDoc(doc(db, "markets", "coord_" + c), {
            title: `${coordNames[c]} makes top 2`, category: "coordinator", type: "binary",
            status: "open", outcome: null, yesShares: 100, noShares: 100, createdAt: serverTimestamp(),
        });
        console.log(`✓ Coord: ${coordNames[c]}`);
    }

    // Gen Sec — single-winner race (shared pool)
    const candidates = {};
    for (const c of CANDIDATES) candidates[c] = { name: CAND_NAMES[c], shares: 100 };
    await setDoc(doc(db, "markets", "race_gensec"), {
        title: "Gen Secretary", category: "gensec", type: "race",
        status: "open", outcome: null, candidates, createdAt: serverTimestamp(),
    });
    console.log("✓ Race: Gen Secretary");

    // Joint Sec — single-winner race (shared pool)
    const candidates2 = {};
    for (const c of CANDIDATES) candidates2[c] = { name: CAND_NAMES[c], shares: 100 };
    await setDoc(doc(db, "markets", "race_jointsec"), {
        title: "Joint Secretary", category: "jointsec", type: "race",
        status: "open", outcome: null, candidates: candidates2, createdAt: serverTimestamp(),
    });
    console.log("✓ Race: Joint Secretary");

    // Side markets — binary YES/NO
    const sides = [
        { id: "side_timelimit", title: "Will anyone exceed the time limit?" },
        { id: "side_technical", title: "Will there be a technical issue on the day?" },
        { id: "side_comeback", title: "Will someone have a comeback during grilling?" },
        { id: "side_darkhorse", title: "Will a sub-15% candidate win Gen Sec?" },
        { id: "side_mostvotes", title: "Will the Coordinator winner get 70%+ votes?" },
    ];
    for (const s of sides) {
        await setDoc(doc(db, "markets", s.id), {
            title: s.title, category: "side", type: "binary",
            status: "open", outcome: null, yesShares: 100, noShares: 100, createdAt: serverTimestamp(),
        });
        console.log(`✓ Side: ${s.title}`);
    }

    await setDoc(doc(db, "meta", "appState"), { phase: "SOP", tickerMessage: "🗳️ Markets are open. SOP releases tonight at 10 PM." });
    console.log("✅ Seed complete!");
}

seed().catch(console.error);