import { useState } from "react";

const ROLES = [
  { value: "scorekeeper", label: "Scorekeeper", desc: "Updates live match scores" },
  { value: "fixture_manager", label: "Fixture Manager", desc: "Manages match schedule & events" },
  { value: "tournament_manager", label: "Tournament Manager", desc: "Manages registrations & tournaments" },
];

export default function StaffInviteSystem({ staffUsers, token, onMessage, onRefresh }) {
  const [form, setForm] = useState({ name: "", email: "", role: "scorekeeper" });
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  async function sendInvite(e) {
    e.preventDefault();
    setBusy(true);
    setInviteLink("");
    try {
      const res = await fetch("/api/admin/staff-invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onMessage(result.message);
      setInviteLink(result.inviteLink || "");
      setForm({ name: "", email: "", role: "scorekeeper" });
      onRefresh?.();
    } catch (err) {
      onMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeStaff(id) {
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onMessage(result.message);
      onRefresh?.();
    } catch (err) {
      onMessage(err.message);
    }
  }

  const roleColors = {
    super_admin: "text-cyan",
    tournament_manager: "text-lime",
    fixture_manager: "text-yellow-400",
    scorekeeper: "text-purple-400",
  };

  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <h3 className="font-display text-3xl font-bold uppercase mb-5">Staff Management</h3>

      {/* Current Staff */}
      <div className="mb-6 space-y-2">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Current Staff</p>
        {(staffUsers || []).map(staff => (
          <div key={staff.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-ink p-3">
            <div>
              <p className="font-bold text-sm">{staff.name}</p>
              <p className="text-xs text-slate-500">{staff.email} · <span className={`font-bold ${roleColors[staff.role] || "text-slate-400"}`}>{staff.role?.replaceAll("_", " ")}</span></p>
            </div>
            <div className="flex items-center gap-3">
              {staff.lastLoginAt && <span className="text-[10px] text-slate-600">Last login {new Date(staff.lastLoginAt).toLocaleDateString()}</span>}
              {staff.role !== "super_admin" && (
                <button onClick={() => removeStaff(staff.id)} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite New Staff */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Invite New Staff Member</p>
        <form onSubmit={sendInvite} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Full name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
            />
            <input
              required
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map(role => (
              <button
                key={role.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, role: role.value }))}
                className={`rounded-lg border p-3 text-left transition ${form.role === role.value ? "border-cyan bg-cyan/10 text-cyan" : "border-white/10 bg-ink text-slate-400 hover:border-white/30"}`}
              >
                <p className="text-xs font-black uppercase tracking-wider">{role.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{role.desc}</p>
              </button>
            ))}
          </div>
          <button
            disabled={busy}
            type="submit"
            className="rounded-lg bg-cyan px-5 py-3 text-sm font-black uppercase tracking-wider text-ink transition hover:bg-white disabled:opacity-50"
          >
            {busy ? "Sending invite..." : "Send invite email ↗"}
          </button>
        </form>

        {inviteLink && (
          <div className="mt-4 rounded-lg border border-lime/30 bg-lime/5 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-lime mb-2">Invite link (share manually if email failed):</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-slate-300 break-all">{inviteLink}</code>
              <button
                onClick={() => navigator.clipboard.writeText(inviteLink).then(() => onMessage("Link copied!"))}
                className="shrink-0 rounded-md border border-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
