export default function FixtureManager({ events, setEvents, tournaments, onSave, busy }) {
  function updateEvent(id, key, value) {
    setEvents((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  function addEvent() {
    setEvents((items) => [...items, { id: `event-${Date.now()}`, date: "", sport: "Cricket · Open tournament", title: "New fixture", venue: "LPU Campus", time: "", registrations: [] }]);
  }

  return (
    <section className="mt-6 rounded-xl border border-cyan/20 bg-navy p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-widest text-cyan">Tournament operations</p><h3 className="mt-1 font-display text-3xl font-bold uppercase">Fixture manager</h3></div>
        <div className="flex gap-2"><button onClick={addEvent} className="rounded-md border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan hover:text-cyan">Add fixture +</button><button disabled={busy} onClick={() => onSave("/api/admin/events", events, "Fixtures published.")} className="rounded-md bg-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-ink disabled:opacity-50">Publish fixtures</button></div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {events.map((event) => <div key={event.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink p-4">
          <input value={event.title} onChange={(inputEvent) => updateEvent(event.id, "title", inputEvent.target.value)} className="bg-transparent font-display text-2xl uppercase outline-none" placeholder="Teams playing" />
          <div className="grid grid-cols-2 gap-2"><input type="date" value={event.date} onChange={(inputEvent) => updateEvent(event.id, "date", inputEvent.target.value)} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" /><input value={event.time} onChange={(inputEvent) => updateEvent(event.id, "time", inputEvent.target.value)} placeholder="6:30 PM" className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" /><input value={event.sport} onChange={(inputEvent) => updateEvent(event.id, "sport", inputEvent.target.value)} placeholder="Sport" className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" /><input value={event.venue} onChange={(inputEvent) => updateEvent(event.id, "venue", inputEvent.target.value)} placeholder="Venue" className="rounded border border-white/10 bg-navy p-2 text-sm outline-none" /></div>
          <select value={event.tournamentId || ""} onChange={(inputEvent) => updateEvent(event.id, "tournamentId", inputEvent.target.value)} className="rounded border border-white/10 bg-navy p-2 text-sm outline-none"><option value="">Unlinked fixture</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.title}</option>)}</select>
        </div>)}
      </div>
    </section>
  );
}