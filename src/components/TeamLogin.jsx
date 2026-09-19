import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth, firebaseConfigured, firestore } from "../firebase";

export default function TeamLogin({ onClose, onMessage, onLogin }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

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

  return <div className="fixed inset-0 z-40 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-xl border border-white/15 bg-navy p-6 shadow-2xl"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-widest text-cyan">Participant portal</p><h2 className="mt-2 font-display text-5xl font-bold uppercase">{mode === "login" ? "Log in." : "Sign in."}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{mode === "login" ? "Log in to manage your team and follow fixtures." : "Sign in with your name, email, and password."}</p></div><button onClick={onClose} className="text-2xl text-slate-500 hover:text-white">×</button></div><div className="mt-7 flex rounded-lg border border-white/10 p-1"><button onClick={() => setMode("login")} className={`flex-1 rounded px-3 py-2 text-xs font-black uppercase tracking-widest ${mode === "login" ? "bg-cyan text-ink" : "text-slate-500"}`}>Log in</button><button onClick={() => setMode("register")} className={`flex-1 rounded px-3 py-2 text-xs font-black uppercase tracking-widest ${mode === "register" ? "bg-cyan text-ink" : "text-slate-500"}`}>Sign in</button></div><form onSubmit={submit} className="mt-5 grid gap-3">{mode === "register" && <input required placeholder="Name" value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />}<input required type="email" placeholder="Email" value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" /><input required minLength={8} type="password" placeholder="Password" value={form.password} onChange={(event) => update("password", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" /><button disabled={busy} className="mt-2 rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Please wait..." : mode === "login" ? "Log in ↗" : "Sign in ↗"}</button></form></div></div>;
}