import React, { useState } from "react";
import { startPhoneSignIn } from "../firebase";
export default function Login() {
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const sendCode = async () => {
    try {
      setError("");
      const res = await startPhoneSignIn(phone);
      setConfirm(res);
    } catch (e) {
      setError(e.message || "Failed to send OTP");
    }
  };
  const verify = async () => {
    try {
      setError("");
      await confirm.confirm(code);
    } catch (e) {
      setError(e.message || "Verification failed");
    }
  };
  return (
    <div className="page">
      <h2>Login</h2>
      {!confirm ? (
        <>
          <div className="phone-input">
            <span>+91</span>
            <input
              value={phone.slice(3)} // show only digits after +91
              onChange={(e) =>
                setPhone(`+91${e.target.value.replace(/\D/g, "")}`)
              }
              placeholder="XXXXXXXXXX"
              maxLength="10"
            />
          </div>
          <button onClick={sendCode}>Send OTP</button>
        </>
      ) : (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter OTP"
          />
          <button onClick={verify}>Verify</button>
        </>
      )}
      {error && <p className="error">{error}</p>}
      <div id="recaptcha-container" />
    </div>
  );
}
