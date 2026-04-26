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
  const onlineCount = printers.filter(p => p.status === 'ONLINE').length;
  const offlineCount = totalPrinters - onlineCount;
  const queueTotal = printers.reduce((sum, printer) => sum + Number(printer.queue_length || 0), 0);

  return (
  <div className="flex-1 bg-[#f8fafc] h-screen p-8">
    <header className="flex justify-between items-center mb-8">
      <h2 className="text-2xl font-bold text-slate-800">Printers</h2>
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 bg-white" />
        </div>
        <Bell className="text-slate-600" size={22} />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-800 rounded-full text-white flex items-center justify-center text-xs">A</div>
          <span className="font-semibold text-slate-700">Admin</span>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>

    {loadError && (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    )}

    <div className="grid grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
        <p className="text-xs text-blue-500 font-bold mb-1">Total Printers</p>
        <p className="text-2xl font-bold">{totalPrinters}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
        <p className="text-xs text-green-500 font-bold mb-1">Online</p>
        <p className="text-2xl font-bold">{onlineCount}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
        <p className="text-xs text-red-500 font-bold mb-1">Offline</p>
        <p className="text-2xl font-bold">{offlineCount}</p>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-center">
        <p className="text-xs text-purple-500 font-bold mb-1">Total Queue</p>
        <p className="text-2xl font-bold">{queueTotal}</p>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-8 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
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
        <tbody className="text-sm text-slate-600">
          {printers.length > 0 ? printers.map(printer => (
            <tr key={printer.printer_id} className="border-b border-slate-50">
              <td className="px-6 py-4 font-semibold flex items-center gap-3">🖨️ {printer.printer_id}</td>
              <td className="px-6 py-4"><span className={`text-xs font-bold uppercase ${printer.status === 'ONLINE' ? 'text-green-500' : 'text-red-500'}`}>{printer.status}</span></td>
              <td className="px-6 py-4">{printer.printer_id}</td>
              <td className="px-6 py-4">{printer.queue_length || 0}</td>
              <td className="px-6 py-4 text-blue-500 font-medium underline">{printer.current_job || '—'}</td>
              <td className="px-6 py-4 text-slate-400">{printer.last_seen ? new Date(printer.last_seen).toLocaleString() : 'N/A'}</td>
              <td className="px-6 py-4"><MoreVertical size={18} className="text-slate-300" /></td>
            </tr>
          )) : (
            <tr>
              <td colSpan="7" className="px-6 py-4 text-center text-slate-400">No printers available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">Selected Printer Details <span className="text-xs text-green-500 font-normal">Online</span></h3>
      <div className="grid grid-cols-3 gap-8">
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-6 rounded-lg text-4xl text-slate-400">🖨️</div>
          <div>
            <p className="text-xs text-slate-400 font-bold">IP ADDRESS</p>
            <p className="font-semibold">192.168.1.101</p>
            <p className="text-xs text-slate-400 font-bold mt-2">LOCATION</p>
            <p className="font-semibold">Office - 1st Floor</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-bold">DRIVER</p>
          <p className="font-semibold">HP LaserJet M2020</p>
          <p className="text-xs text-slate-400 font-bold mt-2">TOTAL JOBS PRINTED</p>
          <p className="font-semibold">1,245</p>
        </div>
        <div className="flex flex-col gap-3">
          <button className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition"><RotateCcw size={16}/> Restart Printer</button>
          <button className="flex items-center justify-center gap-2 bg-orange-500 text-white py-2 rounded-lg font-bold text-sm shadow-lg shadow-orange-100 hover:bg-orange-600 transition"><Pause size={16}/> Pause Printer</button>
          <button className="flex items-center justify-center gap-2 bg-red-500 text-white py-2 rounded-lg font-bold text-sm shadow-lg shadow-red-100 hover:bg-red-600 transition"><Trash2 size={16}/> Clear Queue</button>
        </div>
      </div>
    </div>
  </div>
);
};

export default Printers;