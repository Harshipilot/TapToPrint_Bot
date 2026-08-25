import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, MoreVertical, RotateCcw, Pause, Trash2 } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const Printers = () => {
  const [printers, setPrinters] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/printers`);
        if (!response.ok) throw new Error('Unable to fetch printers');
        const data = await response.json();
        setPrinters(data);
      } catch (error) {
        console.error(error);
        setLoadError('Unable to load printer data.');
      }
    };

    fetchPrinters();
  }, []);

  const totalPrinters = printers.length;
  const onlineCount = printers.filter((printer) => printer.status === 'ONLINE').length;
  const offlineCount = totalPrinters - onlineCount;
  const queueTotal = printers.reduce((sum, printer) => sum + Number(printer.queue_length || 0), 0);

  return (
    <div className="flex-1 bg-slate-50 p-8 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Fleet</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">Printers</h2>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search printers"
              className="w-64 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-blue-500/20"
            />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Bell size={18} />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white dark:bg-slate-700">A</div>
            <span className="font-semibold text-slate-700 dark:text-slate-200">Admin</span>
            <ChevronDown size={16} className="text-slate-500 dark:text-slate-300" />
          </div>
        </div>
      </header>

      {loadError && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {loadError}
        </div>
      )}

      <div className="mb-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat title="Total Printers" value={totalPrinters} tone="blue" />
        <MiniStat title="Online" value={onlineCount} tone="green" />
        <MiniStat title="Offline" value={offlineCount} tone="red" />
        <MiniStat title="Total Queue" value={queueTotal} tone="purple" />
      </div>

      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Printer Network</h3>
          <button type="button" className="text-sm font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-400">
            Sync status
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-800/70 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Printer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Queue</th>
                <th className="px-6 py-4">Current Job</th>
                <th className="px-6 py-4">Last Seen</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600 dark:text-slate-300">
              {printers.length > 0 ? printers.map((printer) => (
                <tr key={printer.printer_id} className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 font-semibold text-slate-700 dark:text-slate-100">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800">🖨️</span>
                      {printer.printer_id}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${printer.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300'}`}>
                      {printer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{printer.printer_id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-100">{printer.queue_length || 0}</td>
                  <td className="px-6 py-4 text-blue-600 underline decoration-blue-200 underline-offset-4 dark:text-blue-400">{printer.current_job || '—'}</td>
                  <td className="px-6 py-4 text-slate-400 dark:text-slate-500">{printer.last_seen ? new Date(printer.last_seen).toLocaleString() : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">No printers available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-700 dark:text-slate-200">
            Selected Printer Details
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Online</span>
          </h3>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-3xl dark:bg-slate-700">🖨️</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">IP ADDRESS</p>
              <p className="mt-1 font-semibold text-slate-700 dark:text-slate-100">192.168.1.101</p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">LOCATION</p>
              <p className="mt-1 font-semibold text-slate-700 dark:text-slate-100">Office - 1st Floor</p>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/80">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">DRIVER</p>
              <p className="mt-1 font-semibold text-slate-700 dark:text-slate-100">HP LaserJet M2020</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">TOTAL JOBS PRINTED</p>
              <p className="mt-1 font-semibold text-slate-700 dark:text-slate-100">1,245</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500">
              <RotateCcw size={16} /> Restart Printer
            </button>
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400">
              <Pause size={16} /> Pause Printer
            </button>
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400">
              <Trash2 size={16} /> Clear Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniStat = ({ title, value, tone }) => {
  const baseStyles = {
    blue: 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    red: 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
    purple: 'border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${baseStyles[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-current/80">{title}</p>
      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
};

export default Printers;