export default function DashboardShell({ roleLabel, name, email, badge, actions, tabs, activeTab, onTabChange, children }) {
  return <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/95 text-white backdrop-blur-sm">
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-ink/95 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-cyan">{roleLabel}</p><h2 className="font-display text-2xl font-bold uppercase leading-none">{name}</h2>{email && <p className="mt-1 text-xs text-slate-500">{email}</p>}</div>
            {badge}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
        <nav className="mt-4 flex gap-0.5 overflow-x-auto">
          {tabs.map((tab) => <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`relative shrink-0 rounded-t-md border-b-2 px-3 py-2 text-[11px] font-black uppercase tracking-widest transition ${activeTab === tab.id ? "border-cyan bg-cyan/5 text-cyan" : "border-transparent text-slate-500 hover:text-white"}`}>
            <span className="hidden sm:inline">{tab.icon} </span>{tab.label}
            {tab.badge > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white">{tab.badge}</span>}
          </button>)}
        </nav>
      </div>
      <main className="mt-6">{children}</main>
    </div>
  </div>;
}
