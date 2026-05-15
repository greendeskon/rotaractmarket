import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBld8X5SlhZVZErwjmAurP6ByRMfbsjDP0",
    authDomain: "rotaractmarket.firebaseapp.com",
    projectId: "rotaractmarket",
    storageBucket: "rotaractmarket.firebasestorage.app",
    messagingSenderId: "265789794418",
    appId: "1:265789794418:web:b6aa3bcdbaafd07002baeb",
    measurementId: "G-VQK8T56CT9"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);