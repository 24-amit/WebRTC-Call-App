import { db, doc, setDoc, serverTimestamp, getDoc } from "./firebase";
export const setPresence = async (phone) => {
    if (!phone) return;
    await setDoc(doc(db, "presence", phone), { lastSeen: serverTimestamp() }, { merge: true });
};
export const isOnline = async (phone) => {
    const snap = await getDoc(doc(db, "presence", phone));
    if (!snap.exists()) return false;
    const last = snap.data().lastSeen?.toDate?.() ?? new Date(0);
    return (Date.now() - last.getTime()) < 5 * 60 * 1000;
};