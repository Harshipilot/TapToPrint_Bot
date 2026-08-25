import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  RefreshCw,
  Search,
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RetrieveFiles = () => {
  const [jobQuery, setJobQuery] = useState('');
  const [jobDetails, setJobDetails] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [searchStatus, setSearchStatus] = useState('idle');

  const fetchRecentJobs = async () => {
    setRecentLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/print_jobs?date=${new Date().toISOString().slice(0, 10)}`);
      if (!response.ok) throw new Error('Unable to load recent jobs');

      const data = await response.json();
      setRecentJobs(Array.isArray(data) ? [...data].slice(0, 6) : []);
    } catch (error) {
      console.error(error);
      setRecentJobs([]);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  const lookupJob = async () => {
    const trimmedQuery = jobQuery.trim();
    if (!trimmedQuery) {
      setJobDetails(null);
      setNotice({ type: 'error', text: 'Please enter a Job ID or file name.' });
      setSearchStatus('error');
      return;
    }

    setLoading(true);
    setNotice(null);
    setSearchStatus('loading');

    try {
      const directResponse = await fetch(`${API_BASE}/api/print_jobs/${encodeURIComponent(trimmedQuery)}`);
      if (directResponse.ok) {
        const matchedJob = await directResponse.json();
        setJobDetails(matchedJob);
        setSearchStatus('success');
        setNotice({ type: 'success', text: `Matched job ${matchedJob.job_id}.` });
        return;
      }

      const dayResponse = await fetch(`${API_BASE}/api/print_jobs?date=${new Date().toISOString().slice(0, 10)}`);
      if (!dayResponse.ok) throw new Error('Unable to search for the requested job.');

      const allJobs = await dayResponse.json();
      const match = (Array.isArray(allJobs) ? allJobs : []).find((job) => {
        const searchTarget = `${job.job_id || ''} ${job.file_name || ''} ${job.user_name || ''}`.toLowerCase();
        return searchTarget.includes(trimmedQuery.toLowerCase());
      });

      if (!match) throw new Error('No job records matched your search.');

      setJobDetails(match);
      setSearchStatus('success');
      setNotice({ type: 'success', text: `Found job ${match.job_id}.` });
    } catch (error) {
      console.error(error);
      setJobDetails(null);
      setSearchStatus('error');
      setNotice({ type: 'error', text: error.message || 'Unable to find the requested job.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const targetId = (jobDetails && jobDetails.job_id) || jobQuery.trim();

    if (!targetId) {
      setNotice({ type: 'error', text: 'Please enter a Job ID before downloading.' });
      setSearchStatus('error');
      return;
    }

    setDownloadLoading(true);
    setNotice({ type: 'info', text: `Preparing download for ${targetId}...` });

    const url = `${API_BASE}/api/download/${encodeURIComponent(targetId)}`;
    window.open(url, '_blank');

    setTimeout(() => {
      setDownloadLoading(false);
      setNotice({ type: 'success', text: `Download started for ${targetId}.` });
    }, 900);
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Files</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">Retrieve Files</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Recover your print jobs securely</p>
        </div>
        <button
          type="button"
          onClick={fetchRecentJobs}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw size={15} className={recentLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Find a print job</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500">Search by Job ID, file name, or user</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <FileText size={12} />
              {searchStatus === 'loading' ? 'Searching' : searchStatus === 'success' ? 'Found' : searchStatus === 'error' ? 'Error' : 'Ready'}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={jobQuery}
                onChange={(event) => setJobQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') lookupJob();
                }}
                placeholder="Enter Job ID or file name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-blue-500/20"
              />
            </div>
            <button
              type="button"
              onClick={lookupJob}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Searching' : 'Search'}
            </button>
          </div>

          {notice && (
            <div
              className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                notice.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : notice.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                    : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
              }`}
            >
              {notice.type === 'success' ? <CheckCircle2 size={18} /> : notice.type === 'error' ? <AlertCircle size={18} /> : <Clock3 size={18} />}
              <span>{notice.text}</span>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/80">
            {jobDetails ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Job Information</p>
                    <h4 className="mt-1 text-xl font-black text-slate-800 dark:text-slate-100">{jobDetails.job_id}</h4>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {jobDetails.status || 'Unknown'}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoPill label="User" value={jobDetails.user_name || `Telegram User ${jobDetails.telegram_user_id || 'N/A'}`} />
                  <InfoPill label="File" value={jobDetails.file_name || 'N/A'} />
                  <InfoPill label="Pages" value={jobDetails.pages || '0'} />
                  <InfoPill label="Copies" value={jobDetails.copies || '0'} />
                  <InfoPill label="Amount" value={jobDetails.amount ? `₹ ${Number(jobDetails.amount).toFixed(2)}` : '₹ 0.00'} />
                  <InfoPill label="Requested" value={formatDateTime(jobDetails.requested_at)} />
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloadLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {downloadLoading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                  {downloadLoading ? 'Preparing download...' : 'Download file'}
                </button>
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                <FileText className="mb-3 text-slate-300 dark:text-slate-600" size={36} />
                <p className="text-base font-semibold text-slate-500 dark:text-slate-300">No job selected</p>
                <p className="mt-1 max-w-sm text-sm">Search for a job ID or file name to preview the document details and download it.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Recent jobs</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500">Today’s retrieved records</p>
            </div>
          </div>

          {recentLoading ? (
            <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">Loading recent jobs...</div>
          ) : recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <button
                  key={job.job_id}
                  type="button"
                  onClick={() => {
                    setJobQuery(job.job_id);
                    setJobDetails(job);
                    setSearchStatus('success');
                    setNotice({ type: 'success', text: `Loaded ${job.job_id}.` });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{job.job_id}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                      {job.status || 'Unknown'}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">{job.file_name || 'Untitled file'}</p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{formatDateTime(job.requested_at)}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
              <FileText className="mb-3 text-slate-300 dark:text-slate-600" size={30} />
              <p className="text-base font-semibold text-slate-500 dark:text-slate-300">No recent jobs</p>
              <p className="mt-1 text-sm">There are no print jobs available for the current date.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const InfoPill = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{value}</p>
  </div>
);

export default RetrieveFiles;