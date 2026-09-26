import { useEffect, useState } from "react";
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { firebaseConfigured, firestore } from "../firebase";

export default function TeamDashboard({ team, onLogout }) {
  const [profile, setProfile] = useState(team);
  const [member, setMember] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("squad"); // squad, tournaments, fixtures

  useEffect(() => { 
    if (firebaseConfigured) { 
      // Firestore fallback omitted for brevity if real-time needed, but using API is safer for complex aggregations
    } 
    fetch("/api/teams/me", { headers: { Authorization: `Bearer ${localStorage.getItem("aagaz-team-token")}` } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setProfile).catch(() => {}); 
  }, [team.id]);

  async function addMember(event) {
    event.preventDefault(); setBusy(true);
    try { 
      const newMember = { name: member.name.trim(), email: member.email.trim().toLowerCase(), role: "Player" }; 
      if (firebaseConfigured) { 
        await updateDoc(doc(firestore, "teams", team.id), { members: arrayUnion(newMember) }); 
        setProfile((current) => ({ ...current, members: [...(current.members || []), newMember] })); 
        setMessage(`${newMember.name} added to your team.`); 
      } else { 
        const response = await fetch("/api/teams/members", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("aagaz-team-token")}`, "Content-Type": "application/json" }, body: JSON.stringify(member) }); 
        const result = await response.json(); 
        if (!response.ok) throw new Error(result.error); 
        setProfile((current) => ({ ...current, members: [...(current.members || []), result.member] })); 
        setMessage(result.message); 
      } 
      setMember({ name: "", email: "" }); 
    } catch (error) { 
      setMessage(error.message); 
    } finally { 
      setBusy(false); 
    }
  }

  function logout() {
    fetch("/api/teams/logout", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("aagaz-team-token")}` } }).catch(() => {});
    localStorage.removeItem("aagaz-team-token");
    onLogout();
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/95 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Participant Portal</p>
            <h2 className="mt-2 font-display text-5xl font-bold uppercase">{profile.teamName}.</h2>
            <p className="mt-2 text-sm text-slate-500">Captain: {profile.captainName} · {profile.email}</p>
          </div>
          <button onClick={logout} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-cyan hover:text-cyan">Sign out</button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-cyan/25 bg-navy p-5 cursor-pointer hover:border-cyan transition-colors" onClick={() => setActiveTab('squad')}>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Roster</p>
            <h3 className="mt-5 font-display text-4xl font-bold uppercase">{profile.members?.length || 0} players</h3>
            <p className="mt-2 text-sm text-slate-500">Manage your squad members.</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-navy p-5 cursor-pointer hover:border-cyan transition-colors" onClick={() => setActiveTab('tournaments')}>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Registrations</p>
            <h3 className="mt-5 font-display text-4xl font-bold uppercase">{profile.registrations?.length || 0} events</h3>
            <p className="mt-2 text-sm text-slate-500">View your tournament entries.</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-navy p-5 cursor-pointer hover:border-cyan transition-colors" onClick={() => setActiveTab('fixtures')}>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">Match Schedule</p>
            <h3 className="mt-5 font-display text-4xl font-bold uppercase">{profile.fixtures?.length || 0} matches</h3>
            <p className="mt-2 text-sm text-slate-500">Track your upcoming games.</p>
          </article>
        </div>

        {activeTab === 'squad' && (
          <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-cyan">Your squad</p>
                <h3 className="mt-1 font-display text-3xl font-bold uppercase">Add players</h3>
              </div>
              <span className="text-xs text-slate-500">Captain manages roster</span>
            </div>
            <form onSubmit={addMember} className="mt-5 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input required placeholder="Player name" value={member.name} onChange={(event) => setMember({ ...member, name: event.target.value })} className="rounded border border-white/10 bg-ink p-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
              <input required type="email" placeholder="Player email" value={member.email} onChange={(event) => setMember({ ...member, email: event.target.value })} className="rounded border border-white/10 bg-ink p-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />
              <button disabled={busy} className="rounded bg-cyan px-4 py-3 text-xs font-black uppercase tracking-widest text-ink">{busy ? "Adding..." : "Add player +"}</button>
            </form>
            {message && <p className="mt-3 text-sm text-cyan">{message}</p>}
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {(profile.members || []).map((item) => (
                <div key={item.email} className="flex justify-between py-3 text-sm">
                  <span>{item.name}</span>
                  <span className="text-slate-500">{item.role} · {item.email}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'tournaments' && (
          <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5 animate-fade-in">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan">My Events</p>
              <h3 className="mt-1 font-display text-3xl font-bold uppercase">Tournament Registrations</h3>
            </div>
            {profile.registrations?.length > 0 ? (
              <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
                {profile.registrations.map(reg => (
                  <div key={reg.tournamentId} className="flex items-center justify-between py-4">
                    <div>
                      <h4 className="font-bold text-lg">{reg.tournamentName}</h4>
                      <p className="text-sm text-slate-400 capitalize">{reg.sport} · {reg.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      reg.status === 'approved' ? 'bg-cyan/10 text-cyan border border-cyan/20' : 
                      reg.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                      'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}>
                      {reg.status || 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">You haven't registered for any tournaments yet. Go to the home page to register.</p>
            )}
          </section>
        )}

        {activeTab === 'fixtures' && (
          <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5 animate-fade-in">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan">Match Schedule</p>
              <h3 className="mt-1 font-display text-3xl font-bold uppercase">Upcoming & Past Matches</h3>
            </div>
            {profile.fixtures?.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {profile.fixtures.map(fixture => (
                  <div key={fixture.id} className="rounded border border-white/10 bg-ink p-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-2">
                      <span className="font-bold text-cyan">{fixture.tournamentName}</span>
                      <span>{fixture.date} · {fixture.time}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-lg font-bold">
                      <span className={fixture.homeTeam === profile.teamName ? 'text-white' : 'text-slate-400'}>{fixture.homeTeam}</span>
                      <span className="text-cyan px-3">{fixture.homeScore} - {fixture.awayScore}</span>
                      <span className={fixture.awayTeam === profile.teamName ? 'text-white' : 'text-slate-400'}>{fixture.awayTeam}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 text-center uppercase tracking-widest">
                      {fixture.status} · {fixture.venue}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">No match fixtures scheduled for your team yet.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}