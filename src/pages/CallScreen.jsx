import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { auth, db, collection, addDoc, doc, onSnapshot } from "../firebase";
import {
  createPeer,
  registerPeerConnectionListeners,
  startCaller,
  startReceiver,
  endCall,
} from "../webrtc";

export default function CallScreen() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const search = new URLSearchParams(location.search);
  const toNumber = search.get("to");
  const callIdFromRoute = params.callId !== "new" ? params.callId : null;

  const [status, setStatus] = useState("initializing");
  const [callee, setCallee] = useState(toNumber || "");
  const [callId, setCallId] = useState(callIdFromRoute || "");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);

  const statusLabel = (s) => {
    switch (s) {
      case "ringing":
        return "Ringing";
      case "connecting":
        return "Connecting";
      case "connected":
        return "Connected";
      case "ended":
        return "Ended";
      case "failed":
        return "Failed";
      default:
        return s || "Initializing";
    }
  };
  const [connectedAt, setConnectedAt] = useState(null);
  const [elapsed, setElapsed] = useState("00:00");

  const pcRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    const pc = createPeer();
    pcRef.current = pc;
    registerPeerConnectionListeners(pc, (cs) => setStatus(cs));
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams;
    };
    return () => {
      pc.getSenders?.().forEach((s) => s.track?.stop());
      pc.close?.();
      pcRef.current = null;
    };
  }, []);

  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;
    const onChange = () => {
      if (pc.connectionState === "connected" && !connectedAt) {
        setStatus("connected");
        setConnectedAt(Date.now());
      }
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setStatus((prev) => (prev === "ended" ? prev : "failed"));
      }
    };
    pc.addEventListener?.("connectionstatechange", onChange);
    return () => pc.removeEventListener?.("connectionstatechange", onChange);
  }, [connectedAt]);

  useEffect(() => {
    const run = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      localStreamRef.current = stream;
      if (localAudioRef.current) localAudioRef.current.srcObject = stream;
      if (callIdFromRoute) {
        setStatus("answering");
        await startReceiver({
          pc: pcRef.current,
          localStream: stream,
          callId: callIdFromRoute,
        });
      } else {
        setStatus("ringing");

        let ringTimeout;
        ringTimeout = setTimeout(async () => {
          if (status === "ringing" || status === "connecting") {
            await endCall(callId || callIdFromRoute);
            setStatus("ended");
            await addDoc(collection(db, "history"), {
              owner: auth.currentUser?.phoneNumber,
              peer: callee,
              type: "missed",
              reason: "no_answer",
              createdAt: new Date(),
            });
            navigate("/dial", { replace: true });
          }
        }, 30000);

        const { callId: id } = await startCaller({
          pc: pcRef.current,
          localStream: stream,
          calleeNumber: callee,
          currentUserNumber: auth.currentUser?.phoneNumber,
        });
        setCallId(id);
      }
      //   const id = callIdFromRoute || callId;
      if (id)
        onSnapshot(doc(db, "calls", id), (snap) => {
          const data = snap.data();
          if (data?.status) setStatus(data.status);
        });
    };
    run().catch(() => setStatus("failed"));
  }, [callIdFromRoute, callee]);

  useEffect(() => {
    if (!connectedAt) return;
    const id = setInterval(() => {
      const sec = Math.floor((Date.now() - connectedAt) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      setElapsed(`${mm}:${ss}`);
    }, 1000);
    return () => clearInterval(id);
  }, [connectedAt]);

  const toggleMute = () => {
    (localStreamRef.current?.getAudioTracks?.() || []).forEach(
      (t) => (t.enabled = !t.enabled)
    );
    setMuted((m) => !m);
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = speaker ? 1.0 : 1.5;
      setSpeaker((s) => !s);
    }
  };

  const hangup = async () => {
    await endCall(callId || callIdFromRoute);
    setStatus("ended");
    pcRef.current?.getSenders?.().forEach((s) => s.track?.stop());
    pcRef.current?.close?.();
    navigate("/dial", { replace: true });
  };

  return (
    <div className="page">
      <h2>Calling</h2>
      <div className="call-info">
        <div className="number">{callee || "Unknown"}</div>
        <div className="status">
          {" "}
          {statusLabel(status)}
          {status === "connected" ? ` - ${elapsed}` : ""}{" "}
        </div>
      </div>
      <div className="controls">
        <button onClick={toggleSpeaker}>
          {speaker ? "Speaker On" : "Speaker Off"}
        </button>
        <button onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
        <button className="end" onClick={hangup}>
          End Call
        </button>
      </div>
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />
    </div>
  );
}
