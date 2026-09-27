'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Clock, Download, RefreshCw, Search, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';

const PAGE_SIZE = 10;
const RECORD_LIMIT = 500;
const ACTION_COLORS: Record<string, string> = {
  'Added menu item': 'bg-purple-100 text-purple-700',
  'Updated menu item': 'bg-amber-100 text-amber-700',
  'Deleted menu item': 'bg-red-100 text-red-700',
  'Created order': 'bg-blue-100 text-blue-700',
  'Changed order status': 'bg-indigo-100 text-indigo-700',
  'Updated user access': 'bg-teal-100 text-teal-700',
};

type ActivityRow = {
  id: string;
  actor_id: string | null;
  action: string;
  details: string;
  created_at: string;
  profiles: { full_name: string; role: string } | null;
};

function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCSV(rows: ActivityRow[]) {
  const headers = ['ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Details'];
  const body = rows.map(row => [row.id, row.created_at, row.profiles?.full_name || row.actor_id || 'System', row.profiles?.role || 'SYSTEM', row.action, row.details]);
  const csv = [headers, ...body].map(row => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'hba-activity-logs.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [now, setNow] = useState(0);
  const online = useOnlineStatus();

  async function loadLogs() {
    setLoading(true);
    setDataError('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('activity_logs')
        .select('id,actor_id,action,details,created_at,profiles!activity_logs_actor_id_fkey(full_name,role)')
        .order('created_at', { ascending: false }).limit(RECORD_LIMIT);
      if (error) throw error;
      setLogs((data ?? []) as unknown as ActivityRow[]);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not load audit records. Check your connection and Supabase setup.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void loadLogs(); }, 0);
    const clockTimer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => { window.clearTimeout(loadTimer); window.clearTimeout(clockTimer); };
  }, []);

  const actions = useMemo(() => Array.from(new Set(logs.map(log => log.action))).sort(), [logs]);
  const users = useMemo(() => Array.from(new Set(logs.map(log => log.profiles?.full_name || log.actor_id || 'System'))).sort(), [logs]);
  const filtered = useMemo(() => logs.filter(log => {
    const name = log.profiles?.full_name || log.actor_id || 'System';
    const matchesSearch = `${name} ${log.action} ${log.details}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    return matchesSearch && (!actionFilter || log.action === actionFilter) && (!userFilter || name === userFilter);
  }), [logs, search, actionFilter, userFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const todayKey = now ? new Date(now).toLocaleDateString('en-CA') : '';
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const todayCount = now ? logs.filter(log => new Date(log.created_at).toLocaleDateString('en-CA') === todayKey).length : 0;
  const weekLogs = logs.filter(log => new Date(log.created_at).getTime() >= weekAgo);
  const uniqueActors = new Set(weekLogs.map(log => log.actor_id).filter(Boolean)).size;

  function getInitials(name: string) {
    return name.split(' ').filter(Boolean).map(word => word[0]).slice(0, 2).join('').toUpperCase() || '?';
  }

  return (
    <DashboardLayout searchPlaceholder="Search activity logs...">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">System Activity Audit Log</h1>
          <p className="mt-0.5 text-sm text-[#9BAAB8]">Recorded changes from the Supabase database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadLogs()} disabled={!online || loading} isLoading={loading}><RefreshCw size={15} /> Refresh</Button>
          <Button variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}><Download size={15} /> Export CSV</Button>
        </div>
      </div>

      {dataError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dataError}</p>}
      {!online && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: showing the records already loaded. Refreshing needs an internet connection.</p>}
      {logs.length === RECORD_LIMIT && <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Showing the newest {RECORD_LIMIT} events.</p>}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: <Clock size={18} className="text-[#D92F2F]" />, label: 'Events Today', value: todayCount, bg: 'bg-red-50' },
          { icon: <Activity size={18} className="text-blue-600" />, label: 'Events This Week', value: weekLogs.length, bg: 'bg-blue-50' },
          { icon: <Users size={18} className="text-green-600" />, label: 'Distinct Actors This Week', value: uniqueActors, bg: 'bg-green-50' },
        ].map(card => <div key={card.label} className="flex items-center gap-3 rounded-lg border border-[#DDE3E8] bg-white p-4 shadow-sm"><div className={`${card.bg} flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg`}>{card.icon}</div><div><p className="text-xs font-medium text-[#6B7A8D]">{card.label}</p><p className="text-xl font-bold text-[#1A2332]">{card.value}</p></div></div>)}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#DDE3E8] bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#DDE3E8] px-5 py-4">
          <label className="relative min-w-[180px] max-w-xs flex-1">
            <span className="sr-only">Search audit events</span><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
            <input type="search" maxLength={160} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search audit events..." className="w-full rounded-md border border-[#DDE3E8] bg-[#F4F6F8] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#D92F2F]" />
          </label>
          <select aria-label="Filter by action" value={actionFilter} onChange={event => { setActionFilter(event.target.value); setPage(1); }} className="rounded-md border border-[#DDE3E8] bg-white px-3 py-2 text-sm outline-none focus:border-[#D92F2F]"><option value="">All Actions</option>{actions.map(action => <option key={action} value={action}>{action}</option>)}</select>
          <select aria-label="Filter by user" value={userFilter} onChange={event => { setUserFilter(event.target.value); setPage(1); }} className="rounded-md border border-[#DDE3E8] bg-white px-3 py-2 text-sm outline-none focus:border-[#D92F2F]"><option value="">All Users</option>{users.map(user => <option key={user} value={user}>{user}</option>)}</select>
          <div className="ml-auto flex items-center gap-2 text-sm font-medium text-[#6B7A8D]"><CalendarDays size={14} /> Live records</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#F0F3F6] bg-[#F8FAFC]">{['Timestamp', 'User Profile', 'Action', 'Details / Affected Target'].map(label => <th key={label} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7A8D]">{label}</th>)}</tr></thead>
            <tbody>
              {paginated.map(log => {
                const user = log.profiles?.full_name || (log.actor_id ? `User ${log.actor_id.slice(0, 8)}` : 'System');
                return <tr key={log.id} className="border-b border-[#F0F3F6] transition-colors hover:bg-[#FAFBFC]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#6B7A8D]">{new Date(log.created_at).toLocaleString('en-PH')}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1E2A2F] text-[10px] font-bold text-white">{getInitials(user)}</div><div><p className="whitespace-nowrap text-xs font-medium text-[#1A2332]">{user}</p><p className="text-[10px] text-[#9BAAB8]">{log.profiles?.role ?? 'System'}</p></div></div></td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>{log.action}</span></td>
                  <td className="max-w-[360px] break-words px-4 py-3 text-xs text-[#6B7A8D]">{log.details}</td>
                </tr>;
              })}
              {!loading && paginated.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-[#9BAAB8]">{dataError ? 'Audit records could not be loaded.' : 'No recorded events match this filter.'}</td></tr>}
              {loading && <tr><td colSpan={4} role="status" className="px-4 py-10 text-center text-sm text-[#9BAAB8]">Loading audit records…</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={PAGE_SIZE} itemLabel="events" />
      </div>
    </DashboardLayout>
  );
}
