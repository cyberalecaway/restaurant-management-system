'use client';

import React, { useState, useMemo } from 'react';
import { Search, Download, Activity, CalendarDays, Users, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Table';
import { mockActivityLogs, ActionType } from '@/lib/mock-data';

const ITEMS_PER_PAGE = 8;

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'Login successful', label: 'Login' },
  { value: 'Updated menu item price', label: 'Menu Update' },
  { value: 'Created order', label: 'Order Created' },
  { value: 'Deactivated user account', label: 'User Deactivated' },
  { value: 'Backup automatic routine', label: 'System Backup' },
  { value: 'Refund request', label: 'Refund' },
  { value: 'Added menu item', label: 'Menu Added' },
  { value: 'Staff account created', label: 'Staff Created' },
  { value: 'Password changed', label: 'Password Changed' },
  { value: 'Logout', label: 'Logout' },
];

const USER_OPTIONS = [
  { value: '', label: 'All Users' },
  { value: 'Admin User', label: 'Admin User' },
  { value: 'Maria Santos', label: 'Maria Santos' },
  { value: 'Juan Dela Cruz', label: 'Juan Dela Cruz' },
  { value: 'Regine Velasquez', label: 'Regine Velasquez' },
  { value: 'System Agent', label: 'System Agent' },
  { value: 'Apolinario Mabini', label: 'Apolinario Mabini' },
];

const ACTION_COLORS: Record<string, string> = {
  'Login successful':        'bg-green-100 text-green-700',
  'Updated menu item price': 'bg-amber-100 text-amber-700',
  'Created order':           'bg-blue-100 text-blue-700',
  'Deactivated user account':'bg-red-100 text-red-700',
  'Backup automatic routine':'bg-gray-100 text-gray-600',
  'Refund request':          'bg-orange-100 text-orange-700',
  'Added menu item':         'bg-purple-100 text-purple-700',
  'Deleted menu item':       'bg-red-100 text-red-700',
  'Staff account created':   'bg-teal-100 text-teal-700',
  'Password changed':        'bg-indigo-100 text-indigo-700',
  'Logout':                  'bg-gray-100 text-gray-500',
};

function exportCSV(data: typeof mockActivityLogs) {
  const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'Details', 'IP Address'];
  const rows = data.map(log => [
    log.id, log.timestamp, log.user, log.userRole, log.action, log.details, log.ipAddress,
  ]);
  const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hba-activity-logs.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ActivityPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() =>
    mockActivityLogs.filter(log => {
      const matchesSearch = !search ||
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase());
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesUser = !userFilter || log.user === userFilter;
      return matchesSearch && matchesAction && matchesUser;
    }), [search, actionFilter, userFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  return (
    <DashboardLayout searchPlaceholder="Search activity logs...">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">System Activity Audit Log</h1>
          <p className="text-sm text-[#9BAAB8] mt-0.5">Complete audit trail of all system operations</p>
        </div>
        <Button variant="outline" onClick={() => exportCSV(filtered)}>
          <Download size={15} /> Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { icon: <Clock size={18} className="text-[#D92F2F]" />, label: "Today's Activities", value: 48, bg: 'bg-red-50' },
          { icon: <Activity size={18} className="text-blue-600" />, label: 'This Week Logs', value: 312, bg: 'bg-blue-50' },
          { icon: <Users size={18} className="text-green-600" />, label: 'Active Users Now', value: 8, bg: 'bg-green-50' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#DDE3E8] rounded-lg p-4 flex items-center gap-3 shadow-sm">
            <div className={`${card.bg} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>{card.icon}</div>
            <div>
              <p className="text-xs text-[#6B7A8D] font-medium">{card.label}</p>
              <p className="text-xl font-bold text-[#1A2332]">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Table */}
      <div className="bg-white border border-[#DDE3E8] rounded-lg shadow-sm">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[#DDE3E8]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search audit logs..."
              className="w-full pl-8 pr-3 py-2 text-sm bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] placeholder:text-[#9BAAB8] text-[#1A2332]"
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] text-[#1A2332] cursor-pointer"
          >
            {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] text-[#1A2332] cursor-pointer"
          >
            {USER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <CalendarDays size={14} className="text-[#9BAAB8]" />
            <span className="text-sm text-[#6B7A8D] font-medium">Today</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F3F6] bg-[#F8FAFC]">
                {['Timestamp', 'User Profile', 'Action', 'Details / Affected Target', 'IP Address'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7A8D] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(log => (
                <tr key={log.id} className="border-b border-[#F0F3F6] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#6B7A8D] whitespace-nowrap font-mono">{log.timestamp}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1E2A2F] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {getInitials(log.user)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1A2332] whitespace-nowrap">{log.user}</p>
                        <p className="text-[10px] text-[#9BAAB8]">{log.userRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#6B7A8D] max-w-[200px]">{log.details}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#9BAAB8] whitespace-nowrap">{log.ipAddress}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#9BAAB8] text-sm">No logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemLabel="log entries"
        />
      </div>
    </DashboardLayout>
  );
}
