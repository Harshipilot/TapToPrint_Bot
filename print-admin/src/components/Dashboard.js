import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Bell, ChevronDown, FileText } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [printJobs, setPrintJobs] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, jobsRes, printersRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats`),
          fetch(`${API_BASE}/api/print_jobs`),
          fetch(`${API_BASE}/api/printers`)
        ]);

        if (!statsRes.ok || !jobsRes.ok || !printersRes.ok) {
          throw new Error('Failed to load dashboard data');
        }

        const [statsData, jobsData, printersData] = await Promise.all([
          statsRes.json(),
          jobsRes.json(),
          printersRes.json()
        ]);

        setStats(statsData);
        setPrintJobs(jobsData.reverse().slice(0, 6));
        setPrinters(printersData);
      } catch (error) {
        console.error(error);
        setLoadError('Unable to load dashboard data.');
      }
    };

    fetchData();
  }, []);

  const onlinePrinters = printers.filter(p => p.status === 'ONLINE').length;
  const offlinePrinters = printers.length - onlinePrinters;
  const recentJobs = printJobs;
  const chartData = [
    { time: 'Pending', val: recentJobs.filter(j => j.status === 'PENDING').length },
    { time: 'Paid', val: recentJobs.filter(j => j.status === 'PAID').length },
    { time: 'Ready', val: recentJobs.filter(j => j.status === 'READY_TO_PRINT').length },
    { time: 'Completed', val: recentJobs.filter(j => j.status === 'COMPLETED').length }
  ];
  return (
    <div className="flex-1 bg-[#f8fafc] h-screen overflow-y-auto p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-400 text-sm">Welcome back, Admin!</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div className="relative">
            <Bell className="text-slate-600 cursor-pointer" size={22} />
            <span className="absolute -top-1 -right-1 bg-red-500 w-2 h-2 rounded-full border-2 border-white"></span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs">A</div>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard icon="📘" title="Total Prints" value={stats ? stats.total_jobs : '--'} trend="Live from PrintX" trendColor="text-slate-400" borderColor="border-blue-500" />
        <StatCard icon="₹" title="Revenue" value={stats ? `₹ ${stats.total_revenue.toFixed(2)}` : '--'} trend="Live from PrintX" trendColor="text-slate-400" borderColor="border-green-500" />
        <StatCard icon="⏳" title="Pending Jobs" value={stats ? stats.pending_jobs : '--'} trend="Live queue" trendColor="text-blue-500" borderColor="border-orange-500" />
        <StatCard icon="🖨️" title="Active Printers" value={`${onlinePrinters} / ${printers.length}`} trend={`${onlinePrinters} Online • ${offlinePrinters} Offline`} trendColor="text-slate-400" borderColor="border-purple-500" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Graph Section */}
        <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-700">Print Activity (Today)</h3>
            <select className="text-xs border rounded px-2 py-1 outline-none"><option>Today</option></select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <button className="text-slate-400">{'<'}</button>
            <h3 className="font-bold text-slate-700">May 2025</h3>
            <button className="text-slate-400">{'>'}</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400 mb-2">{d}</div>)}
            {Array.from({length: 31}).map((_, i) => (
              <div key={i} className={`text-sm py-2 rounded-lg cursor-pointer ${i + 1 === 14 ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Table Section */}
        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Recent Print Jobs</h3>
            <button className="text-blue-600 text-sm font-medium">View All</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-xs font-medium uppercase">
              <tr>
                <th className="px-6 py-3">Job ID</th>
                <th className="px-6 py-3">File Name</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Printer</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-600">
            {recentJobs.length > 0 ? recentJobs.map(job => (
              <JobRow
                key={job.job_id}
                id={job.job_id}
                name={job.file_name}
                user={job.user_name || `User ${job.telegram_user_id}`}
                printer={job.printer_id || 'Unknown'}
                status={job.status || 'Unknown'}
                time={job.requested_at ? new Date(job.requested_at).toLocaleString() : 'N/A'}
              />
            )) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-slate-400">No recent jobs available</td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, trend, trendColor, borderColor }) => (
  <div className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${borderColor} border border-slate-100`}>
    <div className="flex justify-between items-start mb-2">
      <span className="text-slate-400 text-sm font-medium">{title}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <h4 className="text-2xl font-bold text-slate-800 mb-1">{value}</h4>
    <p className={`text-xs ${trendColor} font-medium`}>{trend} <span className="text-slate-400 font-normal">from yesterday</span></p>
  </div>
);

const JobRow = ({ id, name, user, printer, status, time }) => {
  const statusStyles = {
    'Completed': 'bg-green-100 text-green-600',
    'Printing': 'bg-blue-100 text-blue-600',
    'In Queue': 'bg-orange-100 text-orange-600',
    'Failed': 'bg-red-100 text-red-600'
  };
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50">
      <td className="px-6 py-4 font-medium">{id}</td>
      <td className="px-6 py-4 flex items-center gap-2"><FileText size={16} className="text-red-500" /> {name}</td>
      <td className="px-6 py-4">{user}</td>
      <td className="px-6 py-4">{printer}</td>
      <td className="px-6 py-4">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyles[status]}`}>{status}</span>
      </td>
      <td className="px-6 py-4 text-slate-400">{time}</td>
    </tr>
  );
};

export default Dashboard;