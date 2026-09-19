import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import AdminDashboard from "./components/AdminDashboard";
import TeamLogin from "./components/TeamLogin";
import TeamDashboard from "./components/TeamDashboard";
import AccessPortal from "./components/AccessPortal";
import "./styles.css";

const sports = [
  "All sports",
  "Cricket",
  "Football",
  "Badminton",
  "Kabaddi",
  "Basketball",
  "Volleyball",
];

const fallbackData = {
  tournaments: [],
  events: [],
  liveMatches: [],
  gallery: [],
};

const iconForSport = {
  Cricket: "◉",
  Football: "⬡",
  Badminton: "✦",
  Kabaddi: "◆",
  Basketball: "◌",
  Volleyball: "◇",
};

function App() {
  const [data, setData] = useState(fallbackData);
  const [filter, setFilter] = useState("All sports");
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [teamLoginOpen, setTeamLoginOpen] = useState(false);
  const [teamUser, setTeamUser] = useState(null);
  const [loginChoice, setLoginChoice] = useState(null);
  const [accessMode, setAccessMode] = useState(() => localStorage.getItem("aagaz-admin-token") ? "staff" : localStorage.getItem("aagaz-team-token") ? "team" : null);
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem("aagaz-admin-token") || "",
  );

  useEffect(() => {
    fetch("/api/public")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setData)
      .catch(() =>
        setMessage(
          "Showing the latest tournament catalogue. Live data will appear when the server is connected.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const tournaments = useMemo(
    () =>
      filter === "All sports"
        ? data.tournaments
        : data.tournaments.filter((tournament) => tournament.sport === filter),
    [data.tournaments, filter],
  );
  const liveMatches = data.liveMatches.filter((match) => match.isLive);

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  if (!accessMode) return <><AccessPortal onTeamLogin={() => setLoginChoice("team")} onStaffLogin={() => setLoginChoice("staff")} />{loginChoice === "team" && <TeamLogin onClose={() => setLoginChoice(null)} onMessage={setMessage} onLogin={(team) => { setTeamUser(team); setAccessMode("team"); setLoginChoice(null); }} />}{loginChoice === "staff" && <AdminDashboard token={adminToken} onToken={setAdminToken} onAuthenticated={() => { setAccessMode("staff"); setLoginChoice(null); }} onClose={() => setLoginChoice(null)} onMessage={setMessage} />}{message && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-cyan/30 bg-navy px-5 py-4 text-sm text-slate-200">{message}</div>}</>;

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button
            onClick={() => scrollTo("home")}
            className="font-display text-3xl font-black tracking-tight"
          >
            AAGAZ<span className="text-cyan">.</span>
          </button>
          <nav className="hidden items-center gap-5 text-xs font-bold uppercase tracking-[.14em] text-slate-400 md:flex lg:gap-7 lg:tracking-[.16em]">
            <button
              onClick={() => scrollTo("tournaments")}
              className="transition hover:text-cyan"
            >
              Tournaments
            </button>
            <button
              onClick={() => scrollTo("live")}
              className="transition hover:text-cyan"
            >
              Live
            </button>
            <button
              onClick={() => scrollTo("fixtures")}
              className="transition hover:text-cyan"
            >
              Fixtures
            </button>
            <button
              onClick={() => scrollTo("about")}
              className="transition hover:text-cyan"
            >
              How it works
            </button>
          </nav>
          <div className="flex items-center gap-3">
                <button
                  onClick={() => setTeamLoginOpen(true)}
                  className="hidden text-xs font-black uppercase tracking-widest text-slate-400 transition hover:text-cyan sm:block"
                >
                  Team login
                </button>
                <button
              onClick={() => setAdminOpen(true)}
              className="hidden text-xs font-black uppercase tracking-widest text-slate-400 transition hover:text-cyan sm:block"
            >
              Organiser login
            </button>
            <button
              onClick={() => setSelectedTournament(data.tournaments[0])}
              className="rounded-lg bg-cyan px-4 py-2.5 text-xs font-black uppercase tracking-wider text-ink transition hover:bg-white"
            >
              Register to play <span className="ml-1">↗</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section
          id="home"
          className="relative isolate overflow-hidden border-b border-white/10"
        >
          <div className="absolute inset-0 -z-10 bg-grid opacity-60" />
          <div className="absolute -right-48 top-0 -z-10 h-[600px] w-[600px] rounded-full bg-cyan/15 blur-[130px]" />
          <div className="mx-auto grid min-h-[610px] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
            <div>
              <div className="mb-7 flex items-center gap-3 text-xs font-black uppercase tracking-[.28em] text-cyan">
                <span className="h-px w-8 bg-cyan" /> LPU's open sports platform
              </div>
              <h1 className="font-display text-[clamp(4.5rem,12vw,9.5rem)] font-black uppercase leading-[.78] tracking-[-.055em]">
                Play the
                <br />
                <span className="text-cyan">next</span>
                <br />
                big thing.
              </h1>
              <p className="mt-8 max-w-lg text-lg leading-8 text-slate-400">
                Discover tournaments, build your team, and compete in the sports
                events everyone will be talking about.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <button
                  onClick={() => scrollTo("tournaments")}
                  className="rounded-lg bg-cyan px-6 py-4 text-sm font-black uppercase tracking-wider text-ink transition hover:bg-white"
                >
                  Find a tournament <span className="ml-2">↓</span>
                </button>
                <button
                  onClick={() => scrollTo("live")}
                  className="rounded-lg border border-white/20 px-6 py-4 text-sm font-black uppercase tracking-wider transition hover:border-cyan hover:text-cyan"
                >
                  Watch live <span className="ml-2">↗</span>
                </button>
              </div>
            </div>
            <div className="relative hidden min-h-[430px] md:block">
              <div className="absolute right-10 top-4 h-80 w-80 rounded-full border border-cyan/30" />
              <div className="absolute right-24 top-20 h-48 w-48 rounded-full border border-cyan/20" />
              <div className="absolute bottom-6 right-0 w-72 border border-white/10 bg-navy/80 p-5 backdrop-blur-md">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live competition hub</div>
                <p className="mt-4 font-display text-3xl font-bold uppercase">Your next fixture<br /><span className="text-cyan">starts here.</span></p>
                <p className="mt-4 text-xs text-slate-400">Real fixtures will appear after an organiser publishes a tournament schedule.</p>
                <button
                  onClick={() => scrollTo("fixtures")}
                  className="mt-5 text-xs font-black uppercase tracking-widest text-cyan hover:text-white"
                >
                  View fixture ↗
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="live" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mb-9 flex items-end justify-between gap-6">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[.24em] text-cyan">
                Right now
              </p>
              <h2 className="font-display text-6xl font-black uppercase leading-none">
                Live <span className="text-cyan">action.</span>
              </h2>
            </div>
            <button className="hidden text-xs font-black uppercase tracking-widest text-slate-400 hover:text-cyan sm:block">
              View scoreboard ↗
            </button>
          </div>
          {liveMatches.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {liveMatches.map((match) => (
                <LiveCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <Empty label="No matches are live right now. Check the fixtures below." />
          )}
        </section>

        <section
          id="tournaments"
          className="border-y border-white/10 bg-navy/40"
        >
          <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[.24em] text-cyan">
                  Open for entries
                </p>
                <h2 className="font-display text-6xl font-black uppercase leading-none">
                  Choose your <span className="text-cyan">arena.</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setFilter(sport)}
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${filter === sport ? "border-cyan bg-cyan text-ink" : "border-white/15 text-slate-400 hover:border-cyan hover:text-cyan"}`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="py-10 text-slate-500">Loading tournaments...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    onRegister={() => setSelectedTournament(tournament)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="fixtures" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="mb-10">
            <p className="mb-3 text-xs font-black uppercase tracking-[.24em] text-cyan">
              Be there
            </p>
            <h2 className="font-display text-6xl font-black uppercase leading-none">
              Upcoming <span className="text-cyan">fixtures.</span>
            </h2>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {data.events.length ? (
              data.events.map((event) => (
                <div
                  key={event.id}
                  className="grid gap-3 py-6 md:grid-cols-[130px_1fr_auto] md:items-center"
                >
                  <div className="font-display text-3xl font-bold uppercase text-cyan">
                    {new Date(event.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold uppercase">
                      {event.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {event.sport} · {event.venue} · {event.time}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="w-fit rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-300 hover:border-cyan hover:text-cyan"
                  >
                    Register to attend
                  </button>
                </div>
              ))
            ) : (
              <Empty label="Fixtures will appear here once the organisers publish them." />
            )}
          </div>
        </section>

        <section
          id="about"
          className="border-t border-white/10 bg-cyan py-20 text-ink"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1fr_1fr] lg:px-8">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[.24em]">
                How Aagaz works
              </p>
              <h2 className="font-display text-7xl font-black uppercase leading-[.82]">
                From
                <br />
                entry to
                <br />
                <span className="text-white">final.</span>
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Step
                number="01"
                title="Discover"
                copy="Find an open tournament that matches your sport and level."
              />
              <Step
                number="02"
                title="Enter"
                copy="Register as an individual or bring your own team."
              />
              <Step
                number="03"
                title="Compete"
                copy="Track fixtures, results and points as the tournament unfolds."
              />
              <Step
                number="04"
                title="Watch"
                copy="Follow live scores now. Stream the action from home soon."
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span className="font-display text-2xl font-black text-white">
          AAGAZ<span className="text-cyan">.</span>
        </span>
        <span>© 2026 Aagaz · LPU's open tournament platform</span>
        <span className="font-bold uppercase tracking-widest text-slate-400">
          Instagram · YouTube · X
        </span>
      </footer>
      {selectedTournament && (
        <RegistrationModal
          tournament={selectedTournament}
          onClose={() => setSelectedTournament(null)}
          onMessage={setMessage}
        />
      )}
      {selectedEvent && (
        <EventRegistrationModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onMessage={setMessage}
        />
      )}
      {adminOpen && (
        <AdminDashboard
          token={adminToken}
          onToken={setAdminToken}
          onClose={() => setAdminOpen(false)}
          onMessage={setMessage}
          onAuthenticated={() => setAccessMode("staff")}
          onLogout={() => { setAdminToken(""); setAdminOpen(false); setAccessMode(null); }}
        />
      )}
      {teamLoginOpen && (
        <TeamLogin
          onClose={() => setTeamLoginOpen(false)}
          onMessage={setMessage}
          onLogin={(team) => { setTeamUser(team); setTeamLoginOpen(false); }}
        />
      )}
      {teamUser && <TeamDashboard team={teamUser} onLogout={() => { setTeamUser(null); setAccessMode(null); }} />}
      {message && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-cyan/30 bg-navy px-5 py-4 text-sm text-slate-200 shadow-2xl">
          {message}
          <button
            onClick={() => setMessage("")}
            className="float-right ml-4 text-cyan"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function LiveCard({ match }) {
  function openStream() {
    if (match.streamUrl)
      window.open(match.streamUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <article className="rounded-xl border border-cyan/30 bg-navy p-6 shadow-[0_0_45px_rgba(0,212,255,.06)]">
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-2 text-lime">
          <i className="h-2 w-2 animate-pulse rounded-full bg-lime" /> Live ·{" "}
          {match.sport}
        </span>
        <span>{match.period}</span>
      </div>
      <div className="mt-8 space-y-5">
        {[
          [match.home, match.homeScore],
          [match.away, match.awayScore],
        ].map(([team, score]) => (
          <div key={team} className="flex items-center justify-between">
            <span className="font-display text-3xl font-bold uppercase">
              {team}
            </span>
            <strong className="font-display text-5xl text-cyan">{score}</strong>
          </div>
        ))}
      </div>
      <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-4">
        <p className="text-xs text-slate-500">{match.venue}</p>
        {match.streamUrl ? (
          <button
            onClick={openStream}
            className="text-xs font-black uppercase tracking-widest text-cyan hover:text-white"
          >
            Watch live ↗
          </button>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            Stream link pending
          </span>
        )}
      </div>
    </article>
  );
}
function TournamentCard({ tournament, onRegister }) {
  const spots = Math.max(0, tournament.capacity - tournament.registrationCount);
  return (
    <article className="group flex flex-col rounded-xl border border-white/10 bg-ink p-6 transition hover:-translate-y-1 hover:border-cyan/60">
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan/10 text-2xl text-cyan">
          {iconForSport[tournament.sport] || "✦"}
        </span>
        <span className="rounded-full bg-lime/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-lime">
          {spots} spots left
        </span>
      </div>
      <p className="mt-7 text-xs font-bold uppercase tracking-widest text-cyan">
        {tournament.sport} · {tournament.format}
      </p>
      <h3 className="mt-2 font-display text-4xl font-bold uppercase leading-[.9]">
        {tournament.title}
      </h3>
      <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">
        {tournament.description}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-xs">
        <div>
          <span className="block text-slate-600">Dates</span>
          <b>{tournament.dates}</b>
        </div>
        <div>
          <span className="block text-slate-600">Entry</span>
          <b>{tournament.entryFee}</b>
        </div>
        <div>
          <span className="block text-slate-600">Venue</span>
          <b>{tournament.venue}</b>
        </div>
        <div>
          <span className="block text-slate-600">Deadline</span>
          <b>
            {new Date(tournament.deadline).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })}
          </b>
        </div>
      </div>
      <button
        onClick={onRegister}
        className="mt-6 flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-wider transition group-hover:bg-cyan group-hover:text-ink"
      >
        Register to compete <span>↗</span>
      </button>
    </article>
  );
}
function Step({ number, title, copy }) {
  return (
    <div className="border-t border-ink/20 pt-4">
      <span className="text-xs font-black opacity-50">{number}</span>
      <h3 className="mt-5 font-display text-3xl font-bold uppercase">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-ink/65">{copy}</p>
    </div>
  );
}
function Empty({ label }) {
  return (
    <div className="border border-dashed border-white/15 p-8 text-sm text-slate-500">
      {label}
    </div>
  );
}
function RegistrationModal({ tournament, onClose, onMessage }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    course: "",
    entryType: tournament.format.includes("Individual") ? "Individual" : "Team",
    teamName: "",
    phone: "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onMessage(result.message);
      onClose();
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-navy p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">
              Enter tournament
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase">
              {tournament.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-slate-500 hover:text-white"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="mt-7 grid gap-3">
          {[
            ["name", "Full name"],
            ["email", "Email address"],
            ["course", "Course / university"],
            ["phone", "Phone number"],
          ].map(([key, label]) => (
            <input
              key={key}
              required={key !== "phone"}
              type={key === "email" ? "email" : "text"}
              placeholder={label}
              value={form[key]}
              onChange={(event) =>
                setForm({ ...form, [key]: event.target.value })
              }
              className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
            />
          ))}
          {form.entryType === "Team" && (
            <input
              required
              placeholder="Team name"
              value={form.teamName}
              onChange={(event) =>
                setForm({ ...form, teamName: event.target.value })
              }
              className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
            />
          )}
          <button
            disabled={busy}
            className="mt-3 rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50"
          >
            {busy ? "Submitting..." : "Submit entry ↗"}
          </button>
        </form>
      </div>
    </div>
  );
}
function EventRegistrationModal({ event, onClose, onMessage }) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);
  async function submit(submitEvent) {
    submitEvent.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/events/${event.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onMessage(result.message);
      onClose();
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-navy p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">
              Attend fixture
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase">
              {event.title}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {event.venue} · {event.time}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-slate-500 hover:text-white"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="mt-7 grid gap-3">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(inputEvent) =>
              setForm({ ...form, name: inputEvent.target.value })
            }
            className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
          />
          <input
            required
            type="email"
            placeholder="University email"
            value={form.email}
            onChange={(inputEvent) =>
              setForm({ ...form, email: inputEvent.target.value })
            }
            className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
          />
          <button
            disabled={busy}
            className="mt-3 rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink disabled:opacity-50"
          >
            {busy ? "Registering..." : "Reserve my place ↗"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FixtureManager({ events, setEvents, tournaments, onSave, busy }) {
  function updateEvent(id, key, value) {
    setEvents((items) =>
      items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  }
  function addEvent() {
    setEvents((items) => [
      ...items,
      {
        id: `event-${Date.now()}`,
        date: "",
        sport: "Cricket · Open tournament",
        title: "New fixture",
        venue: "LPU Campus",
        time: "",
        registrations: [],
      },
    ]);
  }
  return (
    <section className="mt-6 rounded-xl border border-cyan/20 bg-navy p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cyan">
            Tournament operations
          </p>
          <h3 className="mt-1 font-display text-3xl font-bold uppercase">
            Fixture manager
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addEvent}
            className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan hover:text-cyan"
          >
            Add fixture +
          </button>
          <button
            disabled={busy}
            onClick={() => onSave("/api/admin/events", events, "Fixtures published.")}
            className="rounded-md bg-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-ink disabled:opacity-50"
          >
            Publish fixtures
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {events.map((event) => (
          <div key={event.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4">
            <input
              value={event.title}
              onChange={(inputEvent) => updateEvent(event.id, "title", inputEvent.target.value)}
              className="bg-transparent font-display text-2xl uppercase outline-none"
              placeholder="Teams playing"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={event.date}
                onChange={(inputEvent) => updateEvent(event.id, "date", inputEvent.target.value)}
                className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"
              />
              <input
                value={event.time}
                onChange={(inputEvent) => updateEvent(event.id, "time", inputEvent.target.value)}
                placeholder="6:30 PM"
                className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"
              />
              <input
                value={event.sport}
                onChange={(inputEvent) => updateEvent(event.id, "sport", inputEvent.target.value)}
                placeholder="Sport"
                className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"
              />
              <input
                value={event.venue}
                onChange={(inputEvent) => updateEvent(event.id, "venue", inputEvent.target.value)}
                placeholder="Venue"
                className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"
              />
            </div>
            <select
              value={event.tournamentId || ""}
              onChange={(inputEvent) => updateEvent(event.id, "tournamentId", inputEvent.target.value)}
              className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"
            >
              <option value="">Unlinked fixture</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>{tournament.title}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminPanel({ token, onToken, onClose, onMessage }) {
  const [password, setPassword] = useState("");
  const [adminData, setAdminData] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) loadAdminData(token);
  }, [token]);
  async function loadAdminData(currentToken) {
    const response = await fetch("/api/admin/data", {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!response.ok) {
      localStorage.removeItem("aagaz-admin-token");
      onToken("");
      return;
    }
    const result = await response.json();
    setAdminData(result);
    setLiveMatches(result.liveMatches);
    setTournaments(result.tournaments);
    setEvents(result.events);
  }
  async function login(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      localStorage.setItem("aagaz-admin-token", result.token);
      onToken(result.token);
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(path, payload, label) {
    setBusy(true);
    try {
      const response = await fetch(path, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onMessage(result.message);
      await loadAdminData(token);
    } catch (error) {
      onMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  function updateMatch(id, key, value) {
    setLiveMatches((matches) =>
      matches.map((match) =>
        match.id === id
          ? { ...match, [key]: key.includes("Score") ? Number(value) : value }
          : match,
      ),
    );
  }
  if (!token || !adminData)
    return (
      <div className="fixed inset-0 z-40 grid place-items-center bg-ink/85 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-xl border border-white/15 bg-navy p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan">
                Aagaz control room
              </p>
              <h2 className="mt-2 font-display text-4xl font-bold uppercase">
                Organiser login
              </h2>
            </div>
            <button onClick={onClose} className="text-2xl text-slate-500">
              ×
            </button>
          </div>
          <form onSubmit={login} className="mt-7 grid gap-3">
            <input
              autoFocus
              type="password"
              required
              placeholder="Admin password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
            />
            <button
              disabled={busy}
              className="rounded-lg bg-cyan px-5 py-4 text-sm font-black uppercase tracking-wider text-ink"
            >
              {busy ? "Signing in..." : "Open dashboard ↗"}
            </button>
          </form>
        </div>
      </div>
    );
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/95 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan">
              Private workspace
            </p>
            <h2 className="mt-2 font-display text-5xl font-bold uppercase">
              Control room.
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Publish the data your players and viewers see.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-3xl text-slate-500 hover:text-white"
          >
            ×
          </button>
        </div>
        <FixtureManager
          events={events}
          setEvents={setEvents}
          tournaments={tournaments}
          onSave={save}
          busy={busy}
        />
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-xl border border-white/10 bg-navy p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-3xl font-bold uppercase">
                Live scoreboard
              </h3>
              <button
                disabled={busy}
                onClick={() =>
                  save(
                    "/api/admin/live-matches",
                    liveMatches,
                    "Live scores saved.",
                  )
                }
                className="rounded-md bg-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-ink"
              >
                Save scores
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-600">
                      Home team
                    </label>
                    <input
                      value={match.home}
                      onChange={(event) =>
                        updateMatch(match.id, "home", event.target.value)
                      }
                      className="mt-1 w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-600">
                      Away team
                    </label>
                    <input
                      value={match.away}
                      onChange={(event) =>
                        updateMatch(match.id, "away", event.target.value)
                      }
                      className="mt-1 w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={match.homeScore}
                      onChange={(event) =>
                        updateMatch(match.id, "homeScore", event.target.value)
                      }
                      className="w-16 rounded border border-white/10 bg-navy p-2 text-center outline-none"
                    />
                    <input
                      type="number"
                      value={match.awayScore}
                      onChange={(event) =>
                        updateMatch(match.id, "awayScore", event.target.value)
                      }
                      className="w-16 rounded border border-white/10 bg-navy p-2 text-center outline-none"
                    />
                  </div>
                  <input
                    value={match.streamUrl || ""}
                    onChange={(event) =>
                      updateMatch(match.id, "streamUrl", event.target.value)
                    }
                    placeholder="YouTube or stream URL (optional)"
                    className="rounded border border-white/10 bg-navy p-2 text-sm outline-none sm:col-span-3"
                  />
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-white/10 bg-navy p-5">
            <h3 className="font-display text-3xl font-bold uppercase">
              Tournament entries
            </h3>
            <div className="mt-5 space-y-3">
              {tournaments.flatMap((tournament) =>
                (tournament.registrations || []).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-white/10 bg-ink p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-bold">{entry.name}</p>
                        <p className="text-xs text-slate-500">
                          {entry.teamName || entry.entryType} ·{" "}
                          {tournament.title}
                        </p>
                      </div>
                      <span className="text-xs uppercase tracking-widest text-cyan">
                        {entry.status}
                      </span>
                    </div>
                    {entry.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            save(
                              "/api/admin/tournament-entry-status",
                              { id: entry.id, status: "approved" },
                              "Entry approved.",
                            )
                          }
                          className="rounded bg-lime px-3 py-2 text-[10px] font-black uppercase tracking-widest text-ink"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            save(
                              "/api/admin/tournament-entry-status",
                              { id: entry.id, status: "declined" },
                              "Entry declined.",
                            )
                          }
                          className="rounded border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )),
              )}
            </div>
            {!tournaments.some(
              (tournament) => tournament.registrations?.length,
            ) && (
              <p className="mt-5 text-sm text-slate-500">
                No registrations yet.
              </p>
            )}
          </section>
        </div>
        <section className="mt-6 rounded-xl border border-white/10 bg-navy p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-3xl font-bold uppercase">
              Published tournaments
            </h3>
            <button
              onClick={() =>
                setTournaments([
                  ...tournaments,
                  {
                    id: `tournament-${Date.now()}`,
                    title: "New Aagaz Tournament",
                    sport: "Cricket",
                    format: "Open entry",
                    dates: "",
                    deadline: "",
                    venue: "LPU Campus",
                    entryFee: "TBA",
                    capacity: 16,
                    description: "",
                    registrations: [],
                  },
                ])
              }
              className="rounded-md border border-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan"
            >
              Add tournament +
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4"
              >
                <input
                  value={tournament.title}
                  onChange={(event) =>
                    setTournaments((items) =>
                      items.map((item) =>
                        item.id === tournament.id
                          ? { ...item, title: event.target.value }
                          : item,
                      ),
                    )
                  }
                  className="bg-transparent font-display text-2xl uppercase outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={tournament.sport}
                    onChange={(event) =>
                      setTournaments((items) =>
                        items.map((item) =>
                          item.id === tournament.id
                            ? { ...item, sport: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"
                    placeholder="Sport"
                  />
                  <input
                    value={tournament.entryFee}
                    onChange={(event) =>
                      setTournaments((items) =>
                        items.map((item) =>
                          item.id === tournament.id
                            ? { ...item, entryFee: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"
                    placeholder="Entry fee"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            disabled={busy}
            onClick={() =>
              save(
                "/api/admin/tournaments",
                tournaments,
                "Tournaments published.",
              )
            }
            className="mt-5 rounded-lg bg-cyan px-5 py-3 text-xs font-black uppercase tracking-widest text-ink"
          >
            Publish tournament catalogue ↗
          </button>
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
