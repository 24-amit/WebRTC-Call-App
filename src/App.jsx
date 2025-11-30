import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { auth, onAuthStateChanged } from "./firebase";
import Login from "./pages/Login";
import Dialer from "./pages/Dialer";
import CallScreen from "./pages/CallScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  if (loading) return null;

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/dial" replace /> : <Login />}
      />
      <Route
        path="/dial"
        element={user ? <Dialer /> : <Navigate to="/" replace />}
      />
      <Route
        path="/call/:callId"
        element={user ? <CallScreen /> : <Navigate to="/" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
