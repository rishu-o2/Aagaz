import { useEffect, useState } from "react";
import AdminLogin from "./AdminLogin";
import FixtureManager from "./FixtureManager";
import AnalyticsCharts from "./AnalyticsCharts";
import AnnouncementManager from "./AnnouncementManager";
import ImageGalleryManager from "./ImageGalleryManager";
import StaffInviteSystem from "./StaffInviteSystem";

export default function AdminDashboard({ token, onToken, onClose, onMessage, onAuthenticated, onLogout }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminData, setAdminData] = useState(null);
  const [events, setEvents] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [members, setMembers] = useState([]);
  const [announcement, setAnnouncement] = useState({ active: false, text: "", type: "info", link: "" });
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => { if (!token) return; loadAdminData(token); const interval = setInterval(() => loadAdminData(token), 30000); return () => clearInterval(interval); }, [token]);

  async function loadAdminData(currentToken) {
    const response = await fetch("/api/admin/data", { headers: { Authorization: `Bearer ${currentToken}` } });
    if (!response.ok) { localStorage.removeItem("aagaz-admin-token"); onToken(""); return; }
    const result = await response.json();
    setAdminData(result); setUser(result.user); setEvents(result.events); setLiveMatches(result.liveMatches); setTournaments(result.tournaments);
    setGallery(result.gallery || []); setMembers(result.members || []);
    setAnnouncement(result.announcement || { active: false, text: "", type: "info", link: "" });
  }

  async function login(event) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      localStorage.setItem("aagaz-admin-token", result.token); onToken(result.token); onAuthenticated?.();
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

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem("aagaz-admin-token"); onToken(""); onLogout?.();
  }

  function updateMatch(id, key, value) {
    setLiveMatches((items) => items.map((item) => item.id === id ? { ...item, [key]: key.includes("Score") ? Number(value) : value } : item));
  }

  function downloadCSV(url, filename) {
    const a = document.createElement("a");
    a.href = url + `?token=${token}`;
    // Pass token via Authorization header isn't possible for direct downloads, use query workaround
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { a.href = URL.createObjectURL(blob); a.download = filename; a.click(); });
  }

  function printFixtures() {
    const printable = events.map(e => `${e.date || "TBD"} | ${e.time || "TBA"} | ${e.title} | ${e.venue || ""} | ${e.status}`).join("\n");
    const w = window.open("", "_blank");
    w.document.write(`<pre style="font-family:monospace;padding:20px;"><h2>Aagaz Fixture Sheet</h2>\n${printable}</pre>`);
    w.document.close(); w.print();
  }

  if (!token || !adminData) return <AdminLogin email={email} setEmail={setEmail} password={password} setPassword={setPassword} busy={busy} onSubmit={login} onClose={onClose} />;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "scores", label: "Live Scores" },
    { id: "fixtures", label: "Fixtures" },
    { id: "tournaments", label: "Tournaments" },
    { id: "registrations", label: "Entries" },
    { id: "members", label: "Membership" },
    ...(user?.role === "super_admin" ? [
      { id: "gallery", label: "Gallery" },
      { id: "announcements", label: "Announcement" },
      { id: "staff", label: "Staff" },
      { id: "analytics", label: "Analytics" },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/95 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">{user?.role?.replaceAll("_", " ")}</p>
            <h2 className="mt-2 font-display text-5xl font-bold uppercase">{user?.name || "Staff dashboard"}.</h2>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "super_admin" && (
              <>
                <button onClick={() => downloadCSV("/api/admin/export/registrations", "registrations.csv")} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-lime hover:text-lime">
                  ↓ Entries CSV
                </button>
                <button onClick={() => downloadCSV("/api/admin/export/members", "members.csv")} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-lime hover:text-lime">
                  ↓ Members CSV
                </button>
              </>
            )}
            <button onClick={printFixtures} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-white hover:text-white">
              🖨 Print Fixtures
            </button>
            <button onClick={logout} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-cyan hover:text-cyan">Log out</button>
            <button onClick={onClose} className="text-3xl text-slate-500 hover:text-white">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-white/10 pb-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition border-b-2 ${activeTab === tab.id ? "border-cyan text-cyan" : "border-transparent text-slate-500 hover:text-white"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panels */}
        <div className="mt-6">
          {activeTab === "overview" && <AccessStats analytics={adminData.analytics} />}
          {activeTab === "scores" && (user?.role === "super_admin" || user?.role === "scorekeeper") && <Scoreboard liveMatches={liveMatches} updateMatch={updateMatch} save={save} busy={busy} />}
          {activeTab === "fixtures" && (user?.role === "super_admin" || user?.role === "fixture_manager") && <FixtureManager events={events} setEvents={setEvents} tournaments={tournaments} onSave={save} busy={busy} />}
          {activeTab === "tournaments" && (user?.role === "super_admin" || user?.role === "tournament_manager") && <TournamentPublisher tournaments={tournaments} setTournaments={setTournaments} onSave={save} busy={busy} onMessage={onMessage} />}
          {activeTab === "registrations" && (user?.role === "super_admin" || user?.role === "tournament_manager") && <RegistrationQueue tournaments={tournaments} save={save} />}
          {activeTab === "members" && user?.role === "super_admin" && <MembershipQueue members={members} save={save} />}
          {activeTab === "gallery" && user?.role === "super_admin" && <ImageGalleryManager gallery={gallery} setGallery={setGallery} onSave={save} busy={busy} token={token} />}
          {activeTab === "announcements" && user?.role === "super_admin" && <AnnouncementManager announcement={announcement} setAnnouncement={setAnnouncement} onSave={save} busy={busy} />}
          {activeTab === "staff" && user?.role === "super_admin" && <StaffInviteSystem staffUsers={adminData.staffUsers} token={token} onMessage={onMessage} onRefresh={() => loadAdminData(token)} />}
          {activeTab === "analytics" && user?.role === "super_admin" && <AnalyticsCharts tournaments={tournaments} members={members} analytics={adminData.analytics} />}
        </div>
      </div>
    </div>
  );
}

function AccessStats({ analytics }) { return <section className="grid gap-3 sm:grid-cols-5">{[[analytics.activeParticipants, "Participants online"], [analytics.totalParticipantAccounts, "Participant accounts"], [analytics.participantLogins, "Participant logins"], [analytics.staffLogins, "Staff logins"], [analytics.totalLogins, "Total login events"]].map(([value, label]) => <div key={label} className="rounded-xl border border-white/10 bg-navy p-4"><strong className="font-display text-4xl text-cyan">{value}</strong><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p></div>)}</section>; }

function Scoreboard({ liveMatches, updateMatch, save, busy }) { return <section className="rounded-xl border border-white/10 bg-navy p-5"><div className="flex items-center justify-between"><h3 className="font-display text-3xl font-bold uppercase">Live scoreboard</h3><button disabled={busy} onClick={() => save("/api/admin/live-matches", liveMatches, "Live scores saved.")} className="rounded-md bg-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-ink">Save scores</button></div><div className="mt-5 space-y-3">{liveMatches.map((match) => <div key={match.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4"><div className="flex items-center gap-2 mb-1"><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={match.isLive || false} onChange={e => updateMatch(match.id, "isLive", e.target.checked)} className="accent-lime" />Live</label><input value={match.period || ""} onChange={e => updateMatch(match.id, "period", e.target.value)} placeholder="Period / Quarter" className="flex-1 rounded border border-white/10 bg-navy p-2 text-xs outline-none" /></div><div className="grid gap-2 sm:grid-cols-2"><input value={match.home} onChange={(event) => updateMatch(match.id, "home", event.target.value)} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Home team" /><input value={match.away} onChange={(event) => updateMatch(match.id, "away", event.target.value)} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Away team" /></div><div className="flex gap-2"><input type="number" value={match.homeScore} onChange={(event) => updateMatch(match.id, "homeScore", event.target.value)} className="w-20 rounded border border-white/10 bg-navy p-2 text-center outline-none" /><input type="number" value={match.awayScore} onChange={(event) => updateMatch(match.id, "awayScore", event.target.value)} className="w-20 rounded border border-white/10 bg-navy p-2 text-center outline-none" /></div><input value={match.streamUrl || ""} onChange={(event) => updateMatch(match.id, "streamUrl", event.target.value)} placeholder="YouTube or stream URL" className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" /></div>)}{!liveMatches.length && <p className="mt-4 text-sm text-slate-500">No live matches. Add them from the tournament fixtures.</p>}</div></section>; }

function RegistrationQueue({ tournaments, save }) { const entries = tournaments.flatMap((tournament) => (tournament.registrations || []).map((entry) => ({ ...entry, tournament: tournament.title }))); return <section className="rounded-xl border border-white/10 bg-navy p-5"><h3 className="font-display text-3xl font-bold uppercase">Tournament entries</h3><div className="mt-5 space-y-3">{entries.map((entry) => <div key={entry.id} className="rounded-lg border border-white/10 bg-ink p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{entry.name}</p><p className="text-xs text-slate-500">{entry.teamName || entry.entryType} · {entry.tournament} · {entry.email}</p></div><span className="text-xs uppercase tracking-widest text-cyan">{entry.status}</span></div>{entry.status === "pending" && <div className="mt-3 flex gap-2"><button onClick={() => save("/api/admin/tournament-entry-status", { id: entry.id, status: "approved" }, "Entry approved.")} className="rounded bg-lime px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ink">Approve</button><button onClick={() => save("/api/admin/tournament-entry-status", { id: entry.id, status: "declined" }, "Entry declined.")} className="rounded border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Decline</button></div>}</div>)}</div>{!entries.length && <p className="mt-5 text-sm text-slate-500">No registrations yet.</p>}</section>; }

function MembershipQueue({ members, save }) { return <section className="rounded-xl border border-white/10 bg-navy p-5"><h3 className="font-display text-3xl font-bold uppercase">Club membership requests</h3><div className="mt-5 space-y-3">{members.map(member => <div key={member.id} className="rounded-lg border border-white/10 bg-ink p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{member.name}</p><p className="text-xs text-slate-500">{member.course} · {member.sport} · {member.email}</p></div><span className="text-xs uppercase tracking-widest text-cyan">{member.status}</span></div>{member.status === "pending" && <div className="mt-3 flex gap-2"><button onClick={() => save("/api/admin/member-status", { id: member.id, status: "approved" }, "Member approved.")} className="rounded bg-lime px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ink">Approve</button><button onClick={() => save("/api/admin/member-status", { id: member.id, status: "declined" }, "Member declined.")} className="rounded border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Decline</button></div>}</div>)}</div>{!members.length && <p className="mt-5 text-sm text-slate-500">No applications yet.</p>}</section>; }

function TournamentPublisher({ tournaments, setTournaments, onSave, busy, onMessage }) { function add() { setTournaments((items) => [...items, { id: `tournament-${Date.now()}`, title: "New Aagaz Tournament", sport: "Cricket", format: "Open entry", dates: "", deadline: "", venue: "LPU Campus", entryFee: "TBA", capacity: 16, description: "", registrations: [] }]); } async function generateFixtures(tournament) { try { const response = await fetch(`/api/admin/tournaments/${tournament.id}/generate-fixtures`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("aagaz-admin-token")}` } }); const result = await response.json(); if (!response.ok) throw new Error(result.error); onMessage(result.message); } catch (error) { onMessage(error.message); } } return <section className="rounded-xl border border-white/10 bg-navy p-5"><div className="flex items-center justify-between"><h3 className="font-display text-3xl font-bold uppercase">Published tournaments</h3><button onClick={add} className="rounded-md border border-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan">Add tournament +</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{tournaments.map((tournament) => <div key={tournament.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4"><input value={tournament.title} onChange={(event) => setTournaments((items) => items.map((item) => item.id === tournament.id ? { ...item, title: event.target.value } : item))} className="bg-transparent font-display text-2xl uppercase outline-none" /><div className="grid grid-cols-2 gap-2"><input value={tournament.sport} onChange={(event) => setTournaments((items) => items.map((item) => item.id === tournament.id ? { ...item, sport: event.target.value } : item))} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Sport" /><input value={tournament.entryFee} onChange={(event) => setTournaments((items) => items.map((item) => item.id === tournament.id ? { ...item, entryFee: event.target.value } : item))} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" placeholder="Entry fee" /></div><button onClick={() => generateFixtures(tournament)} className="rounded border border-cyan/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan hover:bg-cyan hover:text-ink">Generate fixtures automatically ↗</button></div>)}</div><button disabled={busy} onClick={() => onSave("/api/admin/tournaments", tournaments, "Tournaments published.")} className="mt-5 rounded-lg bg-cyan px-5 py-3 text-xs font-black uppercase tracking-widest text-ink">Publish tournament catalogue ↗</button></section>; }