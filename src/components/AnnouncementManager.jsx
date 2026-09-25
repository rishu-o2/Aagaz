import { useState } from "react";

export default function AnnouncementManager({ announcement, setAnnouncement, onSave, busy }) {
  return (
    <section className="rounded-xl border border-white/10 bg-navy p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-3xl font-bold uppercase">Homepage Banner</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={announcement.active || false}
              onChange={e => setAnnouncement(a => ({ ...a, active: e.target.checked }))}
              className="h-4 w-4 accent-cyan"
            />
            Active
          </label>
          <button
            disabled={busy}
            onClick={() => onSave("/api/admin/announcement", announcement, "Announcement saved.")}
            className="rounded-md bg-cyan px-4 py-2 text-xs font-black uppercase tracking-widest text-ink disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
      <div className="grid gap-3">
        <input
          value={announcement.text || ""}
          onChange={e => setAnnouncement(a => ({ ...a, text: e.target.value }))}
          placeholder="Announcement text — e.g. 🏆 Registrations for Football Cup 2025 are now open!"
          className="rounded-lg border border-white/10 bg-ink px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
          maxLength={200}
        />
        <div className="flex gap-3">
          <select
            value={announcement.type || "info"}
            onChange={e => setAnnouncement(a => ({ ...a, type: e.target.value }))}
            className="rounded-lg border border-white/10 bg-ink px-4 py-2 text-sm outline-none focus:border-cyan"
          >
            <option value="info">🔵 Info</option>
            <option value="success">🟢 Success</option>
            <option value="warning">🟡 Warning</option>
            <option value="urgent">🔴 Urgent</option>
          </select>
          <input
            type="url"
            value={announcement.link || ""}
            onChange={e => setAnnouncement(a => ({ ...a, link: e.target.value }))}
            placeholder="Optional link URL"
            className="flex-1 rounded-lg border border-white/10 bg-ink px-4 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-cyan"
          />
        </div>
        {announcement.active && announcement.text && (
          <div className="mt-2">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Preview:</p>
            <AnnouncementBannerDisplay announcement={announcement} />
          </div>
        )}
      </div>
    </section>
  );
}

// Exported for use on the public homepage
export function AnnouncementBannerDisplay({ announcement }) {
  const [dismissed, setDismissed] = useState(false);
  if (!announcement?.active || !announcement?.text || dismissed) return null;

  const colors = {
    info:    "border-cyan/30 bg-cyan/10 text-cyan",
    success: "border-lime/30 bg-lime/10 text-lime",
    warning: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
    urgent:  "border-red-500/30 bg-red-500/10 text-red-400",
  };
  const cls = colors[announcement.type] || colors.info;

  return (
    <div className={`relative flex items-center justify-between gap-4 rounded-lg border px-5 py-3 text-sm font-bold ${cls}`}>
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="shrink-0 text-lg">
          {announcement.type === "success" ? "✅" : announcement.type === "warning" ? "⚠️" : announcement.type === "urgent" ? "🚨" : "📢"}
        </span>
        <span className="truncate">{announcement.text}</span>
        {announcement.link && (
          <a href={announcement.link} target="_blank" rel="noopener noreferrer" className="shrink-0 underline text-xs opacity-80">
            Learn more ↗
          </a>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-lg opacity-60 hover:opacity-100">×</button>
    </div>
  );
}
