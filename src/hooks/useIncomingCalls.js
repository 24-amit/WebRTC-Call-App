import { useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot } from "../firebase";
import { useNavigate } from "react-router-dom";
export default function useIncomingCalls() {
    const navigate = useNavigate();
    useEffect(() => {
        const me = auth.currentUser?.phoneNumber;
        if (!me) return;
        const q = query(collection(db, "calls"), where("to", "==", me), where("status", "==", "ringing"));
        const unsub = onSnapshot(q, (snap) => {
            snap.docChanges().forEach((c) => {
                if (c.type === "added") {
                    navigate(`/call/${c.doc.id}`); // will open CallScreen in receiver mode
                }
            });
        });
        return () => unsub();
    }, [navigate]);
}