import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, Filter, Calendar } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/payments`);
        if (!response.ok) throw new Error('Unable to fetch payments');
        const data = await response.json();
        setPayments(data.reverse().slice(0, 10));
      } catch (error) {
        console.error(error);
        setLoadError('Unable to load payment records.');
      }
    };

    fetchPayments();
  }, []);

  const paymentTotal = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

  return (
  <div className="flex-1 bg-[#f8fafc] h-screen p-8">
    <header className="flex justify-between items-center mb-8">
      <h2 className="text-2xl font-bold text-slate-800">Payments</h2>
      <div className="flex items-center gap-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 bg-white focus:outline-none" />
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

    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-700">Payments Overview</h3>
        <div className="flex items-center gap-2 bg-slate-50 border px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600">
           <Calendar size={14}/> 14 May 2025 - 14 May 2025 <ChevronDown size={14}/>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <PaymentStatCard color="bg-green-500" title="Total Revenue" value={`₹ ${paymentTotal.toFixed(2)}`} icon="💹" />
        <PaymentStatCard color="bg-blue-500" title="Transactions" value={payments.length} icon="📊" />
        <PaymentStatCard color="bg-purple-500" title="Active Status" value="Live" icon="📈" />
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-700">Transactions</h3>
        <div className="flex gap-3">
          <select className="border rounded-lg text-xs px-3 py-2 outline-none font-medium"><option>All Status</option></select>
          <button className="border rounded-lg text-xs px-3 py-2 font-bold flex items-center gap-2"><Filter size={14}/> Filter</button>
        </div>
      </div>
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase">
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
        <tbody className="text-sm">
          {payments.length > 0 ? payments.map(payment => (
            <TransactionRow
              key={payment.payment_id}
              id={payment.payment_id}
              user={payment.user_id ? `User ${payment.user_id}` : 'Unknown'}
              job={`#${payment.job_id}`}
              amount={`₹ ${Number(payment.amount).toFixed(2)}`}
              method={payment.transaction_ref && payment.transaction_ref.includes('LINK') ? 'Razorpay' : 'Manual'}
              status={payment.payment_status || 'Unknown'}
              time={payment.paid_at ? new Date(payment.paid_at).toLocaleString() : 'N/A'}
            />
          )) : (
            <tr>
              <td colSpan="7" className="px-6 py-4 text-center text-slate-400">No payment records found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);
};

const PaymentStatCard = ({ color, title, value, icon }) => (
  <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
    <div className={`${color} text-white w-10 h-10 rounded-lg flex items-center justify-center text-xl`}>{icon}</div>
    <div>
      <p className="text-xs text-slate-400 font-bold uppercase">{title}</p>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  </div>
);

const TransactionRow = ({ id, user, job, amount, method, status, time }) => (
  <tr className="border-b border-slate-50 text-slate-600">
    <td className="px-6 py-4 font-mono font-medium">{id}</td>
    <td className="px-6 py-4 font-semibold">{user}</td>
    <td className="px-6 py-4">{job}</td>
    <td className="px-6 py-4 font-bold">{amount}</td>
    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{method}</td>
    <td className="px-6 py-4">
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${status === 'Success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {status}
      </span>
    </td>
    <td className="px-6 py-4 text-slate-400">{time}</td>
  </tr>
);

export default Payments;