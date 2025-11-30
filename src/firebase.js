// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
    getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut
} from "firebase/auth";
import {
    getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot,
    serverTimestamp, collection, addDoc, query, orderBy, where, getDocs
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyChrqABfxc7MaLN-Q18VBVv2PNAy4xBmWU",
    authDomain: "webrtc-call-app-3467f.firebaseapp.com",
    projectId: "webrtc-call-app-3467f",
    storageBucket: "webrtc-call-app-3467f.firebasestorage.app",
    messagingSenderId: "580802850128",
    appId: "1:580802850128:web:11ad32b765bf3ece3b5055",
    measurementId: "G-XCZ4Y4RJQ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const setupRecaptcha = (containerId = "recaptcha-container") => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
    }
    return window.recaptchaVerifier;
};

const startPhoneSignIn = async (phone) => {
    const verifier = setupRecaptcha();
    return signInWithPhoneNumber(auth, phone, verifier);
};

export {
    app, auth, db, onAuthStateChanged, signOut,
    startPhoneSignIn, RecaptchaVerifier,
    doc, setDoc, getDoc, updateDoc, onSnapshot,
    serverTimestamp, collection, addDoc, query, orderBy, where, getDocs
};