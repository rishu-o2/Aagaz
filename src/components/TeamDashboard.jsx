import { useEffect, useState } from "react";
import { firebaseAuth } from "../firebase";

export default function TeamDashboard({ team: participant, onLogout }) {
  const [profile, setProfile] = useState(participant);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const idToken = firebaseAuth?.currentUser ? await firebaseAuth.currentUser.getIdToken() : localStorage.getItem("aagaz-participant-token");
        const registrationNumber = localStorage.getItem("aagaz-participant-registration") || participant.universityRegistrationNumber;
        const response = await fetch(`/api/participants/me?registrationNumber=${encodeURIComponent(registrationNumber)}`, { headers: { Authorization: `Bearer ${idToken}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) {
          setProfile(result);
          localStorage.setItem("aagaz-participant-profile", JSON.stringify(result));
        }
      } catch {
        if (active && participant) setProfile(participant);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [participant]);

  async function logout() {
    const idToken = localStorage.getItem("aagaz-participant-token");
    if (idToken) fetch("/api/participants/logout", { method: "POST", headers: { Authorization: `Bearer ${idToken}` } }).catch(() => {});
    await firebaseAuth?.signOut().catch(() => {});
    localStorage.removeItem("aagaz-participant-token");
    localStorage.removeItem("aagaz-participant-registration");
    localStorage.removeItem("aagaz-participant-profile");
    onLogout();
  }

  const entries = profile?.entries || [];
  const assignedTeams = entries.filter((entry) => entry.teamName);

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/95 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Participant dashboard</p>
            <h2 className="mt-2 font-display text-5xl font-bold uppercase">{profile?.name || "Participant"}.</h2>
            <p className="mt-2 text-sm text-slate-500">{profile?.email || profile?.phoneNumber} · University registration {profile?.universityRegistrationNumber}</p>
          </div>
          <button onClick={logout} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-cyan hover:text-cyan">Sign out</button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-cyan/25 bg-navy p-5">
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Tournament entries</p>
            <h3 className="mt-5 font-display text-4xl font-bold uppercase">{entries.length}</h3>
          </article>
          <article className="rounded-xl border border-white/10 bg-navy p-5">
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Club-assigned teams</p>
            <h3 className="mt-5 font-display text-4xl font-bold uppercase">{assignedTeams.length}</h3>
          </article>
          <article className="rounded-xl border border-white/10 bg-navy p-5">
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Match schedule</p>
            <h3 className="mt-5 font-display text-4xl font-bold uppercase">{profile?.fixtures?.length || 0}</h3>
          </article>
        </div>

        <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan">Your tournaments</p>
              <h3 className="mt-1 font-display text-3xl font-bold uppercase">Entries & teams</h3>
            </div>
            {loading && <span className="text-xs text-slate-500">Refreshing…</span>}
          </div>
          {entries.length ? <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
            {entries.map((entry) => (
              <article key={`${entry.tournamentId}-${entry.id}`} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold">{entry.tournamentName}</h4>
                    <p className="text-sm text-slate-400">{entry.sport} · {entry.date || "Date to be announced"}</p>
                    <p className="mt-2 text-sm text-cyan">{entry.teamName ? `Team: ${entry.teamName}` : "The club has not assigned your team yet."}</p>
                    {entry.teammates?.length > 0 && <p className="mt-1 text-xs text-slate-500">Team members: {entry.teammates.map((member) => member.name).join(", ")}</p>}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${entry.status === "approved" ? "border-lime/20 bg-lime/10 text-lime" : entry.status === "declined" ? "border-red-500/20 bg-red-500/10 text-red-400" : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"}`}>{entry.status || "Pending"}</span>
                </div>
              </article>
            ))}
          </div> : <p className="mt-5 text-sm text-slate-500">No tournament registrations were found for this account.</p>}
        </section>

        {profile?.fixtures?.length > 0 && <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5">
          <p className="text-xs font-black uppercase tracking-widest text-cyan">Your matches</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {profile.fixtures.map((fixture) => <article key={fixture.id} className="rounded border border-white/10 bg-ink p-4">
              <div className="flex justify-between gap-3 text-xs text-slate-400"><span className="font-bold text-cyan">{fixture.tournamentName}</span><span>{fixture.date} · {fixture.time}</span></div>
              <div className="flex items-center justify-between py-3 text-lg font-bold"><span>{fixture.homeTeam}</span><span className="px-3 text-cyan">{fixture.homeScore} - {fixture.awayScore}</span><span>{fixture.awayTeam}</span></div>
              <p className="text-center text-xs uppercase tracking-widest text-slate-500">{fixture.status} · {fixture.venue}</p>
            </article>)}
          </div>
        </section>}
      </div>
    </div>
  );
}
