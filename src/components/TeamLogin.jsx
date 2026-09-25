import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseConfigured, firestore } from "../firebase";

export default function TeamLogin({ onClose, onMessage, onLogin }) {
  const [mode, setMode] = useState("login"); // "login", "register", "forgot", "otp"
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", otp: "", newPassword: "" });

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (firebaseConfigured) {
        await sendPasswordResetEmail(firebaseAuth, form.email);
        onMessage("Password reset email sent! Check your inbox.");
        setMode("login");
      } else {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onMessage("OTP sent! Check your email/phone.");
        setMode("otp");
      }
    } catch (err) {
      onMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp: form.otp, newPassword: form.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onMessage("Password reset successfully! You can now log in.");
      setMode("login");
      update("password", form.newPassword);
    } catch (err) {
      onMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event) {
    event.preventDefault(); setBusy(true);
    try {
      if (firebaseConfigured) {
        let credential;
        if (mode === "login") {
          credential = await signInWithEmailAndPassword(firebaseAuth, form.email, form.password);
        } else {
          credential = await createUserWithEmailAndPassword(firebaseAuth, form.email, form.password);
          await updateProfile(credential.user, { displayName: form.name });
          await setDoc(doc(firestore, "teams", credential.user.uid), { teamName: form.name, captainName: form.name, email: form.email.toLowerCase(), status: "pending", members: [{ name: form.name, email: form.email.toLowerCase(), role: "Captain" }], createdAt: serverTimestamp(), loginCount: 0 });
        }
        const teamSnapshot = await getDoc(doc(firestore, "teams", credential.user.uid));
        const team = teamSnapshot.exists() ? { id: credential.user.uid, ...teamSnapshot.data() } : { id: credential.user.uid, teamName: credential.user.displayName || form.name, captainName: credential.user.displayName || form.name, email: credential.user.email, status: "pending", members: [] };
        localStorage.setItem("aagaz-team-token", await credential.user.getIdToken()); onMessage(mode === "login" ? "Logged in successfully." : "Account created. Log in to continue."); onLogin(team); return;
      }
      const endpoint = mode === "login" ? "/api/teams/login" : "/api/teams/register";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      if (result.token) localStorage.setItem("aagaz-team-token", result.token);
      onMessage(result.message || `Welcome, ${result.team.teamName}.`); onLogin(result.team);
    } catch (error) { onMessage(error.message); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-navy p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Participant portal</p>
            <h2 className="mt-2 font-display text-5xl font-bold uppercase">{mode === "login" ? "Log in." : mode === "register" ? "Sign in." : mode === "forgot" ? "Reset" : "Enter OTP"}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{mode === "login" ? "Log in to manage your team and follow fixtures." : mode === "register" ? "Sign in with your name, email, and password." : "Recover your password securely."}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-500 hover:text-white">×</button>
        </div>

        {(mode === "login" || mode === "register") && (
          <div className="mt-7 flex rounded-lg border border-white/10 p-1">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 rounded px-3 py-2 text-xs font-black uppercase tracking-widest ${mode === "login" ? "bg-cyan text-ink" : "text-slate-500"}`}>Log in</button>
            <button type="button" onClick={() => setMode("register")} className={`flex-1 rounded px-3 py-2 text-xs font-black uppercase tracking-widest ${mode === "register" ? "bg-cyan text-ink" : "text-slate-500"}`}>Sign in</button>
          </div>
        )}

        {(mode === "login" || mode === "register") && (
          <form onSubmit={submit} className="mt-5 grid gap-3">
            {mode === "register" && <input required placeholder="Name" value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />}
            <input required type="email" placeholder="Email" value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <input required minLength={8} type="password" placeholder="Password" value={form.password} onChange={(event) => update("password", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <button disabled={busy} className="mt-2 rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Please wait..." : mode === "login" ? "Log in ↗" : "Sign in ↗"}</button>
            {mode === "login" && <button type="button" onClick={() => setMode("forgot")} className="text-xs text-slate-400 hover:text-white text-center mt-2">Forgot password?</button>}
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="mt-7 grid gap-3">
            <input autoFocus type="email" required placeholder="Account email" value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <button disabled={busy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Sending..." : "Send Reset Link / OTP ↗"}</button>
            <button type="button" onClick={() => setMode("login")} className="text-xs text-slate-400 hover:text-white text-center mt-2">← Back to login</button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={handleResetPassword} className="mt-7 grid gap-3">
            <input autoFocus type="text" required placeholder="6-digit OTP" value={form.otp} onChange={(event) => update("otp", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm tracking-widest text-center outline-none placeholder:text-slate-600 focus:border-cyan" maxLength={6} />
            <input type="password" required placeholder="New Password" value={form.newPassword} onChange={(event) => update("newPassword", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" minLength={6} />
            <button disabled={busy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Resetting..." : "Set New Password ↗"}</button>
            <button type="button" onClick={() => setMode("forgot")} className="text-xs text-slate-400 hover:text-white text-center mt-2">← Back</button>
          </form>
        )}
      </div>
    </div>
  );
}