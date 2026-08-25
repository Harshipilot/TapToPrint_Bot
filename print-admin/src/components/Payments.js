import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Calendar,
  RefreshCw,
  Filter,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDateLabel = (isoDate, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!isoDate) return 'N/A';
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', options);
};

const normalizeStatus = (value) => String(value || '').toUpperCase();

const Payments = () => {
  const today = new Date();
  const initialMonth = today.toISOString().slice(0, 7);
  const initialDate = today.toISOString().slice(0, 10);

  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (selectedDate) {
        params.set('date', selectedDate);
      }

      const response = await fetch(`${API_BASE}/api/payments?${params.toString()}`);
      if (!response.ok) throw new Error('Unable to fetch payment records.');

      const data = await response.json();
      setPayments(Array.isArray(data) ? [...data].reverse() : []);
    } catch (error) {
      console.error(error);
      setPayments([]);
      setLoadError('Unable to load payment records for the selected period.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedDate]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let rows = [...payments];

    if (term) {
      rows = rows.filter((payment) => {
        const haystack = [
          payment.payment_id,
          payment.job_id,
          payment.user_id,
          payment.user_name,
          payment.file_name,
          payment.transaction_ref,
        ].filter(Boolean).join(' ').toLowerCase();

        return haystack.includes(term);
      });
    }

    if (statusFilter !== 'all') {
      rows = rows.filter((payment) => normalizeStatus(payment.payment_status) === statusFilter.toUpperCase());
    }

    return rows;
  }, [payments, searchTerm, statusFilter]);

  const totalRevenue = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const totalTransactions = filteredPayments.length;
  const successfulPayments = filteredPayments.filter((payment) => normalizeStatus(payment.payment_status) === 'SUCCESS').length;
  const pendingFailedPayments = filteredPayments.filter((payment) => {
    const status = normalizeStatus(payment.payment_status);
    return ['PENDING', 'FAILED', 'CANCELLED', 'REJECTED'].includes(status);
  }).length;

  const trendData = useMemo(() => {
    const buckets = {};

    payments.forEach((payment) => {
      const dayKey = payment.paid_at ? payment.paid_at.slice(0, 10) : 'unknown';
      if (!buckets[dayKey]) {
        buckets[dayKey] = { label: formatDateLabel(dayKey, { month: 'short', day: 'numeric' }), revenue: 0, transactions: 0 };
      }
      buckets[dayKey].revenue += Number(payment.amount || 0);
      buckets[dayKey].transactions += 1;
    });

    return Object.values(buckets).sort((a, b) => a.label.localeCompare(b.label));
  }, [payments]);

  const selectedMonthLabel = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const rangeLabel = selectedDate
    ? `Showing ${formatDateLabel(selectedDate, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : `Showing ${selectedMonthLabel}`;

  const handleMonthChange = (monthValue) => {
    setSelectedMonth(monthValue);
    setSelectedDate((currentDate) => {
      if (!currentDate || !currentDate.startsWith(monthValue)) {
        return `${monthValue}-01`;
      }
      return currentDate;
    });
  };

  const handleDateChange = (dateValue) => {
    setSelectedDate(dateValue);
    setSelectedMonth(dateValue ? dateValue.slice(0, 7) : selectedMonth);
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <header className="mb-8 flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Finance</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">Payments</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Financial activity overview</p>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search payments"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-64 rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-blue-500/20"
            />
          </div>
          <button
            type="button"
            onClick={fetchPayments}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
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

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Payments Overview</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{rangeLabel}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-500/20"
              />
            </div>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => handleDateChange(event.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <PaymentStatCard color="bg-gradient-to-br from-emerald-500 to-green-600" title="Total Revenue" value={formatCurrency(totalRevenue)} icon="💹" />
          <PaymentStatCard color="bg-gradient-to-br from-blue-500 to-indigo-600" title="Total Transactions" value={String(totalTransactions)} icon="📊" />
          <PaymentStatCard color="bg-gradient-to-br from-violet-500 to-purple-600" title="Successful Payments" value={String(successfulPayments)} icon="✅" />
          <PaymentStatCard color="bg-gradient-to-br from-amber-500 to-orange-500" title="Pending/Failed" value={String(pendingFailedPayments)} icon="⚠️" />
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Revenue & Transactions</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500">Selected period trend</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <TrendingUp size={12} />
            Live trend
          </div>
        </div>

        <div className="h-64 w-full">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="transactionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={darkMode ? '#334155' : '#e2e8f0'} strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: darkMode ? '#cbd5e1' : '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: darkMode ? '#cbd5e1' : '#64748b' }} />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'revenue' ? [formatCurrency(value), 'Revenue'] : [value, 'Transactions']
                  }
                  contentStyle={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    color: darkMode ? '#e2e8f0' : '#0f172a',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} fill="url(#revenueFill)" />
                <Area type="monotone" dataKey="transactions" stroke="#3b82f6" strokeWidth={2.5} fill="url(#transactionFill)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
              No transaction data for the selected period.
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Transactions</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500">{filteredPayments.length} matching records</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={15} />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-500/20"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:bg-slate-800/70 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">Payment ID</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Time</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                    Loading payment data...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <TransactionRow
                    key={payment.payment_id}
                    id={payment.payment_id}
                    user={payment.user_name || (payment.user_id ? `User ${payment.user_id}` : 'Unknown')}
                    job={payment.job_id ? `#${payment.job_id}` : 'N/A'}
                    amount={formatCurrency(payment.amount)}
                    method={payment.transaction_ref?.includes('LINK') || payment.transaction_ref?.includes('RAZORPAY') ? 'Razorpay' : 'Manual'}
                    status={payment.payment_status || 'Unknown'}
                    time={payment.paid_at ? formatDateLabel(payment.paid_at.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                    {payments.length === 0 ? 'No payment records were found for this period.' : 'No records match your current search and filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PaymentStatCard = ({ color, title, value, icon }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-800/80">
    <div className={`${color} flex h-12 w-12 items-center justify-center rounded-xl text-xl text-white shadow-sm`}>{icon}</div>
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-black text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

const TransactionRow = ({ id, user, job, amount, method, status, time }) => (
  <tr className="border-b border-slate-100 text-sm text-slate-600 last:border-b-0 dark:border-slate-800 dark:text-slate-300">
    <td className="px-6 py-4 font-mono font-semibold text-slate-700 dark:text-slate-100">{id}</td>
    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-100">{user}</td>
    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{job}</td>
    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">{amount}</td>
    <td className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">{method}</td>
    <td className="px-6 py-4">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${
          normalizeStatus(status) === 'SUCCESS'
            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
            : normalizeStatus(status) === 'PENDING'
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'
              : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300'
        }`}
      >
        {status}
      </span>
    </td>
    <td className="px-6 py-4 text-slate-400 dark:text-slate-500">{time}</td>
  </tr>
);

export default Payments;