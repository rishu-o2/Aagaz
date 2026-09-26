import { useRef, useState } from "react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, RecaptchaVerifier, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPhoneNumber, signInWithPopup, updateProfile } from "firebase/auth";
import { firebaseAuth, firebaseConfigured } from "../firebase";

export default function TeamLogin({ onClose, onMessage, onLogin }) {
  const [provider, setProvider] = useState("email");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [resetMode, setResetMode] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [form, setForm] = useState({ name: "", universityRegistrationNumber: "", email: "", password: "", phone: "", otp: "" });
  const recaptcha = useRef(null);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function finishLogin(user) {
    const idToken = await user.getIdToken();
    const response = await fetch("/api/participants/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No tournament registration matches this account.");
    localStorage.setItem("aagaz-participant-token", idToken);
    localStorage.setItem("aagaz-participant-registration", result.universityRegistrationNumber || "");
    localStorage.setItem("aagaz-participant-profile", JSON.stringify(result));
    onMessage(`Welcome, ${result.name}.`);
    onLogin(result);
  }

  async function createParticipantAccount(user) {
    await updateProfile(user, { displayName: form.name.trim() });
    const idToken = await user.getIdToken(true);
    const response = await fetch("/api/participants/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, name: form.name.trim(), universityRegistrationNumber: form.universityRegistrationNumber.trim() }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not create the participant account.");
    await finishLogin(user);
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      if (!firebaseConfigured) throw new Error("Participant sign-in requires Firebase Authentication to be configured.");
      if (provider === "email") {
        const credential = registerMode
          ? await createUserWithEmailAndPassword(firebaseAuth, form.email, form.password)
          : await signInWithEmailAndPassword(firebaseAuth, form.email, form.password);
        if (registerMode) await createParticipantAccount(credential.user);
        else await finishLogin(credential.user);
      } else if (provider === "google") {
        const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
        if (registerMode) await createParticipantAccount(credential.user);
        else await finishLogin(credential.user);
      } else if (!confirmation) {
        recaptcha.current ||= new RecaptchaVerifier(firebaseAuth, "participant-phone-recaptcha", { size: "invisible" });
        setConfirmation(await signInWithPhoneNumber(firebaseAuth, form.phone, recaptcha.current));
        onMessage("Verification code sent by SMS.");
      } else {
        const credential = await confirmation.confirm(form.otp);
        if (registerMode) await createParticipantAccount(credential.user);
        else await finishLogin(credential.user);
        setConfirmation(null);
        recaptcha.current?.clear();
        recaptcha.current = null;
      }
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, form.email);
      onMessage("Password reset email sent. Check your inbox.");
      setResetMode(false);
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function chooseProvider(value) {
    setProvider(value);
    setConfirmation(null);
    recaptcha.current?.clear();
    recaptcha.current = null;
    update("otp", "");
    setResetMode(false);
    setRegisterMode(false);
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/15 bg-navy p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Participant portal</p>
            <h2 className="mt-2 font-display text-5xl font-bold uppercase">{resetMode ? "Reset." : registerMode ? "Create account." : "Log in."}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{registerMode ? "Create your participant account. Your university registration number is saved once during sign-up." : "Sign in to see your tournament registrations and any team the club assigns to you."}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-500 hover:text-white">×</button>
        </div>

        {resetMode ? (
          <form onSubmit={resetPassword} className="mt-7 grid gap-3">
            <input autoFocus required type="email" placeholder="Account email" value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <button disabled={busy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Sending..." : "Send reset email"}</button>
            <button type="button" onClick={() => setResetMode(false)} className="text-xs text-slate-400 hover:text-white">Back to login</button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-7 grid gap-3">
            {registerMode && <>
              <input required autoComplete="name" placeholder="Full name" value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
              <input required placeholder="University registration number" value={form.universityRegistrationNumber} onChange={(event) => update("universityRegistrationNumber", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            </>}
            {provider === "email" && <>
              <input required type="email" autoComplete="email" placeholder="Email" value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
              <input required type="password" placeholder="Password" value={form.password} onChange={(event) => update("password", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            </>}
            {provider === "phone" && <>
              <input required type="tel" placeholder="Registered phone with country code" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
              {confirmation && <input required inputMode="numeric" placeholder="SMS verification code" value={form.otp} onChange={(event) => update("otp", event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />}
            </>}
            <div id="participant-phone-recaptcha" />
            <button disabled={busy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Please wait..." : provider === "phone" ? confirmation ? registerMode ? "Verify phone and create account" : "Verify phone and continue" : "Send verification code" : provider === "google" ? registerMode ? "Sign up with Google" : "Continue with Google" : registerMode ? "Create account" : "Log in"}</button>
            <div className="grid grid-cols-3 gap-2">
              {[["email", "Email"], ["google", "Google"], ["phone", "Phone OTP"]].map(([value, label]) => <button key={value} type="button" onClick={() => chooseProvider(value)} className={`rounded border px-2 py-2 text-xs font-bold ${provider === value ? "border-cyan text-cyan" : "border-white/10 text-slate-500"}`}>{label}</button>)}
            </div>
            {provider === "email" && !registerMode && <button type="button" onClick={() => setResetMode(true)} className="text-xs text-slate-400 hover:text-white">Forgot password?</button>}
            <button type="button" onClick={() => { setRegisterMode((value) => !value); setResetMode(false); setConfirmation(null); }} className="text-xs text-cyan hover:text-white">{registerMode ? "Already have an account? Log in" : "New participant? Create an account"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
