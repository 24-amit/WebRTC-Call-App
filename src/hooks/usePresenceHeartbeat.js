import { useEffect } from "react";
import { setPresence } from "../presence";
export default function usePresenceHeartbeat(phone) {
    useEffect(() => {
        if (!phone) return;
        let active = true;
        const ping = async () => { if (!active) return; await setPresence(phone); };
        ping();
        const id = setInterval(ping, 25000);
        return () => { active = false; clearInterval(id); };
    }, [phone]);
}