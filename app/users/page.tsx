'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, ShieldCheck, UserCheck, UserX, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { UserRoleBadge, UserStatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Table';
import { User, UserRole, UserStatus } from '@/lib/domain';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';

const PAGE_SIZE = 10;
const RECORD_LIMIT = 500;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [dataError, setDataError] = useState('');
  const online = useOnlineStatus();

  async function loadUsers() {
    setLoading(true);
    setDataError('');
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id ?? '';
      setCurrentUserId(userId);
      const { data: ownProfile, error: profileError } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (profileError) throw profileError;
      setCanManageUsers(ownProfile?.role === 'ADMIN');
      const { data, error } = await supabase.from('profiles').select('id,full_name,email,mobile,role,status,created_at').order('created_at', { ascending: false }).limit(RECORD_LIMIT);
      if (error) throw error;
      setUsers((data ?? []).map(row => ({
        id: row.id,
        fullName: row.full_name || 'Name not provided',
        email: row.email,
        mobile: row.mobile ?? '',
        role: row.role as UserRole,
        status: row.status as UserStatus,
      })));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not load accounts. Check your connection and Supabase permissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUsers(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => users.filter(user =>
    (userFilter === 'ALL' || user.role === userFilter || user.status === userFilter) &&
    `${user.fullName} ${user.email} ${user.id}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [users, search, userFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(user => user.role === 'ADMIN').length,
    active: users.filter(user => user.status === 'ACTIVE').length,
    inactive: users.filter(user => user.status === 'INACTIVE').length,
  }), [users]);

  async function toggleStatus(user: User) {
    if (!canManageUsers || user.id === currentUserId || !online) return;
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const isLastActiveAdmin = user.role === 'ADMIN' && user.status === 'ACTIVE' && users.filter(candidate => candidate.role === 'ADMIN' && candidate.status === 'ACTIVE').length <= 1;
    if (isLastActiveAdmin) {
      setDataError('The last active administrator cannot be deactivated. Promote another administrator first.');
      return;
    }
    setSavingId(user.id);
    setDataError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id);
      if (error) throw error;
      setUsers(current => current.map(item => item.id === user.id ? { ...item, status: nextStatus } : item));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not update this account.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <DashboardLayout searchPlaceholder="Search accounts...">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">User Management</h1>
          <p className="mt-0.5 text-sm text-[#9BAAB8]">Real Supabase accounts, roles, and access status</p>
        </div>
        <Button variant="outline" onClick={() => void loadUsers()} disabled={!online || loading} isLoading={loading}>
          <RefreshCw size={15} /> Refresh
        </Button>
      </div>

      {dataError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dataError}</p>}
      {!online && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: account records are read-only until the connection returns.</p>}
      {users.length === RECORD_LIMIT && <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Showing the newest {RECORD_LIMIT} accounts. Narrow your search or use database pagination for older records.</p>}
      {!canManageUsers && !loading && <p className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-[#5e6966]">Only an active administrator can change account status. New public registrations receive the customer role.</p>}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: <Users size={18} className="text-[#D92F2F]" />, label: 'Profiles', value: stats.total, bg: 'bg-red-50' },
          { icon: <ShieldCheck size={18} className="text-[#344348]" />, label: 'Admins', value: stats.admins, bg: 'bg-[#ecefeb]' },
          { icon: <UserCheck size={18} className="text-green-700" />, label: 'Active accounts', value: stats.active, bg: 'bg-green-50' },
          { icon: <UserX size={18} className="text-gray-400" />, label: 'Inactive accounts', value: stats.inactive, bg: 'bg-gray-50' },
        ].map(card => <div key={card.label} className="flex items-center gap-3 rounded-lg border border-[#DDE3E8] bg-white p-4 shadow-sm"><div className={`${card.bg} flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg`}>{card.icon}</div><div><p className="text-xs font-medium text-[#6B7A8D]">{card.label}</p><p className="text-xl font-bold text-[#1A2332]">{card.value}</p></div></div>)}
      </div>

      <div className="overflow-hidden rounded-lg border border-[#DDE3E8] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#DDE3E8] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-sm font-semibold text-[#1A2332]">Account Directory</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter accounts">
              {(['ALL', 'ADMIN', 'STAFF', 'CUSTOMER', 'ACTIVE', 'INACTIVE']).map(value => <button key={value} type="button" aria-pressed={userFilter === value} onClick={() => { setUserFilter(value); setPage(1); }} className={`min-h-10 rounded-lg px-3 text-sm font-medium ${userFilter === value ? 'bg-[#202b2f] text-white' : 'text-[#5e6966] hover:bg-[#f7f6f2]'}`}>{value === 'ALL' ? 'All' : value[0] + value.slice(1).toLocaleLowerCase()}</button>)}
            </div>
            <label className="relative">
              <span className="sr-only">Search accounts</span>
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
              <input type="search" maxLength={120} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search accounts..." className="w-48 rounded-md border border-[#DDE3E8] bg-[#F4F6F8] py-2 pl-8 pr-3 text-xs text-[#1A2332] outline-none focus:border-[#D92F2F]" />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#F0F3F6] bg-[#F8FAFC]">{['Profile ID', 'Full Name', 'Email', 'Mobile', 'Role', 'Status', 'Action'].map(label => <th key={label} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B7A8D]">{label}</th>)}</tr></thead>
            <tbody>
              {paginated.map(user => <tr key={user.id} className="border-b border-[#F0F3F6] transition-colors hover:bg-[#FAFBFC]">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#6B7A8D]">{user.id.slice(0, 8)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-[#1A2332]">{user.fullName}</td>
                <td className="px-4 py-3 text-xs text-[#6B7A8D]">{user.email}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[#6B7A8D]">{user.mobile || '—'}</td>
                <td className="px-4 py-3"><UserRoleBadge role={user.role} /></td>
                <td className="px-4 py-3"><UserStatusBadge status={user.status} /></td>
                <td className="px-4 py-3">{canManageUsers && <button type="button" disabled={!online || savingId === user.id || user.id === currentUserId || (user.role === 'ADMIN' && user.status === 'ACTIVE' && stats.admins <= 1)} onClick={() => void toggleStatus(user)} className="rounded border border-[#DDE3E8] px-2.5 py-1 text-xs font-medium text-[#5e6966] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50">{savingId === user.id ? 'Saving…' : user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>}</td>
              </tr>)}
              {!loading && paginated.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#9BAAB8]">{dataError ? 'Accounts could not be loaded.' : 'No accounts match this filter.'}</td></tr>}
              {loading && <tr><td colSpan={7} role="status" className="px-4 py-10 text-center text-sm text-[#9BAAB8]">Loading accounts…</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={filtered.length} itemsPerPage={PAGE_SIZE} itemLabel="accounts" />
      </div>
    </DashboardLayout>
  );
}
