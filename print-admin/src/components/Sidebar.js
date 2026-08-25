import React from 'react';
import { LayoutDashboard, Printer, CreditCard, FileText, MoonStar, SunMedium } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage, theme, onToggleTheme }) => {
  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'printers', label: 'Printers', icon: <Printer size={18} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={18} /> },
    { id: 'files', label: 'Files', icon: <FileText size={18} /> },
  ];

  const isDark = theme === 'dark';

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-700/80 px-5 py-5 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
          <Printer size={20} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200/80">PrintX</p>
          <h1 className="text-lg font-bold text-white">PrintAdmin</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {menu.map((item) => {
          const active = activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActivePage(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white dark:hover:bg-slate-800/80'
              }`}
            >
              <span className={`rounded-lg p-1.5 ${active ? 'bg-white/10' : 'bg-slate-800 text-slate-300 dark:bg-slate-800 dark:text-slate-200'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-700/80 px-4 py-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <span className="flex items-center gap-2">
            {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </span>
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-200">
            {isDark ? 'On' : 'Off'}
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;