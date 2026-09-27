'use client';

import React, { useState } from 'react';
import { Monitor, Smartphone, Save, Check } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';

type Tab = 'Profile Settings' | 'Security Configuration' | 'System Notifications' | 'Network Integrations';
const TABS: Tab[] = ['Profile Settings', 'Security Configuration', 'System Notifications', 'Network Integrations'];

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface Session {
  id: string;
  name: string;
  device: string;
  status: string;
  icon: React.ReactNode;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-[#D92F2F]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
        style={{ transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Profile Settings');
  const [saved, setSaved] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    fullName: 'Branch Admin One',
    email: 'admin@hba-bites.ph',
    mobile: '+63 917 123 45 67',
    systemLevel: 'BRANCH_SUPERUSER',
  });

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [twoFA, setTwoFA] = useState(true);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: 'email',   label: 'Email Notifications', description: 'Critical system statement archives',         enabled: true  },
    { id: 'sms',     label: 'SMS Alerts',           description: 'Urgent local stock and void reports',        enabled: true  },
    { id: 'orders',  label: 'Order Alerts',         description: 'Real-time notices when orders hit preparing', enabled: false },
    { id: 'staff',   label: 'Staff Messages',       description: 'Direct pings once active thread shift',      enabled: true  },
    { id: 'system',  label: 'System Updates',       description: 'Database auto maintenance notifications',    enabled: false },
  ]);

  function toggleNotification(id: string, value: boolean) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, enabled: value } : n));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const sessions: Session[] = [
    { id: 's1', name: 'Admin Terminal • Mac', device: 'Branch Office • Active Now', status: 'active', icon: <Monitor size={16} className="text-[#D92F2F]" /> },
    { id: 's2', name: 'Kitchen Display • ChromeOS', device: 'Kitchen Station 01', status: 'idle', icon: <Monitor size={16} className="text-blue-500" /> },
    { id: 's3', name: 'Rider Mobile • Android', device: 'On Route Delivery', status: 'active', icon: <Smartphone size={16} className="text-green-500" /> },
  ];

  return (
    <DashboardLayout searchPlaceholder="Search settings...">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-bold text-[#1A2332]">RMS Control Console</h1>
        <p className="text-sm text-[#9BAAB8] mt-0.5">System configuration and account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-[#DDE3E8] rounded-lg p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-[#D92F2F] text-white'
                : 'text-[#6B7A8D] hover:text-[#1A2332] hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Profile Settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Profile form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#F0F3F6]">
                <div className="w-12 h-12 rounded-full bg-[#D92F2F] flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  AU
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A2332]">HBA Manila Supervisor</p>
                  <p className="text-xs text-[#9BAAB8]">Branch Administrator Account</p>
                </div>
              </div>
              <div className="space-y-4">
                <Input
                  label="Full Operational Name"
                  value={profile.fullName}
                  onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                />
                <Input
                  label="Registered Contact Email"
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                />
                <Input
                  label="Mobile Number"
                  value={profile.mobile}
                  onChange={e => setProfile(p => ({ ...p, mobile: e.target.value }))}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#1A2332]">System Level Display</label>
                  <input
                    value={profile.systemLevel}
                    readOnly
                    className="w-full px-3 py-2 text-sm text-[#6B7A8D] bg-[#F8FAFC] border border-[#DDE3E8] rounded-md font-mono"
                  />
                </div>
                <div className="pt-1">
                  <Button onClick={handleSave} className="gap-2">
                    {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
                  </Button>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#1A2332] mb-4 pb-3 border-b border-[#F0F3F6]">Credentials &amp; Security</h3>
              <div className="space-y-4">
                <PasswordInput label="Current Password" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <PasswordInput label="New Password" placeholder="Minimum 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                <div className="flex items-center justify-between py-3 border-t border-[#F0F3F6]">
                  <div>
                    <p className="text-sm font-medium text-[#1A2332]">Two-Factor Authentication (2FA)</p>
                    <p className="text-xs text-[#9BAAB8] mt-0.5">Add an extra layer of security to your account</p>
                  </div>
                  <Toggle enabled={twoFA} onChange={setTwoFA} />
                </div>
                <Button onClick={handleSave} variant="outline">Update Password</Button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Active sessions */}
            <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#1A2332] mb-3 pb-3 border-b border-[#F0F3F6]">Authorized Active Sessions</h3>
              <div className="space-y-3">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-start gap-3 p-3 bg-[#F8FAFC] border border-[#F0F3F6] rounded-lg">
                    <div className="mt-0.5">{s.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1A2332]">{s.name}</p>
                      <p className="text-[10px] text-[#9BAAB8] mt-0.5">{s.device}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.status === 'active' ? 'ACTIVE' : 'IDLE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'System Notifications' && (
        <div className="max-w-xl">
          <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1A2332] mb-1">Notification Matrix</h3>
            <p className="text-xs text-[#9BAAB8] mb-5">Configure how and when you receive system notifications</p>
            <div className="space-y-1">
              {notifications.map((n, i) => (
                <div key={n.id} className={`flex items-center justify-between py-4 ${i < notifications.length - 1 ? 'border-b border-[#F0F3F6]' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-[#1A2332]">{n.label}</p>
                    <p className="text-xs text-[#9BAAB8] mt-0.5">{n.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`text-xs font-semibold ${n.enabled ? 'text-green-600' : 'text-[#9BAAB8]'}`}>
                      {n.enabled ? 'ON' : 'OFF'}
                    </span>
                    <Toggle enabled={n.enabled} onChange={v => toggleNotification(n.id, v)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Security Configuration' && (
        <div className="max-w-xl">
          <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1A2332] mb-4">Security Configuration</h3>
            <div className="space-y-4">
              <PasswordInput label="Current Password" placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <PasswordInput label="New Password" placeholder="Minimum 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <div className="flex items-center justify-between py-3 border-t border-[#F0F3F6]">
                <div>
                  <p className="text-sm font-medium text-[#1A2332]">Two-Factor Authentication (2FA)</p>
                  <p className="text-xs text-[#9BAAB8] mt-0.5">Adds an extra security layer via OTP</p>
                </div>
                <Toggle enabled={twoFA} onChange={setTwoFA} />
              </div>
              <Button onClick={handleSave}>Update Security</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Network Integrations' && (
        <div className="max-w-xl">
          <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[#1A2332] mb-1">Network Integrations</h3>
            <p className="text-xs text-[#9BAAB8] mb-5">Configure external service connections</p>
            <div className="space-y-3">
              {[
                { name: 'POS Terminal Sync', status: 'Connected', color: 'text-green-600 bg-green-50 border-green-200' },
                { name: 'Kitchen Display System', status: 'Connected', color: 'text-green-600 bg-green-50 border-green-200' },
                { name: 'SMS Gateway (DITO)', status: 'Configured', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                { name: 'Email Server (SMTP)', status: 'Connected', color: 'text-green-600 bg-green-50 border-green-200' },
                { name: 'Cloud Backup (S3)', status: 'Active', color: 'text-green-600 bg-green-50 border-green-200' },
                { name: 'Analytics Webhook', status: 'Inactive', color: 'text-gray-500 bg-gray-50 border-gray-200' },
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-[#F8FAFC] border border-[#F0F3F6] rounded-lg">
                  <p className="text-sm font-medium text-[#1A2332]">{item.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
