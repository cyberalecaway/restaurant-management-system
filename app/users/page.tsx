'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search, Users, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput, Select } from '@/components/ui/Input';
import { UserStatusBadge, UserRoleBadge } from '@/components/ui/Badge';
import { mockUsers, User, UserRole, UserStatus } from '@/lib/mock-data';

interface NewStaffForm {
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  password: string;
}

const EMPTY: NewStaffForm = { fullName: '', email: '', mobile: '', role: 'STAFF', password: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NewStaffForm>(EMPTY);
  const [formErrors, setFormErrors] = useState<Partial<NewStaffForm>>({});

  const filtered = useMemo(() =>
    users.filter(u =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
    ), [users, search]);

  const stats = useMemo(() => ({
    total:    users.length,
    admins:   users.filter(u => u.role === 'ADMIN').length,
    active:   users.filter(u => u.status === 'ACTIVE').length,
    inactive: users.filter(u => u.status === 'INACTIVE').length,
  }), [users]);

  function set(field: keyof NewStaffForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }));
      setFormErrors(fe => ({ ...fe, [field]: undefined }));
    };
  }

  function validate(): Partial<NewStaffForm> {
    const errs: Partial<NewStaffForm> = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email.';
    if (!form.mobile.trim()) errs.mobile = 'Mobile is required.';
    if (!form.role) errs.role = 'Role is required.';
    if (!form.password || form.password.length < 8) errs.password = 'Minimum 8 characters.';
    return errs;
  }

  function handleAdd() {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const newUser: User = {
      id: `ID-${Math.floor(Math.random() * 100) + 100}`,
      fullName: form.fullName,
      email: form.email,
      mobile: form.mobile,
      role: form.role as UserRole,
      status: 'ACTIVE',
    };
    setUsers(prev => [newUser, ...prev]);
    setModalOpen(false);
    setForm(EMPTY);
  }

  function toggleStatus(id: string) {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: (u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as UserStatus } : u
    ));
  }

  return (
    <DashboardLayout searchPlaceholder="Search personnel...">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">HBA Branch Personnel</h1>
          <p className="text-sm text-[#9BAAB8] mt-0.5">Manage staff accounts and access privileges</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setFormErrors({}); setModalOpen(true); }}>
          <Plus size={15} /> Add Branch Staff
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { icon: <Users size={18} className="text-[#D92F2F]" />, label: 'Total User Profiles', value: stats.total, bg: 'bg-red-50' },
          { icon: <ShieldCheck size={18} className="text-purple-600" />, label: 'Admin Privileges', value: stats.admins, bg: 'bg-purple-50' },
          { icon: <UserCheck size={18} className="text-green-600" />, label: 'Active Staff Members', value: stats.active, bg: 'bg-green-50' },
          { icon: <UserX size={18} className="text-gray-400" />, label: 'Inactive Accounts', value: stats.inactive, bg: 'bg-gray-50' },
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

      {/* Table card */}
      <div className="bg-white border border-[#DDE3E8] rounded-lg shadow-sm">
        {/* Search bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE3E8]">
          <h3 className="text-sm font-semibold text-[#1A2332]">Staff Directory</h3>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search personnel..."
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] placeholder:text-[#9BAAB8] text-[#1A2332] w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F3F6] bg-[#F8FAFC]">
                {['ID', 'Full Name', 'Email Address', 'Mobile No.', 'System Role', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7A8D] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-[#F0F3F6] hover:bg-[#FAFBFC] transition-colors">
                  <td className="px-4 py-3 text-xs font-mono font-semibold text-[#6B7A8D]">{user.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-[#1A2332] whitespace-nowrap">{user.fullName}</td>
                  <td className="px-4 py-3 text-xs text-[#6B7A8D]">{user.email}</td>
                  <td className="px-4 py-3 text-xs text-[#6B7A8D] whitespace-nowrap">{user.mobile}</td>
                  <td className="px-4 py-3"><UserRoleBadge role={user.role} /></td>
                  <td className="px-4 py-3"><UserStatusBadge status={user.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
                        user.status === 'ACTIVE'
                          ? 'text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                          : 'text-green-600 border-green-200 hover:bg-green-50'
                      }`}
                    >
                      {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#9BAAB8] text-sm">No personnel found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Branch Staff"
        subtitle="Create a new staff or admin account"
      >
        <div className="space-y-4">
          <Input label="Full Name" placeholder="e.g. Maria Clara" value={form.fullName} onChange={set('fullName')} error={formErrors.fullName} />
          <Input label="Email Address" type="email" placeholder="e.g. m.clara@hba-bites.ph" value={form.email} onChange={set('email')} error={formErrors.email} />
          <Input label="Mobile Number" type="tel" placeholder="e.g. 09171234567" value={form.mobile} onChange={set('mobile')} error={formErrors.mobile} />
          <Select
            label="System Role"
            value={form.role}
            onChange={set('role') as (e: React.ChangeEvent<HTMLSelectElement>) => void}
            error={formErrors.role}
            options={[{ value: 'STAFF', label: 'Staff' }, { value: 'ADMIN', label: 'Admin' }]}
          />
          <PasswordInput label="Initial Password" placeholder="Minimum 8 characters" value={form.password} onChange={set('password')} error={formErrors.password} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAdd}>Add Staff Member</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
