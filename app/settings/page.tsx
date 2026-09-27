'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';

interface AccountView {
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  provider: string;
}

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const online = useOnlineStatus();

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Your sign-in could not be verified. Please sign in again.');
        const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name,email,mobile,role,status').eq('id', user.id).maybeSingle();
        if (profileError || !profile) throw new Error('Your HBA profile could not be loaded.');
        const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
        const provider = providers.includes('google') ? 'Google' : providers.includes('email') ? 'Email and password' : 'Supabase sign-in';
        if (active) setAccount({ fullName: profile.full_name || '', email: user.email ?? profile.email ?? '', mobile: profile.mobile ?? '', role: profile.role, status: profile.status, provider });
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load account settings.');
      } finally { if (active) setLoading(false); }
    }
    void loadAccount();
    return () => { active = false; };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online) { setError('Reconnect to the internet before updating your password.'); return; }
    if (password.length < 8 || password.length > 128) { setError('Use a password between 8 and 128 characters.'); return; }
    if (password !== confirmPassword) { setError('The passwords do not match.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword(''); setConfirmPassword(''); setNotice('Your password was updated.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Could not update your password.'); }
    finally { setSaving(false); }
  }

  return <DashboardLayout searchPlaceholder="Search settings...">
    <div className="mb-5"><h1 className="text-2xl font-bold tracking-tight text-[#202b2f]">Account Settings</h1><p className="mt-1 text-base text-[#66716e]">Supabase account details and security.</p></div>
    {loading && <p role="status" className="mb-4 rounded-lg border border-[#e6e2d9] bg-[#fffefa] p-4 text-sm text-[#66716e]">Loading your account...</p>}
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
    {account && <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-5 shadow-sm" aria-labelledby="account-details-heading">
        <h2 id="account-details-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold text-[#202b2f]"><UserRound size={19} className="text-[#c6272e]" /> Account profile</h2>
        <dl className="divide-y divide-[#efede7]">
          {[
            ['Name', account.fullName || 'Not provided'], ['Email', account.email || 'Not provided'], ['Mobile', account.mobile || 'Not provided'],
            ['Role', account.role], ['Account status', account.status], ['Sign-in method', account.provider],
          ].map(([label, value]) => <div key={label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-4"><dt className="text-sm text-[#66716e]">{label}</dt><dd className="break-all text-sm font-medium text-[#202b2f] sm:text-right">{value}</dd></div>)}
        </dl>
        <p className="mt-4 rounded-lg bg-[#f7f6f2] p-3 text-sm leading-6 text-[#66716e]">These values come from the authenticated Supabase user and its existing profile row. Account roles are managed by an administrator.</p>
      </section>

      <section className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-5 shadow-sm" aria-labelledby="account-security-heading">
        <h2 id="account-security-heading" className="mb-1 flex items-center gap-2 text-lg font-semibold text-[#202b2f]"><ShieldCheck size={19} className="text-[#c6272e]" /> Security</h2>
        <p className="mb-4 text-sm text-[#66716e]">Change the password for this Supabase account.</p>
        <form onSubmit={updatePassword} className="space-y-3">
          <label className="block text-sm font-medium text-[#344348]">New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} required className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" /></label>
          <label className="block text-sm font-medium text-[#344348]">Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" /></label>
          <button type="submit" disabled={!online || saving || !password || !confirmPassword} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#c6272e] px-4 text-sm font-semibold text-white hover:bg-[#a82026] disabled:cursor-not-allowed disabled:opacity-50"><KeyRound size={16} />{saving ? 'Updating...' : 'Update password'}</button>
        </form>
        <div className="mt-5 rounded-lg border border-[#e6e2d9] p-3 text-sm leading-6 text-[#66716e]">Notification preferences, active-device lists, two-factor enrollment, and external integrations are not stored or connected in the current database. They are not shown as configurable or active.</div>
      </section>
    </div>}
  </DashboardLayout>;
}
