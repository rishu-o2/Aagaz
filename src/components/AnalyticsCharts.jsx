import { useEffect, useRef } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  BarElement,
  BarController,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  Filler,
} from "chart.js";

Chart.register(
  LineElement, PointElement, LineController,
  BarElement, BarController,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Legend, Tooltip, Filler
);

function useChart(canvasRef, config) {
  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, config);
    return () => chart.destroy();
  }, []);
}

// Registrations over time (last 7 days) - Line chart
function RegistrationsChart({ tournaments }) {
  const canvasRef = useRef(null);

  // Build daily registration counts from tournament registrations
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const labels = days.map(d => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
  const allRegs = tournaments.flatMap(t => t.registrations || []);
  const counts = days.map(day => allRegs.filter(r => r.createdAt?.slice(0, 10) === day).length);

  useChart(canvasRef, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Tournament Registrations",
        data: counts,
        borderColor: "#00d4ff",
        backgroundColor: "rgba(0,212,255,0.1)",
        pointBackgroundColor: "#00d4ff",
        pointRadius: 5,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#94a3b8" } }, tooltip: { mode: "index" } },
      scales: {
        x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#64748b", stepSize: 1 }, grid: { color: "rgba(255,255,255,0.05)" }, beginAtZero: true },
      }
    }
  });

  return (
    <div className="rounded-xl border border-white/10 bg-navy p-5">
      <h4 className="font-display text-2xl font-bold uppercase text-white mb-4">Registrations (7 days)</h4>
      <canvas ref={canvasRef} height={160} />
    </div>
  );
}

// Sport popularity - Doughnut chart
function SportPopularityChart({ tournaments }) {
  const canvasRef = useRef(null);
  const sportCounts = {};
  tournaments.forEach(t => {
    sportCounts[t.sport] = (sportCounts[t.sport] || 0) + (t.registrations?.length || 0);
  });
  const labels = Object.keys(sportCounts);
  const values = Object.values(sportCounts);
  const colors = ["#00d4ff", "#b8ff4a", "#ff2a5f", "#8a2be2", "#ff8c00", "#00ff7f"];

  useChart(canvasRef, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: "#0d1b2a",
        borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom", labels: { color: "#94a3b8", padding: 16, boxWidth: 14 } },
      },
      cutout: "65%",
    }
  });

  return (
    <div className="rounded-xl border border-white/10 bg-navy p-5">
      <h4 className="font-display text-2xl font-bold uppercase text-white mb-4">Sport Popularity</h4>
      {labels.length === 0
        ? <p className="text-sm text-slate-500">No registrations yet.</p>
        : <canvas ref={canvasRef} height={180} />}
    </div>
  );
}

// Member signup trend bar chart
function MemberSignupChart({ members }) {
  const canvasRef = useRef(null);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const labels = days.map(d => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" }));
  const counts = days.map(day => (members || []).filter(m => m.createdAt?.slice(0, 10) === day).length);

  useChart(canvasRef, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Membership Applications",
        data: counts,
        backgroundColor: "rgba(184,255,74,0.7)",
        borderColor: "#b8ff4a",
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "#94a3b8" } } },
      scales: {
        x: { ticks: { color: "#64748b" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#64748b", stepSize: 1 }, grid: { color: "rgba(255,255,255,0.05)" }, beginAtZero: true },
      }
    }
  });

  return (
    <div className="rounded-xl border border-white/10 bg-navy p-5">
      <h4 className="font-display text-2xl font-bold uppercase text-white mb-4">Club Applications (7 days)</h4>
      <canvas ref={canvasRef} height={160} />
    </div>
  );
}

export default function AnalyticsCharts({ tournaments, members, analytics }) {
  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-3xl font-bold uppercase">Analytics</h3>
        <div className="flex gap-4">
          {[
            [analytics?.totalParticipantAccounts ?? 0, "Teams"],
            [analytics?.totalLogins ?? 0, "Logins"],
            [(tournaments ?? []).reduce((sum, t) => sum + (t.registrations?.length || 0), 0), "Entries"],
            [(members ?? []).filter(m => m.status === "pending").length, "Pending"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-lg border border-white/10 bg-navy px-4 py-2 text-center">
              <p className="font-display text-2xl font-black text-cyan">{v}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{l}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <RegistrationsChart tournaments={tournaments ?? []} />
        <SportPopularityChart tournaments={tournaments ?? []} />
        <MemberSignupChart members={members ?? []} />
      </div>
    </section>
  );
}
