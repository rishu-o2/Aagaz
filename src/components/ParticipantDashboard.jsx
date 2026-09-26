import { useEffect, useState } from "react";
import { firebaseAuth } from "../firebase";
import DashboardShell from "./DashboardShell";

export default function ParticipantDashboard({ participant, tournaments = [], events = [], liveMatches = [], announcement, gallery = [], onRegister, onLogout }) {
  const [profile, setProfile] = useState(participant);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const token = firebaseAuth?.currentUser ? await firebaseAuth.currentUser.getIdToken() : localStorage.getItem("aagaz-participant-token");
        const response = await fetch("/api/participants/me", { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) { setProfile(result); localStorage.setItem("aagaz-participant-profile", JSON.stringify(result)); }
      } catch { if (active) setProfile(participant); }
      finally { if (active) setLoading(false); }
    }
    refresh();
    return () => { active = false; };
  }, [participant]);

  async function logout() {
    const token = localStorage.getItem("aagaz-participant-token");
    if (token) fetch("/api/participants/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    await firebaseAuth?.signOut().catch(() => {});
    localStorage.removeItem("aagaz-participant-token");
    localStorage.removeItem("aagaz-participant-registration");
    localStorage.removeItem("aagaz-participant-profile");
    onLogout();
  }

  const entries = profile?.entries || [];
  const teams = entries.filter((entry) => entry.teamName);
  const myFixtures = profile?.fixtures || [];
  const tabs = [
    { id: "overview", label: "Overview", icon: "⚡" },
    { id: "live-scores", label: "Live Scores", icon: "🏆" },
    { id: "fixtures", label: "Fixtures", icon: "▦" },
    { id: "tournaments", label: "Tournaments", icon: "🏅" },
    { id: "my-entries", label: "My Entries", icon: "▤" },
    { id: "my-teams", label: "My Teams", icon: "♧" },
    { id: "club-updates", label: "Club Updates", icon: "▣" },
    { id: "gallery", label: "Gallery", icon: "▧" },
  ];
  const noItems = (title, message) => <div className="rounded-xl border border-dashed border-white/15 bg-navy p-8 text-center"><p className="font-display text-2xl font-bold uppercase text-white">{title}</p><p className="mt-2 text-sm text-slate-400">{message}</p></div>;

  function tournamentCards(items) {
    return items.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((tournament) => <article key={tournament.id} className="rounded-xl border border-white/10 bg-navy p-5"><p className="text-[10px] font-black uppercase tracking-widest text-cyan">{tournament.sport}</p><h4 className="mt-2 font-display text-2xl font-bold uppercase">{tournament.title}</h4><p className="mt-2 text-sm text-slate-400">{tournament.dates || "Date to be announced"} · {tournament.venue || "Venue to be announced"}</p><p className="mt-3 text-xs text-slate-500">{tournament.registrationCount ?? 0} registrations</p><button onClick={() => onRegister?.(tournament)} className="mt-5 w-full rounded-md bg-cyan px-4 py-3 text-xs font-black uppercase tracking-widest text-ink">Register for tournament</button></article>)}</div> : noItems("No tournaments published yet", "The club’s tournaments will appear here when registration opens.");
  }

  function entryRows(items) {
    return items.length ? <div className="mt-4 divide-y divide-white/10">{items.map((entry) => <article key={`${entry.tournamentId}-${entry.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h4 className="font-bold">{entry.tournamentName}</h4><p className="text-sm text-slate-400">{entry.sport} · {entry.date || "Date to be announced"}</p>{entry.teamName && <p className="mt-1 text-sm text-cyan">Club-assigned team: {entry.teamName}</p>}</div><span className={`rounded-full border px-3 py-1 text-xs uppercase ${entry.status === "approved" ? "border-lime/30 text-lime" : entry.status === "declined" ? "border-red-500/30 text-red-400" : "border-yellow-500/30 text-yellow-400"}`}>{entry.status || "Pending"}</span></article>)}</div> : <p className="mt-4 text-sm text-slate-400">No entries yet. Register for a club tournament to get started.</p>;
  }

  function liveCards(items) {
    return items.length ? <div className="grid gap-3 md:grid-cols-2">{items.map((match) => <article key={match.id} className="rounded-xl border border-red-500/20 bg-navy p-5"><p className="text-xs font-black uppercase tracking-widest text-red-400">{match.isLive ? "LIVE" : match.period || "Match"} · {match.sport}</p><div className="flex items-center justify-between py-5 text-lg font-bold"><span>{match.home}</span><span className="px-3 font-display text-2xl text-cyan">{match.homeScore} - {match.awayScore}</span><span>{match.away}</span></div><div className="flex justify-between text-xs text-slate-500"><span>{match.venue}</span>{match.streamUrl && <a href={match.streamUrl} target="_blank" rel="noreferrer" className="font-bold uppercase tracking-widest text-cyan">Watch live ↗</a>}</div></article>)}</div> : noItems("No live matches", "Live scores will appear here when the club starts a match.");
  }

  return <DashboardShell roleLabel="Participant" name={profile?.name || "Participant"} email={`${profile?.email || profile?.phoneNumber || ""} · Registration ${profile?.universityRegistrationNumber || ""}`} actions={<><span className="hidden text-xs text-slate-500 sm:inline">{loading ? "Updating…" : ""}</span><button onClick={logout} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-cyan hover:text-cyan">Sign out</button></>} tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
    <div className="contents">
      <div className="contents">
      <header className="hidden">
        <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-cyan">Participant workspace</p><h2 className="font-display text-2xl font-bold uppercase leading-none">{profile?.name || "Participant"}</h2><p className="mt-1 text-xs text-slate-500">{profile?.email || profile?.phoneNumber} · Registration {profile?.universityRegistrationNumber}</p></div><div className="flex items-center gap-2">{loading && <span className="hidden text-xs text-slate-500 sm:inline">Updating…</span>}<button onClick={logout} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-cyan hover:text-cyan">Sign out</button></div></div>
        <nav />
      </header>

      <div className="mt-0">
        {activeTab === "overview" && <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[liveMatches.filter((match) => match.isLive).length, "Live now", "text-red-400"], [events.length, "Club fixtures", "text-purple-400"], [tournaments.length, "Tournaments", "text-lime"], [entries.length, "Your entries", "text-cyan"]].map(([value, label, color]) => <article key={label} className="rounded-xl border border-white/10 bg-navy p-5"><strong className={`font-display text-4xl font-black ${color}`}>{value}</strong><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p></article>)}</div>
          <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-cyan">Club activity</p><h3 className="font-display text-3xl font-bold uppercase">Live scores</h3></div><button onClick={() => setActiveTab("live-scores")} className="text-xs font-black uppercase tracking-widest text-cyan">View all</button></div>{liveCards(liveMatches.slice(0, 4))}</section>
          <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-cyan">Club tournaments</p><h3 className="font-display text-3xl font-bold uppercase">Registration open</h3></div><button onClick={() => setActiveTab("tournaments")} className="text-xs font-black uppercase tracking-widest text-cyan">View all</button></div>{tournamentCards(tournaments.slice(0, 3))}</section>
          <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5"><p className="text-xs font-black uppercase tracking-widest text-cyan">Your activity</p><h3 className="font-display text-3xl font-bold uppercase">Recent entries</h3>{entryRows(entries.slice(0, 3))}</section>
        </>}
        {activeTab === "live-scores" && <section><p className="text-xs font-black uppercase tracking-widest text-cyan">Follow every point</p><h3 className="mb-5 font-display text-4xl font-bold uppercase">Live scores</h3>{liveCards(liveMatches)}</section>}
        {activeTab === "fixtures" && <section><p className="text-xs font-black uppercase tracking-widest text-cyan">Club schedule</p><h3 className="mb-5 font-display text-4xl font-bold uppercase">Fixtures</h3>{events.length ? <div className="grid gap-3 md:grid-cols-2">{events.map((fixture) => <article key={fixture.id} className="rounded-xl border border-white/10 bg-navy p-5"><div className="flex justify-between gap-3 text-xs text-slate-400"><span className="font-bold text-cyan">{fixture.sport}</span><span>{fixture.date} · {fixture.time}</span></div><div className="flex items-center justify-between py-5 text-lg font-bold"><span>{fixture.homeTeam}</span><span className="px-3 text-cyan">{fixture.homeScore} - {fixture.awayScore}</span><span>{fixture.awayTeam}</span></div><p className="text-center text-xs uppercase tracking-widest text-slate-500">{fixture.status} · {fixture.venue}</p></article>)}</div> : noItems("No fixtures published", "The club’s match schedule will appear here.")}</section>}
        {activeTab === "tournaments" && <section><p className="text-xs font-black uppercase tracking-widest text-cyan">Compete for your college</p><h3 className="mb-5 font-display text-4xl font-bold uppercase">Tournaments</h3>{tournamentCards(tournaments)}</section>}
        {activeTab === "my-entries" && <section className="rounded-xl border border-white/10 bg-navy p-5"><p className="text-xs font-black uppercase tracking-widest text-cyan">Your applications</p><h3 className="font-display text-3xl font-bold uppercase">My entries</h3>{entryRows(entries)}</section>}
        {activeTab === "my-teams" && <section className="rounded-xl border border-white/10 bg-navy p-5"><p className="text-xs font-black uppercase tracking-widest text-cyan">Teams formed by the club</p><h3 className="font-display text-3xl font-bold uppercase">My teams</h3>{teams.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{teams.map((entry) => <article key={`${entry.tournamentId}-${entry.id}`} className="rounded-lg border border-white/10 bg-ink p-4"><h4 className="font-bold">{entry.teamName}</h4><p className="mt-1 text-sm text-slate-400">{entry.tournamentName}</p>{entry.teammates?.length > 0 && <p className="mt-3 text-xs text-slate-500">Team members: {entry.teammates.map((member) => member.name).join(", ")}</p>}</article>)}</div> : <p className="mt-4 text-sm text-slate-400">The club will assign a team after reviewing your tournament entry.</p>}</section>}
        {activeTab === "club-updates" && <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-xl border border-white/10 bg-navy p-6"><p className="text-xs font-black uppercase tracking-widest text-cyan">Club announcement</p>{announcement?.active ? <><h3 className="mt-3 font-display text-3xl font-bold uppercase">{announcement.text}</h3>{announcement.link && <a href={announcement.link} target="_blank" rel="noreferrer" className="mt-5 inline-block text-xs font-black uppercase tracking-widest text-cyan">More information ↗</a>}</> : <p className="mt-4 text-sm text-slate-400">No new club announcements.</p>}</article><article className="rounded-xl border border-white/10 bg-navy p-6"><p className="text-xs font-black uppercase tracking-widest text-cyan">Club participation</p><h3 className="mt-3 font-display text-3xl font-bold uppercase">Join the club</h3><p className="mt-3 text-sm leading-6 text-slate-400">Take part in training, represent your college, and keep an eye on upcoming tryouts and sports events.</p></article></section>}
        {activeTab === "gallery" && <section><p className="text-xs font-black uppercase tracking-widest text-cyan">Campus moments</p><h3 className="mb-5 font-display text-4xl font-bold uppercase">Club gallery</h3>{gallery.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((item) => <article key={item.id} className="grid min-h-44 place-items-center rounded-xl border border-white/10 p-6 text-center" style={{ background: `linear-gradient(145deg, ${item.color || "#006c86"}55, #08131f)` }}><span className="font-display text-3xl font-bold uppercase">{item.label}</span></article>)}</div> : noItems("Gallery is empty", "Club photos and highlights will appear here.")}</section>}
      </div>
      </div>
    </div>
  </DashboardShell>;
}
