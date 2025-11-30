import { db, collection, doc, setDoc, onSnapshot, updateDoc, getDoc, addDoc, serverTimestamp } from "./firebase";

export function createPeer() {
    const pc = new RTCPeerConnection(iceConfig);
    // NO addTrack / addTransceiver here
    return pc;
}

export const registerPeerConnectionListeners = (pc, onConnectionState) => {
    pc.onconnectionstatechange = () => onConnectionState?.(pc.connectionState);
};

export const startCaller = async ({ pc, localStream, calleeNumber, currentUserNumber }) => {
    // localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });
    const callDoc = doc(collection(db, "calls"));
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");
    pc.onicecandidate = async e => { if (e.candidate) await addDoc(offerCandidates, e.candidate.toJSON()); };
    // const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await setDoc(callDoc, {
        from: currentUserNumber, to: calleeNumber,
        offer: { sdp: offer.sdp, type: offer.type },
        status: "ringing", createdAt: serverTimestamp()
    });
    const unsubCall = onSnapshot(callDoc, async snap => {
        const data = snap.data(); if (!data) return;
        if (data.answer && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    });
    onSnapshot(answerCandidates, snap => {
        snap.docChanges().forEach(async change => {
            if (change.type === "added") {
                try { await pc.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch { }
            }
        });
    });
    return { callId: callDoc.id, unsubCall };
};

export const startReceiver = async ({ pc, localStream, callId }) => {
    // localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });

    const callDoc = doc(db, "calls", callId);
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");
    pc.onicecandidate = async e => { if (e.candidate) await addDoc(answerCandidates, e.candidate.toJSON()); };
    const callSnap = await getDoc(callDoc);
    const data = callSnap.data(); if (!data?.offer) throw new Error("No offer found");
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await updateDoc(callDoc, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: "connecting", answeredAt: serverTimestamp()
    });
    onSnapshot(offerCandidates, snap => {
        snap.docChanges().forEach(async change => {
            if (change.type === "added") {
                try { await pc.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch { }
            }
        });
    });
    return { callDoc };
};

export const endCall = async (callId) => {
    if (!callId) return;
    const callDoc = doc(db, "calls", callId);
    const snap = await getDoc(callDoc);
    if (snap.exists()) await updateDoc(callDoc, { status: "ended", endedAt: serverTimestamp() });
};