export default function AdminLogin({ email, setEmail, password, setPassword, busy, onSubmit, onClose }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-white/15 bg-navy p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Staff access</p>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase">Staff workspace</h2>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-500 hover:text-white">×</button>
        </div>
        <form onSubmit={onSubmit} className="mt-7 grid gap-3">
          <input autoFocus type="email" required placeholder="Staff email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
          <input type="password" required placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
          <button disabled={busy} className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? "Signing in..." : "Open dashboard ↗"}</button>
        </form>
      </div>
    </div>
  );
}