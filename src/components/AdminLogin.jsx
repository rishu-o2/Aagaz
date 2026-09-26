import { useState } from "react";

export default function AdminLogin({ email, setEmail, password, setPassword, universityRegistrationNumber, setUniversityRegistrationNumber, busy, onSubmit, onClose, onMessage }) {
  const [mode, setMode] = useState("login"); // "login", "forgot", "otp"
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [localBusy, setLocalBusy] = useState(false);

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLocalBusy(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onMessage("OTP sent! Check your email/phone.");
      setMode("otp");
    } catch (err) {
      onMessage(err.message);
    } finally {
      setLocalBusy(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setLocalBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onMessage("Password reset successfully! You can now log in.");
      setMode("login");
      setPassword(newPassword);
      setOtp("");
    } catch (err) {
      onMessage(err.message);
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-white/15 bg-navy p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Staff access</p>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase">
              {mode === "login" ? "Staff workspace" : mode === "forgot" ? "Reset Password" : "Enter OTP"}
            </h2>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-500 hover:text-white">×</button>
        </div>

        {mode === "login" && (
          <form onSubmit={onSubmit} className="mt-7 grid gap-3">
            <input autoFocus type="email" required placeholder="Staff email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <input type="password" required placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <input required placeholder="University registration number" value={universityRegistrationNumber} onChange={(event) => setUniversityRegistrationNumber(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <button disabled={busy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Signing in..." : "Open dashboard ↗"}</button>
            <button type="button" onClick={() => setMode("forgot")} className="text-xs text-slate-400 hover:text-white text-center mt-2">Forgot password?</button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="mt-7 grid gap-3">
            <p className="text-xs text-slate-400 mb-2">Enter your staff email. We will send a 6-digit OTP to verify your identity.</p>
            <input autoFocus type="email" required placeholder="Staff email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <button disabled={localBusy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{localBusy ? "Sending..." : "Send OTP ↗"}</button>
            <button type="button" onClick={() => setMode("login")} className="text-xs text-slate-400 hover:text-white text-center mt-2">← Back to login</button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={handleResetPassword} className="mt-7 grid gap-3">
            <p className="text-xs text-slate-400 mb-2">Enter the 6-digit OTP sent to {email} and your new password.</p>
            <input autoFocus type="text" required placeholder="6-digit OTP" value={otp} onChange={(event) => setOtp(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm tracking-widest text-center outline-none placeholder:text-slate-600 focus:border-cyan" maxLength={6} />
            <input type="password" required placeholder="New Password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" minLength={6} />
            <button disabled={localBusy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{localBusy ? "Resetting..." : "Set New Password ↗"}</button>
            <button type="button" onClick={() => setMode("forgot")} className="text-xs text-slate-400 hover:text-white text-center mt-2">← Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
