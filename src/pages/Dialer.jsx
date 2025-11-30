import React, { useEffect, useState } from "react";
import {
  auth,
  db,
  collection,
  addDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  signOut,
} from "../firebase";
import { useNavigate } from "react-router-dom";
import { isOnline } from "../presence";
import usePresenceHeartbeat from "../hooks/usePresenceHeartbeat";
import useIncomingCalls from "../hooks/useIncomingCalls";
import { getDoc, doc } from "firebase/firestore";

const ensureIndiaFormat = (raw) => {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return raw; // already correct format
};

const normalizePhone = (raw) => {
  const digits = (raw || "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (raw.startsWith("+91") && digits.length === 12) {
    return `+91${digits.slice(-10)}`;
  }
  return "";
};

const formatPhone = (s) => s.replace(/\D/g, "").slice(0, 15);

export default function Dialer() {
  const navigate = useNavigate();
  const me = normalizePhone(auth.currentUser?.phoneNumber || "");
  usePresenceHeartbeat(me);
  useIncomingCalls();

  const onLogout = async () => {
    await signOut(auth);
    navigate("/", { replace: true });
  };

  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "history"),
      where("owner", "==", me),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      setHistory(rows);
    });
    return () => unsub();
  }, [me]);

  const dial = async () => {
    const rawInput = input.trim();
    const num = normalizePhone(rawInput);

    if (!num) {
      alert("Enter a valid 10-digit Indian number");
      return;
    }

    // Validate: exactly 10 digits or full +91XXXXXXXXXX
    // const digits = rawInput.replace(/\D/g, "");
    // if (digits.length !== 10) {
    //   alert("Enter exactly 10 digits");
    //   return;
    // }

    // const num = ensureIndiaFormat(rawInput);

    // Check presence only now
    const onlineNow = await isOnline(num);

    if (!onlineNow) {
      await addDoc(collection(db, "history"), {
        owner: me,
        peer: num,
        type: "missed",
        reason: "receiver_offline",
        createdAt: new Date(),
      });
      alert("Receiver is offline. Try again later.");
      return;
    }

    // Normal outgoing call
    await addDoc(collection(db, "history"), {
      owner: me,
      peer: num,
      type: "outgoing",
      createdAt: new Date(),
    });
    navigate(`/call/new?to=${encodeURIComponent(num)}`);
  };

  const debugPresence = async () => {
    const num = normalizePhone(input);
    const snap = await getDoc(doc(db, "presence", num));
    console.log("Presence for", num, snap.data());
    alert(`Presence: ${JSON.stringify(snap.data())}`);
  };

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Dialer</h2>
        <button onClick={onLogout}>Logout</button>
      </div>
      <div className="history">
        <h3>History</h3>
        <ul>
          {history.map((h) => (
            <li key={h.id}>
              <span>
                {h.type === "outgoing"
                  ? "→"
                  : h.type === "incoming"
                  ? "←"
                  : "×"}{" "}
                {h.peer}
              </span>
              <span>
                {new Date(
                  h.createdAt?.toDate?.() ?? h.createdAt
                ).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="keypad">
        <div className="phone-input">
          <span>+91</span>
          <input
            value={input.slice(3)}
            onChange={(e) =>
              setInput(`+91${e.target.value.replace(/\D/g, "").slice(0, 10)}`)
            }
            placeholder="XXXXXXXXXX"
            maxLength={10}
          />
        </div>
        <div className="grid">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
            (d) => (
              <button
                key={d}
                onClick={() => setInput((v) => formatPhone(v + d))}
              >
                {d}
              </button>
            )
          )}
        </div>
        <div className="actions">
          <button className="call" onClick={dial} disabled={!input.trim()}>
            Call
          </button>
          <button onClick={debugPresence}>Debug Presence</button>
          <button className="clear" onClick={() => setInput("")}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
