import { useEffect, useState } from "react";
import AdminLogin from "./AdminLogin";
import FixtureManager from "./FixtureManager";
import AnalyticsCharts from "./AnalyticsCharts";
import AnnouncementManager from "./AnnouncementManager";
import ImageGalleryManager from "./ImageGalleryManager";
import StaffInviteSystem from "./StaffInviteSystem";
import DashboardShell from "./DashboardShell";

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

  useEffect(() => {
    if (!token) return;
    loadAdminData(token);
    const interval = setInterval(() => loadAdminData(token), 30000);
    return () => clearInterval(interval);
  }, [token]);

  async function loadAdminData(currentToken) {
    const response = await fetch("/api/admin/data", { headers: { Authorization: `Bearer ${currentToken}` } });
    if (!response.ok) { localStorage.removeItem("aagaz-admin-token"); onToken(""); return; }
    const result = await response.json();
    setAdminData(result); setUser(result.user); setEvents(result.events); setLiveMatches(result.liveMatches);
    setTournaments(result.tournaments); setGallery(result.gallery || []); setMembers(result.members || []);
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
      onMessage(result.message || label); await loadAdminData(token); return true;
    } catch (error) { onMessage(error.message); return false; } finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem("aagaz-admin-token"); onToken(""); onLogout?.();
  }

  function updateMatch(id, key, value) {
    setLiveMatches((items) => items.map((item) => item.id === id ? { ...item, [key]: key.includes("Score") ? Number(value) : value } : item));
  }

  function downloadCSV(url, filename) {
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); });
  }

  function printFixtures() {
    const printable = events.map(e => `${e.date || "TBD"} | ${e.time || "TBA"} | ${e.title} | ${e.venue || ""} | ${e.status}`).join("\n");
    const w = window.open("", "_blank");
    w.document.write(`<pre style="font-family:monospace;padding:20px;"><h2>Aagaz Fixture Sheet</h2>\n${printable}</pre>`);
    w.document.close(); w.print();
  }

  if (!token || !adminData) return <AdminLogin email={email} setEmail={setEmail} password={password} setPassword={setPassword} busy={busy} onSubmit={login} onClose={onClose} />;

  const pendingEntries = tournaments.flatMap(t => (t.registrations || []).filter(r => r.status === "pending")).length;
  const pendingMembers = members.filter(m => m.status === "pending").length;
  const totalAlerts = pendingEntries + pendingMembers;

  const TABS = [
    { id: "overview", label: "Overview", icon: "⚡" },
    { id: "scores", label: "Live Scores", icon: "🏆" },
    { id: "fixtures", label: "Fixtures", icon: "📅" },
    { id: "tournaments", label: "Tournaments", icon: "🏅" },
    { id: "registrations", label: "Entries", icon: "📋", badge: pendingEntries },
    { id: "members", label: "Membership", icon: "👥", badge: pendingMembers },
    ...(user?.role === "super_admin" ? [
      { id: "gallery", label: "Gallery", icon: "🖼" },
      { id: "announcements", label: "Announcement", icon: "📢" },
      { id: "staff", label: "Staff", icon: "🛡" },
      { id: "activity", label: "Activity", icon: "📡" },
      { id: "analytics", label: "Analytics", icon: "📊" },
      { id: "settings", label: "Settings", icon: "⚙️" },
    ] : []),
  ];

  return (
    <DashboardShell
      roleLabel={user?.role?.replaceAll("_", " ") || "Staff"}
      name={user?.name || "Staff Dashboard"}
      email={user?.email}
      badge={totalAlerts > 0 && <div className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1"><span className="text-xs font-black text-red-400">{totalAlerts} pending</span></div>}
      actions={<>
        {user?.role === "super_admin" && <><button onClick={() => downloadCSV("/api/admin/export/registrations", "registrations.csv")} className="hidden rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-lime hover:text-lime sm:block">Entries</button><button onClick={() => downloadCSV("/api/admin/export/members", "members.csv")} className="hidden rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-lime hover:text-lime sm:block">Members</button></>}
        <button onClick={printFixtures} className="hidden rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-white hover:text-white sm:block">Print</button>
        <button onClick={logout} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-cyan hover:text-cyan">Sign out</button>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center text-2xl text-slate-500 hover:text-white">×</button>
      </>}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="contents"><div className="contents">
        <div className="hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan">{user?.role?.replaceAll("_", " ")}</p>
                <h2 className="font-display text-2xl font-bold uppercase leading-none">{user?.name || "Staff Dashboard"}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
              </div>
              {totalAlerts > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1">
                  <span className="text-red-400 text-xs font-black">🔔 {totalAlerts} pending</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user?.role === "super_admin" && (
                <>
                  <button onClick={() => downloadCSV("/api/admin/export/registrations", "registrations.csv")} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-lime hover:text-lime hidden sm:block">↓ Entries</button>
                  <button onClick={() => downloadCSV("/api/admin/export/members", "members.csv")} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-lime hover:text-lime hidden sm:block">↓ Members</button>
                </>
              )}
              <button onClick={printFixtures} className="rounded-md border border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-white hover:text-white hidden sm:block">🖨 Print</button>
              <button onClick={logout} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-cyan hover:text-cyan">Sign out</button>
              <button onClick={onClose} className="text-2xl text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center">×</button>
            </div>
          </div>
          <div className="mt-4 flex gap-0.5 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 px-3 py-2 text-[11px] font-black uppercase tracking-widest transition rounded-t-md border-b-2 ${activeTab === tab.id ? "border-cyan text-cyan bg-cyan/5" : "border-transparent text-slate-500 hover:text-white"}`}
              >
                <span className="hidden sm:inline">{tab.icon} </span>{tab.label}
                {tab.badge > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-0">
          {activeTab === "overview" && <OverviewStats analytics={adminData.analytics} tournaments={tournaments} members={members} events={events} liveMatches={liveMatches} onTabSwitch={setActiveTab} />}
          {activeTab === "scores" && (user?.role === "super_admin" || user?.role === "scorekeeper") && <Scoreboard liveMatches={liveMatches} setLiveMatches={setLiveMatches} updateMatch={updateMatch} save={save} busy={busy} />}
          {activeTab === "fixtures" && (user?.role === "super_admin" || user?.role === "fixture_manager") && <FixtureManager events={events} setEvents={setEvents} tournaments={tournaments} onSave={save} busy={busy} />}
          {activeTab === "tournaments" && (user?.role === "super_admin" || user?.role === "tournament_manager") && <TournamentPublisher tournaments={tournaments} setTournaments={setTournaments} onSave={save} busy={busy} onMessage={onMessage} />}
          {activeTab === "registrations" && (user?.role === "super_admin" || user?.role === "tournament_manager") && <RegistrationQueue tournaments={tournaments} save={save} />}
          {activeTab === "members" && user?.role === "super_admin" && <MembershipQueue members={members} save={save} />}
          {activeTab === "gallery" && user?.role === "super_admin" && <ImageGalleryManager gallery={gallery} setGallery={setGallery} onSave={save} busy={busy} token={token} />}
          {activeTab === "announcements" && user?.role === "super_admin" && <AnnouncementManager announcement={announcement} setAnnouncement={setAnnouncement} onSave={save} busy={busy} />}
          {activeTab === "staff" && user?.role === "super_admin" && <StaffInviteSystem staffUsers={adminData.staffUsers} token={token} onMessage={onMessage} onRefresh={() => loadAdminData(token)} />}
          {activeTab === "activity" && user?.role === "super_admin" && <ActivityFeed loginEvents={adminData.loginEvents || []} />}
          {activeTab === "analytics" && user?.role === "super_admin" && <AnalyticsCharts tournaments={tournaments} members={members} analytics={adminData.analytics} />}
          {activeTab === "settings" && user?.role === "super_admin" && <SettingsPanel token={token} onMessage={onMessage} onLogout={logout} />}
        </div>
      </div></div>
    </DashboardShell>
  );
}

function OverviewStats({ analytics, tournaments, members, events, liveMatches, onTabSwitch }) {
  const pendingEntries = tournaments.flatMap(t => (t.registrations || []).filter(r => r.status === "pending")).length;
  const pendingMembers = members.filter(m => m.status === "pending").length;
  const liveCount = liveMatches.filter(m => m.isLive).length;
  const stats = [
    { value: analytics?.totalParticipantAccounts ?? 0, label: "Registered Teams", icon: "👥", color: "text-cyan", tab: null },
    { value: tournaments.length, label: "Active Tournaments", icon: "🏅", color: "text-lime", tab: "tournaments" },
    { value: liveCount, label: "Live Now", icon: "🔴", color: "text-red-400", tab: "scores" },
    { value: events.length, label: "Total Fixtures", icon: "📅", color: "text-purple-400", tab: "fixtures" },
    { value: pendingEntries, label: "Pending Entries", icon: "📋", color: pendingEntries > 0 ? "text-yellow-400" : "text-slate-500", tab: "registrations" },
    { value: pendingMembers, label: "Pending Members", icon: "🔔", color: pendingMembers > 0 ? "text-orange-400" : "text-slate-500", tab: "members" },
    { value: analytics?.totalLogins ?? 0, label: "Total Logins", icon: "🔐", color: "text-slate-400", tab: null },
    { value: analytics?.activeStaff ?? 0, label: "Staff Online", icon: "🛡", color: "text-cyan", tab: "staff" },
  ];
  return (
    <section>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {stats.map(({ value, label, icon, color, tab }) => (
          <div key={label} onClick={() => tab && onTabSwitch(tab)} className={`rounded-xl border border-white/10 bg-navy p-5 transition ${tab ? "cursor-pointer hover:border-white/30 hover:bg-white/5" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <strong className={`font-display text-4xl font-black ${color}`}>{value}</strong>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
              </div>
              <span className="text-2xl opacity-60">{icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-navy p-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Go to Live Scores", tab: "scores", style: "border-red-500/30 text-red-400 hover:bg-red-500/10" },
            { label: "Review Entries", tab: "registrations", style: "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" },
            { label: "Review Members", tab: "members", style: "border-orange-500/30 text-orange-400 hover:bg-orange-500/10" },
            { label: "Post Announcement", tab: "announcements", style: "border-cyan/30 text-cyan hover:bg-cyan/10" },
            { label: "Manage Staff", tab: "staff", style: "border-purple-500/30 text-purple-400 hover:bg-purple-500/10" },
            { label: "View Analytics", tab: "analytics", style: "border-lime/30 text-lime hover:bg-lime/10" },
          ].map(({ label, tab, style }) => (
            <button key={tab} onClick={() => onTabSwitch(tab)} className={`rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-widest transition ${style}`}>{label} →</button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Scoreboard({ liveMatches, setLiveMatches, updateMatch, save, busy }) {
  function addMatch() {
    setLiveMatches(prev => [...prev, { id: `live-${Date.now()}`, sport: "Cricket", period: "1st Innings", home: "Team A", away: "Team B", homeScore: 0, awayScore: 0, venue: "LPU Campus", streamUrl: "", isLive: true }]);
  }
  function removeMatch(id) { setLiveMatches(prev => prev.filter(m => m.id !== id)); }
  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-3xl font-bold uppercase">Live Scoreboard</h3>
        <div className="flex gap-2">
          <button onClick={addMatch} className="rounded-md border border-lime/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-lime hover:bg-lime/10">+ Add Match</button>
          <button disabled={busy} onClick={() => save("/api/admin/live-matches", liveMatches, "Live scores saved.")} className="rounded-md bg-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-ink disabled:opacity-50">Save All</button>
        </div>
      </div>
      <div className="space-y-4">
        {liveMatches.map((match) => (
          <div key={match.id} className="rounded-lg border border-white/10 bg-ink p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={match.isLive || false} onChange={e => updateMatch(match.id, "isLive", e.target.checked)} className="accent-red-500 w-3.5 h-3.5" />
                <span className={match.isLive ? "text-red-400 font-black" : "text-slate-400"}>🔴 LIVE</span>
              </label>
              <button onClick={() => removeMatch(match.id)} className="text-xs text-slate-600 hover:text-red-400 font-black uppercase tracking-widest">Remove</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={match.sport} onChange={e => updateMatch(match.id, "sport", e.target.value)} placeholder="Sport" className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
              <input value={match.period || ""} onChange={e => updateMatch(match.id, "period", e.target.value)} placeholder="Period / Quarter" className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
              <input value={match.venue || ""} onChange={e => updateMatch(match.id, "venue", e.target.value)} placeholder="Venue" className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="flex gap-2 items-center">
                <input value={match.home} onChange={e => updateMatch(match.id, "home", e.target.value)} className="flex-1 rounded border border-white/10 bg-navy p-2 text-sm outline-none focus:border-cyan" placeholder="Home team" />
                <input type="number" value={match.homeScore} onChange={e => updateMatch(match.id, "homeScore", e.target.value)} className="w-16 rounded border border-white/10 bg-navy p-2 text-center font-display text-xl outline-none focus:border-cyan" />
              </div>
              <div className="flex gap-2 items-center">
                <input value={match.away} onChange={e => updateMatch(match.id, "away", e.target.value)} className="flex-1 rounded border border-white/10 bg-navy p-2 text-sm outline-none focus:border-cyan" placeholder="Away team" />
                <input type="number" value={match.awayScore} onChange={e => updateMatch(match.id, "awayScore", e.target.value)} className="w-16 rounded border border-white/10 bg-navy p-2 text-center font-display text-xl outline-none focus:border-cyan" />
              </div>
            </div>
            <input value={match.streamUrl || ""} onChange={e => updateMatch(match.id, "streamUrl", e.target.value)} placeholder="YouTube or stream URL (optional)" className="mt-2 w-full rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
          </div>
        ))}
        {!liveMatches.length && (
          <div className="rounded-lg border border-dashed border-white/15 p-8 text-center">
            <p className="text-slate-500 text-sm">No matches added yet.</p>
            <button onClick={addMatch} className="mt-3 text-xs font-black uppercase tracking-widest text-cyan hover:underline">+ Add your first match</button>
          </div>
        )}
      </div>
    </section>
  );
}

function RegistrationQueue({ tournaments, save }) {
  const [filter, setFilter] = useState("pending");
  const teamTournaments = tournaments.filter(tournament => /team/i.test(tournament.format || "") || (tournament.registrations || []).some(entry => entry.entryType === "Team"));
  const [teamTournamentId, setTeamTournamentId] = useState(teamTournaments[0]?.id || "");
  const [teamName, setTeamName] = useState("");
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const activeTeamTournament = teamTournaments.find(tournament => tournament.id === teamTournamentId);
  const eligibleEntries = (activeTeamTournament?.registrations || []).filter(entry => entry.status === "approved");
  const entries = tournaments.flatMap(t => (t.registrations || []).map(r => ({ ...r, tournament: t.title })));
  const filtered = filter === "all" ? entries : entries.filter(e => e.status === filter);

  async function createTournamentTeam(event) {
    event.preventDefault();
    setCreatingTeam(true);
    try {
      const saved = await save("/api/admin/tournament-teams", { tournamentId: teamTournamentId, name: teamName, registrationIds: selectedEntries }, "Tournament team created.");
      if (saved) { setTeamName(""); setSelectedEntries([]); }
    } finally {
      setCreatingTeam(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <div className="mb-8 rounded-xl border border-cyan/20 bg-ink p-5">
        <p className="text-xs font-black uppercase tracking-widest text-cyan">Club team formation</p>
        <h3 className="mt-1 font-display text-3xl font-bold uppercase">Build teams from approved entries</h3>
        <p className="mt-2 text-sm text-slate-500">Participants register individually. Select approved entries to form each tournament team; participants cannot create or edit teams.</p>
        {teamTournaments.length ? <>
          <select value={teamTournamentId} onChange={event => { setTeamTournamentId(event.target.value); setSelectedEntries([]); }} className="mt-4 w-full rounded border border-white/10 bg-navy p-3 text-sm text-white">
            {teamTournaments.map(tournament => <option key={tournament.id} value={tournament.id}>{tournament.title}</option>)}
          </select>
          <form onSubmit={createTournamentTeam} className="mt-4 grid gap-3">
            <input required placeholder="Team name" value={teamName} onChange={event => setTeamName(event.target.value)} className="rounded border border-white/10 bg-navy p-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
            <div className="grid gap-2 sm:grid-cols-2">
              {eligibleEntries.map(entry => <label key={entry.id} className="flex cursor-pointer items-start gap-3 rounded border border-white/10 bg-navy p-3 text-sm">
                <input type="checkbox" checked={selectedEntries.includes(entry.id)} onChange={event => setSelectedEntries(current => event.target.checked ? [...current, entry.id] : current.filter(id => id !== entry.id))} className="mt-1 accent-cyan" />
                <span><strong>{entry.name}</strong><span className="block text-xs text-slate-500">{entry.universityRegistrationNumber} · {entry.email}</span>{entry.assignedTeamName && <span className="block text-xs text-cyan">Currently assigned: {entry.assignedTeamName}</span>}</span>
              </label>)}
            </div>
            <button disabled={creatingTeam || selectedEntries.length < 2} className="rounded bg-cyan px-4 py-3 text-xs font-black uppercase tracking-widest text-ink disabled:opacity-40">{creatingTeam ? "Creating team..." : `Create team from ${selectedEntries.length} entries`}</button>
          </form>
          <div className="mt-5 space-y-2">
            {(activeTeamTournament?.teams || []).map(team => <div key={team.id} className="rounded border border-white/10 p-3"><p className="font-bold">{team.name}</p><p className="text-xs text-slate-500">{team.registrationIds.length} assigned participants</p></div>)}
            {!activeTeamTournament?.teams?.length && <p className="text-xs text-slate-500">No teams created for this tournament yet.</p>}
            {!eligibleEntries.length && <p className="text-xs text-slate-500">Approve participant entries before assigning them to teams.</p>}
          </div>
        </> : <p className="mt-4 text-sm text-slate-500">Create a tournament with a team format to form tournament teams here.</p>}
      </div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="font-display text-3xl font-bold uppercase">Tournament Entries</h3>
        <div className="flex gap-1 rounded-lg border border-white/10 p-1">
          {["pending", "approved", "declined", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition ${filter === f ? "bg-cyan text-ink" : "text-slate-500 hover:text-white"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map(entry => (
          <div key={entry.id} className="rounded-lg border border-white/10 bg-ink p-4">
            <div className="flex justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-sm">{entry.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{entry.email}{entry.phone && ` · 📞 ${entry.phone}`}</p>
                <p className="text-xs text-slate-500 mt-0.5"><span className="text-cyan">{entry.tournament}</span> · Reg: {entry.universityRegistrationNumber}{entry.assignedTeamName && ` · Team: ${entry.assignedTeamName}`}{entry.course && ` · ${entry.course}`}{entry.entryType && ` · ${entry.entryType}`}</p>
                {entry.members && entry.members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">{entry.members.map((m, i) => <span key={i} className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">{m.name || m}</span>)}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${entry.status === "approved" ? "bg-lime/10 text-lime" : entry.status === "declined" ? "bg-red-500/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"}`}>{entry.status}</span>
                <p className="text-[10px] text-slate-600">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-IN") : ""}</p>
              </div>
            </div>
            {entry.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => save("/api/admin/tournament-entry-status", { id: entry.id, status: "approved" }, "Entry approved.")} className="rounded bg-lime px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ink">✓ Approve</button>
                <button onClick={() => save("/api/admin/tournament-entry-status", { id: entry.id, status: "declined" }, "Entry declined.")} className="rounded border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400 hover:text-red-400">✗ Decline</button>
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-slate-500 text-center py-8">No {filter === "all" ? "" : filter} entries.</p>}
      </div>
    </section>
  );
}

function MembershipQueue({ members, save }) {
  const [filter, setFilter] = useState("pending");
  const filtered = filter === "all" ? members : members.filter(m => m.status === filter);
  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="font-display text-3xl font-bold uppercase">Club Membership</h3>
        <div className="flex gap-1 rounded-lg border border-white/10 p-1">
          {["pending", "approved", "declined", "all"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition ${filter === f ? "bg-cyan text-ink" : "text-slate-500 hover:text-white"}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map(member => (
          <div key={member.id} className="rounded-lg border border-white/10 bg-ink p-4">
            <div className="flex justify-between gap-3 flex-wrap">
              <div>
                <p className="font-bold text-sm">{member.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{member.email}{member.phone && ` · 📞 ${member.phone}`}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {member.course && <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-500">📚 {member.course}</span>}
                  {member.sport && <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-500">🏅 {member.sport}</span>}
                  {member.rollNumber && <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-slate-500">🎓 {member.rollNumber}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${member.status === "approved" ? "bg-lime/10 text-lime" : member.status === "declined" ? "bg-red-500/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"}`}>{member.status}</span>
                <p className="text-[10px] text-slate-600">{member.createdAt ? new Date(member.createdAt).toLocaleDateString("en-IN") : ""}</p>
              </div>
            </div>
            {member.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => save("/api/admin/member-status", { id: member.id, status: "approved" }, "Member approved.")} className="rounded bg-lime px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ink">✓ Approve</button>
                <button onClick={() => save("/api/admin/member-status", { id: member.id, status: "declined" }, "Member declined.")} className="rounded border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400 hover:text-red-400">✗ Decline</button>
              </div>
            )}
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-slate-500 text-center py-8">No {filter === "all" ? "" : filter} applications.</p>}
      </div>
    </section>
  );
}

function ActivityFeed({ loginEvents }) {
  const typeLabels = { participant: { label: "Team Login", icon: "👥", color: "text-cyan" }, staff: { label: "Staff Login", icon: "🛡", color: "text-purple-400" } };
  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <h3 className="font-display text-3xl font-bold uppercase mb-5">Activity Feed</h3>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {!loginEvents.length && <p className="text-sm text-slate-500 text-center py-8">No activity yet.</p>}
        {loginEvents.map((event, i) => {
          const meta = typeLabels[event.type] || { label: event.type, icon: "📌", color: "text-slate-400" };
          return (
            <div key={event.id || i} className="flex items-start gap-3 rounded-lg bg-ink border border-white/5 px-4 py-3">
              <span className="text-lg mt-0.5">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{event.email}</p>
                <p className={`text-xs ${meta.color} font-black uppercase tracking-widest`}>{meta.label}</p>
              </div>
              <p className="text-[10px] text-slate-600 shrink-0 mt-1">{event.loggedAt ? new Date(event.loggedAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TournamentPublisher({ tournaments, setTournaments, onSave, busy, onMessage }) {
  const SPORTS = ["Cricket", "Football", "Basketball", "Volleyball", "Badminton", "Table Tennis", "Chess", "Athletics", "Kabaddi", "Other"];
  function add() { setTournaments(items => [...items, { id: `tournament-${Date.now()}`, title: "New Aagaz Tournament", sport: "Cricket", format: "Open entry", dates: "", deadline: "", venue: "LPU Campus", entryFee: "TBA", capacity: 16, prizePool: "", description: "", registrations: [] }]); }
  function update(id, key, value) { setTournaments(items => items.map(item => item.id === id ? { ...item, [key]: value } : item)); }
  function remove(id) { setTournaments(items => items.filter(item => item.id !== id)); }
  async function generateFixtures(tournament) {
    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.id}/generate-fixtures`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("aagaz-admin-token")}` } });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); onMessage(result.message);
    } catch (error) { onMessage(error.message); }
  }
  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-3xl font-bold uppercase">Tournaments</h3>
        <button onClick={add} className="rounded-md border border-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan hover:bg-cyan/10">+ Add Tournament</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tournaments.map(t => (
          <div key={t.id} className="rounded-lg border border-white/10 bg-ink p-4 space-y-2">
            <input value={t.title} onChange={e => update(t.id, "title", e.target.value)} className="bg-transparent font-display text-xl uppercase outline-none w-full border-b border-white/10 pb-1 focus:border-cyan" />
            <div className="grid grid-cols-2 gap-2">
              <select value={t.sport} onChange={e => update(t.id, "sport", e.target.value)} className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan">{SPORTS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input value={t.format} onChange={e => update(t.id, "format", e.target.value)} placeholder="Format (Knockout / Round Robin)" className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={t.dates} onChange={e => update(t.id, "dates", e.target.value)} placeholder="Dates (e.g. Oct 10–15)" className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
              <input type="date" value={t.deadline} onChange={e => update(t.id, "deadline", e.target.value)} className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={t.entryFee} onChange={e => update(t.id, "entryFee", e.target.value)} placeholder="Entry fee" className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
              <input type="number" value={t.capacity} onChange={e => update(t.id, "capacity", Number(e.target.value))} placeholder="Max teams" className="rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
            </div>
            <input value={t.prizePool || ""} onChange={e => update(t.id, "prizePool", e.target.value)} placeholder="🏆 Prize pool (e.g. ₹10,000 + Trophy)" className="w-full rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
            <input value={t.venue} onChange={e => update(t.id, "venue", e.target.value)} placeholder="Venue" className="w-full rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan" />
            <textarea value={t.description} onChange={e => update(t.id, "description", e.target.value)} placeholder="Description / rules..." rows={2} className="w-full rounded border border-white/10 bg-navy p-2 text-xs outline-none focus:border-cyan resize-none" />
            <div className="flex gap-2 pt-1">
              <button onClick={() => generateFixtures(t)} className="flex-1 rounded border border-cyan/30 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan hover:bg-cyan/10">⚡ Generate Fixtures</button>
              <button onClick={() => remove(t.id)} className="rounded border border-red-500/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10">Remove</button>
            </div>
          </div>
        ))}
        {!tournaments.length && (
          <div className="col-span-2 rounded-lg border border-dashed border-white/15 p-8 text-center">
            <p className="text-slate-500 text-sm">No tournaments yet.</p>
            <button onClick={add} className="mt-3 text-xs font-black uppercase tracking-widest text-cyan hover:underline">+ Create your first tournament</button>
          </div>
        )}
      </div>
      {tournaments.length > 0 && (
        <button disabled={busy} onClick={() => onSave("/api/admin/tournaments", tournaments, "Tournaments published.")} className="mt-5 rounded-lg bg-cyan px-5 py-3 text-xs font-black uppercase tracking-widest text-ink disabled:opacity-50 hover:bg-white transition">
          {busy ? "Saving..." : "💾 Save & Publish All Tournaments"}
        </button>
      )}
    </section>
  );
}

function SettingsPanel({ token, onMessage, onLogout }) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e) {
    e.preventDefault();
    if (newPass !== confirm) return onMessage("Passwords do not match.");
    if (newPass.length < 6) return onMessage("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: newPass }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      onMessage("Password changed! Please log in again.");
      setTimeout(onLogout, 1500);
    } catch (err) { onMessage(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="max-w-lg space-y-6">
      <div className="rounded-xl border border-white/10 bg-navy p-5">
        <h3 className="font-display text-2xl font-bold uppercase mb-4">Change Password</h3>
        <form onSubmit={changePassword} className="space-y-3">
          <input required type="password" placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none focus:border-cyan placeholder:text-slate-600" />
          <input required type="password" placeholder="New password (min 6 chars)" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none focus:border-cyan placeholder:text-slate-600" />
          <input required type="password" placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none focus:border-cyan placeholder:text-slate-600" />
          <button disabled={busy} type="submit" className="w-full rounded-lg bg-cyan py-3 text-sm font-black uppercase tracking-widest text-ink disabled:opacity-50 hover:bg-white transition">{busy ? "Changing..." : "Change Password"}</button>
        </form>
      </div>
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
        <h3 className="font-display text-xl font-bold uppercase text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-slate-500 mb-4">Sign out from this device.</p>
        <button onClick={onLogout} className="rounded-lg border border-red-500/40 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10">Sign out everywhere</button>
      </div>
    </section>
  );
}
