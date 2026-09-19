import { useEffect, useState } from "react";
import AdminLogin from "./AdminLogin";
import FixtureManager from "./FixtureManager";

export default function AdminDashboard({ token, onToken, onClose, onMessage }) {
  const [password, setPassword] = useState("");
  const [adminData, setAdminData] = useState(null);
  const [events, setEvents] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (token) loadAdminData(token); }, [token]);

  async function loadAdminData(currentToken) {
    const response = await fetch("/api/admin/data", { headers: { Authorization: `Bearer ${currentToken}` } });
    if (!response.ok) { localStorage.removeItem("aagaz-admin-token"); onToken(""); return; }
    const result = await response.json();
    setAdminData(result); setEvents(result.events); setLiveMatches(result.liveMatches); setTournaments(result.tournaments);
  }

  async function login(event) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      localStorage.setItem("aagaz-admin-token", result.token); onToken(result.token);
    } catch (error) { onMessage(error.message); } finally { setBusy(false); }
  }

  async function save(path, payload, label) {
    setBusy(true);
    try {
      const response = await fetch(path, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      onMessage(result.message || label); await loadAdminData(token);
    } catch (error) { onMessage(error.message); } finally { setBusy(false); }
  }

  function updateMatch(id, key, value) {
    setLiveMatches((items) => items.map((item) => item.id === id ? { ...item, [key]: key.includes("Score") ? Number(value) : value } : item));
  }

  if (!token || !adminData) return <AdminLogin password={password} setPassword={setPassword} busy={busy} onSubmit={login} onClose={onClose} />;

  return <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/95 p-4 backdrop-blur-sm sm:p-8"><div className="mx-auto max-w-6xl">
    <div className="flex items-start justify-between border-b border-white/10 pb-6"><div><p className="text-xs font-black uppercase tracking-widest text-cyan">Private workspace</p><h2 className="mt-2 font-display text-5xl font-bold uppercase">Admin dashboard.</h2><p className="mt-2 text-sm text-slate-500">Manage the competition data shown to players and viewers.</p></div><button onClick={onClose} className="text-3xl text-slate-500 hover:text-white">×</button></div>
    <FixtureManager events={events} setEvents={setEvents} tournaments={tournaments} onSave={save} busy={busy} />
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-xl border border-white/10 bg-navy p-5"><div className="flex items-center justify-between"><h3 className="font-display text-3xl font-bold uppercase">Live scoreboard</h3><button disabled={busy} onClick={() => save("/api/admin/live-matches", liveMatches, "Live scores saved.")} className="rounded-md bg-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-ink">Save scores</button></div><div className="mt-5 space-y-3">{liveMatches.map((match) => <div key={match.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4"><div className="grid gap-2 sm:grid-cols-2"><input value={match.home} onChange={(event) => updateMatch(match.id, "home", event.target.value)} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Home team" /><input value={match.away} onChange={(event) => updateMatch(match.id, "away", event.target.value)} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Away team" /></div><div className="flex gap-2"><input type="number" value={match.homeScore} onChange={(event) => updateMatch(match.id, "homeScore", event.target.value)} className="w-20 rounded border border-white/10 bg-navy p-2 text-center outline-none" /><input type="number" value={match.awayScore} onChange={(event) => updateMatch(match.id, "awayScore", event.target.value)} className="w-20 rounded border border-white/10 bg-navy p-2 text-center outline-none" /></div><input value={match.streamUrl || ""} onChange={(event) => updateMatch(match.id, "streamUrl", event.target.value)} placeholder="YouTube or stream URL" className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" /></div>)}</div></section><RegistrationQueue tournaments={tournaments} save={save} /></div>
    <TournamentPublisher tournaments={tournaments} setTournaments={setTournaments} onSave={save} busy={busy} />
  </div></div>;
}

function RegistrationQueue({ tournaments, save }) { const entries = tournaments.flatMap((tournament) => (tournament.registrations || []).map((entry) => ({ ...entry, tournament: tournament.title }))); return <section className="rounded-xl border border-white/10 bg-navy p-5"><h3 className="font-display text-3xl font-bold uppercase">Tournament entries</h3><div className="mt-5 space-y-3">{entries.map((entry) => <div key={entry.id} className="rounded-lg border border-white/10 bg-ink p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{entry.name}</p><p className="text-xs text-slate-500">{entry.teamName || entry.entryType} · {entry.tournament}</p></div><span className="text-xs uppercase tracking-widest text-cyan">{entry.status}</span></div>{entry.status === "pending" && <div className="mt-3 flex gap-2"><button onClick={() => save("/api/admin/tournament-entry-status", { id: entry.id, status: "approved" }, "Entry approved.")} className="rounded bg-lime px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ink">Approve</button><button onClick={() => save("/api/admin/tournament-entry-status", { id: entry.id, status: "declined" }, "Entry declined.")} className="rounded border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Decline</button></div>}</div>)}</div>{!entries.length && <p className="mt-5 text-sm text-slate-500">No registrations yet.</p>}</section>; }

function TournamentPublisher({ tournaments, setTournaments, onSave, busy }) { function add() { setTournaments((items) => [...items, { id: `tournament-${Date.now()}`, title: "New Aagaz Tournament", sport: "Cricket", format: "Open entry", dates: "", deadline: "", venue: "LPU Campus", entryFee: "TBA", capacity: 16, description: "", registrations: [] }]); } return <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5"><div className="flex items-center justify-between"><h3 className="font-display text-3xl font-bold uppercase">Published tournaments</h3><button onClick={add} className="rounded-md border border-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan">Add tournament +</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{tournaments.map((tournament) => <div key={tournament.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4"><input value={tournament.title} onChange={(event) => setTournaments((items) => items.map((item) => item.id === tournament.id ? { ...item, title: event.target.value } : item))} className="bg-transparent font-display text-2xl uppercase outline-none" /><div className="grid grid-cols-2 gap-2"><input value={tournament.sport} onChange={(event) => setTournaments((items) => items.map((item) => item.id === tournament.id ? { ...item, sport: event.target.value } : item))} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Sport" /><input value={tournament.entryFee} onChange={(event) => setTournaments((items) => items.map((item) => item.id === tournament.id ? { ...item, entryFee: event.target.value } : item))} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Entry fee" /></div></div>)}</div><button disabled={busy} onClick={() => onSave("/api/admin/tournaments", tournaments, "Tournaments published.")} className="mt-5 rounded-lg bg-cyan px-5 py-3 text-xs font-black uppercase tracking-widest text-ink">Publish tournament catalogue ↗</button></section>; }