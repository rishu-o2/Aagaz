import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const sports = ['All sports', 'Cricket', 'Football', 'Badminton', 'Kabaddi', 'Basketball', 'Volleyball'];

const fallbackData = {
  tournaments: [
    { id: 'lpu-premier-league', title: 'Aagaz LPU Premier League', sport: 'Cricket', format: 'T10 · Team entry', dates: '10–18 October 2026', deadline: '2026-10-02', venue: 'LPU Cricket Ground', entryFee: '₹1,500 per team', capacity: 16, registrationCount: 0, description: 'An open campus cricket league for student-led teams.' },
    { id: 'aagaz-five-a-side', title: 'Aagaz 5s Cup', sport: 'Football', format: '5-a-side · Team entry', dates: '25–26 October 2026', deadline: '2026-10-15', venue: 'LPU Main Ground', entryFee: '₹800 per team', capacity: 24, registrationCount: 0, description: 'Fast-paced football for teams ready to own the pitch.' },
    { id: 'aagaz-badminton-open', title: 'Aagaz Badminton Open', sport: 'Badminton', format: 'Singles · Individual entry', dates: '1 November 2026', deadline: '2026-10-25', venue: 'LPU Indoor Stadium', entryFee: '₹150 per player', capacity: 64, registrationCount: 0, description: 'An open singles draw for every level of campus player.' },
  ],
  events: [],
  liveMatches: [],
  gallery: [],
};

const iconForSport = { Cricket: '◉', Football: '⬡', Badminton: '✦', Kabaddi: '◆', Basketball: '◌', Volleyball: '◇' };

function App() {
  const [data, setData] = useState(fallbackData);
  const [filter, setFilter] = useState('All sports');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public').then(response => response.ok ? response.json() : Promise.reject()).then(setData).catch(() => setMessage('Showing the latest tournament catalogue. Live data will appear when the server is connected.')).finally(() => setLoading(false));
  }, []);

  const tournaments = useMemo(() => filter === 'All sports' ? data.tournaments : data.tournaments.filter(tournament => tournament.sport === filter), [data.tournaments, filter]);
  const liveMatches = data.liveMatches.filter(match => match.isLive);

  function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  return <div className="min-h-screen bg-ink text-white">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <button onClick={() => scrollTo('home')} className="font-display text-3xl font-black tracking-tight">AAGAZ<span className="text-cyan">.</span></button>
        <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-[.16em] text-slate-400 lg:flex">
          <button onClick={() => scrollTo('tournaments')} className="transition hover:text-cyan">Tournaments</button>
          <button onClick={() => scrollTo('live')} className="transition hover:text-cyan">Live</button>
          <button onClick={() => scrollTo('fixtures')} className="transition hover:text-cyan">Fixtures</button>
          <button onClick={() => scrollTo('about')} className="transition hover:text-cyan">How it works</button>
        </nav>
        <button onClick={() => setSelectedTournament(data.tournaments[0])} className="rounded-lg bg-cyan px-4 py-2.5 text-xs font-black uppercase tracking-wider text-ink transition hover:bg-white">Register to play <span className="ml-1">↗</span></button>
      </div>
    </header>

    <main>
      <section id="home" className="relative isolate overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
        <div className="absolute -right-48 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-cyan/15 blur-[130px]" />
        <div className="mx-auto grid min-h-[610px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
          <div>
            <div className="mb-7 flex items-center gap-3 text-xs font-black uppercase tracking-[.28em] text-cyan"><span className="h-px w-8 bg-cyan" /> LPU's open sports platform</div>
            <h1 className="font-display text-[clamp(4.5rem,12vw,9.5rem)] font-black uppercase leading-[.78] tracking-[-.055em]">Play the<br /><span className="text-cyan">next</span><br />big thing.</h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-slate-400">Discover tournaments, build your team, and compete in the sports events everyone will be talking about.</p>
            <div className="mt-9 flex flex-wrap gap-3"><button onClick={() => scrollTo('tournaments')} className="rounded-lg bg-cyan px-6 py-4 text-sm font-black uppercase tracking-wider text-ink transition hover:bg-white">Find a tournament <span className="ml-2">↓</span></button><button onClick={() => scrollTo('live')} className="rounded-lg border border-white/20 px-6 py-4 text-sm font-black uppercase tracking-wider transition hover:border-cyan hover:text-cyan">Watch live <span className="ml-2">↗</span></button></div>
          </div>
          <div className="relative hidden min-h-[430px] lg:block"><div className="absolute right-10 top-4 h-80 w-80 rounded-full border border-cyan/30" /><div className="absolute right-24 top-20 h-48 w-48 rounded-full border border-cyan/20" /><div className="absolute bottom-6 right-0 w-72 border border-white/10 bg-navy/80 p-5 backdrop-blur-md"><div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>Next up</span><span className="text-cyan">26 Sep</span></div><p className="mt-4 font-display text-3xl font-bold uppercase">Aagaz Raiders<br /><span className="text-slate-500">vs</span> Campus Panthers</p><p className="mt-4 text-xs text-slate-400">Kabaddi · LPU Indoor Stadium</p></div></div>
        </div>
      </section>

      <section id="live" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-9 flex items-end justify-between gap-6"><div><p className="mb-3 text-xs font-black uppercase tracking-[.24em] text-cyan">Right now</p><h2 className="font-display text-6xl font-black uppercase leading-none">Live <span className="text-cyan">action.</span></h2></div><button className="hidden text-xs font-black uppercase tracking-widest text-slate-400 hover:text-cyan sm:block">View scoreboard ↗</button></div>{liveMatches.length ? <div className="grid gap-4 md:grid-cols-2">{liveMatches.map(match => <LiveCard key={match.id} match={match} />)}</div> : <Empty label="No matches are live right now. Check the fixtures below." />}</section>

      <section id="tournaments" className="border-y border-white/10 bg-navy/40"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-xs font-black uppercase tracking-[.24em] text-cyan">Open for entries</p><h2 className="font-display text-6xl font-black uppercase leading-none">Choose your <span className="text-cyan">arena.</span></h2></div><div className="flex flex-wrap gap-2">{sports.map(sport => <button key={sport} onClick={() => setFilter(sport)} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${filter === sport ? 'border-cyan bg-cyan text-ink' : 'border-white/15 text-slate-400 hover:border-cyan hover:text-cyan'}`}>{sport}</button>)}</div></div>{loading ? <div className="py-10 text-slate-500">Loading tournaments...</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tournaments.map(tournament => <TournamentCard key={tournament.id} tournament={tournament} onRegister={() => setSelectedTournament(tournament)} />)}</div>}</div></section>

      <section id="fixtures" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-10"><p className="mb-3 text-xs font-black uppercase tracking-[.24em] text-cyan">Be there</p><h2 className="font-display text-6xl font-black uppercase leading-none">Upcoming <span className="text-cyan">fixtures.</span></h2></div><div className="divide-y divide-white/10 border-y border-white/10">{data.events.length ? data.events.map(event => <div key={event.id} className="grid gap-3 py-6 md:grid-cols-[130px_1fr_auto] md:items-center"><div className="font-display text-3xl font-bold uppercase text-cyan">{new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div><div><p className="font-display text-2xl font-bold uppercase">{event.title}</p><p className="mt-1 text-sm text-slate-500">{event.sport} · {event.venue} · {event.time}</p></div><button className="w-fit rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-300 hover:border-cyan hover:text-cyan">Register to attend</button></div>) : <Empty label="Fixtures will appear here once the organisers publish them." />}</div></section>

      <section id="about" className="border-t border-white/10 bg-cyan py-20 text-ink"><div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1fr_1fr] lg:px-8"><div><p className="mb-3 text-xs font-black uppercase tracking-[.24em]">How Aagaz works</p><h2 className="font-display text-7xl font-black uppercase leading-[.82]">From<br />entry to<br /><span className="text-white">final.</span></h2></div><div className="grid gap-4 sm:grid-cols-2"><Step number="01" title="Discover" copy="Find an open tournament that matches your sport and level." /><Step number="02" title="Enter" copy="Register as an individual or bring your own team." /><Step number="03" title="Compete" copy="Track fixtures, results and points as the tournament unfolds." /><Step number="04" title="Watch" copy="Follow live scores now. Stream the action from home soon." /></div></div></section>
    </main>
    <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span className="font-display text-2xl font-black text-white">AAGAZ<span className="text-cyan">.</span></span><span>© 2026 Aagaz · LPU's open tournament platform</span><span className="font-bold uppercase tracking-widest text-slate-400">Instagram · YouTube · X</span></footer>
    {selectedTournament && <RegistrationModal tournament={selectedTournament} onClose={() => setSelectedTournament(null)} onMessage={setMessage} />}
    {message && <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-cyan/30 bg-navy px-5 py-4 text-sm text-slate-200 shadow-2xl">{message}<button onClick={() => setMessage('')} className="float-right ml-4 text-cyan">×</button></div>}
  </div>;
}

function LiveCard({ match }) { return <article className="rounded-xl border border-cyan/30 bg-navy p-6 shadow-[0_0_45px_rgba(0,212,255,.06)]"><div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500"><span className="flex items-center gap-2 text-lime"><i className="h-2 w-2 animate-pulse rounded-full bg-lime" /> Live · {match.sport}</span><span>{match.period}</span></div><div className="mt-8 space-y-5">{[[match.home, match.homeScore], [match.away, match.awayScore]].map(([team, score]) => <div key={team} className="flex items-center justify-between"><span className="font-display text-3xl font-bold uppercase">{team}</span><strong className="font-display text-5xl text-cyan">{score}</strong></div>)}</div><p className="mt-7 border-t border-white/10 pt-4 text-xs text-slate-500">{match.venue}</p></article>; }
function TournamentCard({ tournament, onRegister }) { const spots = Math.max(0, tournament.capacity - tournament.registrationCount); return <article className="group flex flex-col rounded-xl border border-white/10 bg-ink p-6 transition hover:-translate-y-1 hover:border-cyan/60"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan/10 text-2xl text-cyan">{iconForSport[tournament.sport] || '✦'}</span><span className="rounded-full bg-lime/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-lime">{spots} spots left</span></div><p className="mt-7 text-xs font-bold uppercase tracking-widest text-cyan">{tournament.sport} · {tournament.format}</p><h3 className="mt-2 font-display text-4xl font-bold uppercase leading-[.9]">{tournament.title}</h3><p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">{tournament.description}</p><div className="mt-6 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-xs"><div><span className="block text-slate-600">Dates</span><b>{tournament.dates}</b></div><div><span className="block text-slate-600">Entry</span><b>{tournament.entryFee}</b></div></div><button onClick={onRegister} className="mt-6 flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-wider transition group-hover:bg-cyan group-hover:text-ink">Register to compete <span>↗</span></button></article>; }
function Step({ number, title, copy }) { return <div className="border-t border-ink/20 pt-4"><span className="text-xs font-black opacity-50">{number}</span><h3 className="mt-5 font-display text-3xl font-bold uppercase">{title}</h3><p className="mt-2 text-sm leading-6 text-ink/65">{copy}</p></div>; }
function Empty({ label }) { return <div className="border border-dashed border-white/15 p-8 text-sm text-slate-500">{label}</div>; }
function RegistrationModal({ tournament, onClose, onMessage }) { const [form, setForm] = useState({ name: '', email: '', course: '', entryType: tournament.format.includes('Individual') ? 'Individual' : 'Team', teamName: '', phone: '' }); const [busy, setBusy] = useState(false); async function submit(event) { event.preventDefault(); setBusy(true); try { const response = await fetch(`/api/tournaments/${tournament.id}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); onMessage(result.message); onClose(); } catch (error) { onMessage(error.message); } finally { setBusy(false); } } return <div className="fixed inset-0 z-40 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-xl border border-white/15 bg-navy p-6 shadow-2xl"><div className="flex items-start justify-between gap-6"><div><p className="text-xs font-black uppercase tracking-widest text-cyan">Enter tournament</p><h2 className="mt-2 font-display text-4xl font-bold uppercase">{tournament.title}</h2></div><button onClick={onClose} className="text-2xl text-slate-500 hover:text-white">×</button></div><form onSubmit={submit} className="mt-7 grid gap-3">{[['name', 'Full name'], ['email', 'Email address'], ['course', 'Course / university'], ['phone', 'Phone number']].map(([key, label]) => <input key={key} required={key !== 'phone'} type={key === 'email' ? 'email' : 'text'} placeholder={label} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />)}{form.entryType === 'Team' && <input required placeholder="Team name" value={form.teamName} onChange={event => setForm({ ...form, teamName: event.target.value })} className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan" />}<button disabled={busy} className="mt-3 rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50">{busy ? 'Submitting...' : 'Submit entry ↗'}</button></form></div></div>; }

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);