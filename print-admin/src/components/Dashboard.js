import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Search, Bell, ChevronDown, FileText } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const formatDate = (date) => {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};

const getCalendarDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const Dashboard = () => {
  const today = new Date();
  const todayString = formatDate(today);
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [calendarMonth, setCalendarMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [stats, setStats] = useState(null);
  const [printJobs, setPrintJobs] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const requestInFlightRef = useRef(false);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const fetchDashboardData = useCallback(async () => {
    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;
    setLoadError(null);

    try {
      const response = await fetch(`${API_BASE}/api/dashboard?date=${encodeURIComponent(selectedDate)}`);
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const snapshot = await response.json();
      const nextStats = {
        total_jobs: snapshot.total_jobs || 0,
        total_revenue: Number(snapshot.total_revenue || 0),
        pending_jobs: snapshot.pending_jobs || 0,
        completed_jobs: snapshot.completed_jobs || 0,
        online_printers: snapshot.online_printers || 0,
        total_printers: snapshot.total_printers || 0,
        print_activity: snapshot.print_activity || [],
      };

      setStats(nextStats);
      setPrintJobs((snapshot.recent_jobs || []).slice(0, 6));
    } catch (error) {
      console.error(error);
      setLoadError('Unable to load dashboard data.');
    } finally {
      requestInFlightRef.current = false;
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchDashboardData();

    const intervalId = setInterval(() => {
      fetchDashboardData();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [fetchDashboardData]);

  const onlinePrinters = stats ? stats.online_printers : 0;
  const totalPrinters = stats ? stats.total_printers : 0;
  const offlinePrinters = Math.max(totalPrinters - onlinePrinters, 0);
  const recentJobs = printJobs;
  const chartData = (stats && stats.print_activity && stats.print_activity.length > 0)
    ? stats.print_activity
    : [
        { time: 'Pending', val: 0 },
        { time: 'Paid', val: 0 },
        { time: 'Ready', val: 0 },
        { time: 'Completed', val: 0 },
      ];

  const calendarDays = getCalendarDays(calendarMonth);

  return (
    <div className="flex-1 bg-slate-50 p-8 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Overview</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h2>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              className="w-64 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-blue-500/20"
            />
          </div>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 dark:border-slate-900" />
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
        <StatCard icon="📘" title="Total Prints" value={stats ? stats.total_jobs : '--'} trend="Selected date" trendColor="text-slate-400" borderColor="border-blue-500" />
        <StatCard icon="₹" title="Revenue" value={stats ? `₹ ${Number(stats.total_revenue || 0).toFixed(2)}` : '--'} trend="Selected date" trendColor="text-slate-400" borderColor="border-green-500" />
        <StatCard icon="⏳" title="Pending Jobs" value={stats ? stats.pending_jobs : '--'} trend="Selected date" trendColor="text-blue-500" borderColor="border-orange-500" />
        <StatCard icon="🖨️" title="Active Printers" value={`${onlinePrinters} / ${totalPrinters}`} trend={`${onlinePrinters} Online • ${offlinePrinters} Offline`} trendColor="text-slate-400" borderColor="border-purple-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Print Activity</h3>
              <p className="text-sm text-slate-400">{selectedDate}</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => {
                const nextDate = event.target.value;
                if (nextDate) {
                  setSelectedDate(nextDate);
                  const nextMonthDate = new Date(`${nextDate}T00:00:00`);
                  setCalendarMonth(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 1));
                }
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-500/20"
            />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={isDark ? '#334155' : '#e2e8f0'} strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="time" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    color: isDark ? '#e2e8f0' : '#0f172a',
                  }}
                />
                <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
            >
              {'<'}
            </button>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarMonth)}
            </h3>
            <button
              type="button"
              className="text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
            >
              {'>'}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{day}</div>
            ))}
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-10 rounded-lg" />;
              }

              const dateString = formatDate(day);
              const isSelected = dateString === selectedDate;
              const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();

              return (
                <button
                  key={dateString}
                  type="button"
                  onClick={() => setSelectedDate(dateString)}
                  className={`flex h-10 items-center justify-center rounded-lg text-sm transition ${
                    isSelected
                      ? 'bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20'
                      : isCurrentMonth
                        ? 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                        : 'text-slate-300 dark:text-slate-600'
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Recent Print Jobs</h3>
            <button type="button" className="text-sm font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-400">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3">Job ID</th>
                  <th className="px-6 py-3">File Name</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Printer</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-600 dark:text-slate-300">
                {recentJobs.length > 0 ? recentJobs.map((job) => (
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
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-400 dark:text-slate-500">No recent jobs available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, trend, trendColor, borderColor }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${borderColor} border-l-4`}>
    <div className="mb-3 flex items-start justify-between">
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
      <span className="text-xl">{icon}</span>
    </div>
    <h4 className="mb-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</h4>
    <p className={`text-xs ${trendColor} font-medium dark:text-slate-300`}>
      {trend} <span className="text-slate-400 dark:text-slate-500">for selected date</span>
    </p>
  </div>
);

const JobRow = ({ id, name, user, printer, status, time }) => {
  const statusStyles = {
    Completed: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300',
    PRINTING: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    PAID: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
    PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
    READY_TO_PRINT: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    Failed: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  };

  const displayStatus = status === 'READY_TO_PRINT' ? 'Ready' : status === 'PRINTING' ? 'Printing' : status === 'PENDING' ? 'Pending' : status === 'PAID' ? 'Paid' : status === 'Completed' ? 'Completed' : status;

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70">
      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-100">{id}</td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <FileText size={16} className="text-red-500" />
          {name}
        </div>
      </td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{user}</td>
      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{printer}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${statusStyles[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'}`}>
          {displayStatus}
        </span>
      </td>
      <td className="px-6 py-4 text-slate-400 dark:text-slate-500">{time}</td>
    </tr>
  );
};

export default Dashboard;