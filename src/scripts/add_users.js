import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const app = initializeApp({
    apiKey: "AIzaSyBld8X5SlhZVZErwjmAurP6ByRMfbsjDP0",
    authDomain: "rotaractmarket.firebaseapp.com",
    projectId: "rotaractmarket",
    storageBucket: "rotaractmarket.firebasestorage.app",
    messagingSenderId: "265789794418",
    appId: "1:265789794418:web:b6aa3bcdbaafd07002baeb",
});
const db = getFirestore(app);

const users = [
    { uid: "T58v6pYJTRTOOrL2hDGvC5i0xGV2", displayName: "Kaccha_Potato", role: "user" },
    { uid: "vrpmYH9rw3MheGSF8maCyeUCNJy1", displayName: "samykat", role: "user" }
];

async function addUsers() {
    for (const u of users) {
        await setDoc(doc(db, "users", u.uid), { 
            displayName: u.displayName, 
            role: u.role, 
            balance: 10000, 
            portfolio: {}, 
            createdAt: serverTimestamp() 
        }, { merge: true }); // merge true so we don't overwrite if they already exist
        console.log(`✓ Added user: ${u.displayName}`);
    }
    process.exit(0);
}

addUsers();
