'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { createClient } from '@/lib/supabase/client';
import { isAdminOnlyRoute } from '@/lib/role-routing.mjs';
import { signOutSupabase } from '@/lib/auth-session';
import type { RmsProfileView } from '@/lib/rms-profile';
import { SignOutDialog } from '@/components/auth/SignOutDialog';

interface DashboardLayoutProps {
  children: React.ReactNode;
  searchPlaceholder?: string;
}

export function DashboardLayout({ children, searchPlaceholder }: DashboardLayoutProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<RmsProfileView | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try {
      await signOutSupabase();
      setLogoutOpen(false);
      router.replace('/login?signedOut=1');
    } catch {
      setLogoutError('We could not sign you out. Check your connection and try again.');
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.replace('/login'); return; }
        const { data: row, error: profileError } = await supabase.from('profiles').select('full_name,role,status').eq('id', user.id).maybeSingle();
        const pathname = window.location.pathname;
        if (profileError || !row || row.status !== 'ACTIVE' || !['ADMIN', 'STAFF'].includes(row.role) || (row.role === 'STAFF' && isAdminOnlyRoute(pathname))) { router.replace(row?.role === 'STAFF' ? '/dashboard' : '/'); return; }
        if (!active) return;
        const metadata = user.user_metadata ?? {};
        const avatarCandidate = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : typeof metadata.picture === 'string' ? metadata.picture : '';
        setProfile({
          fullName: typeof row.full_name === 'string' ? row.full_name : '',
          email: user.email ?? '',
          role: row.role as RmsProfileView['role'],
          avatarUrl: avatarCandidate.startsWith('https://') ? avatarCandidate : null,
        });
      } catch {
        if (active) setProfileError(true);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [router]);

  if (!profile) {
    return <main className="grid min-h-dvh place-items-center bg-[#f6f5f1] p-6 text-center">
      <div className="max-w-md rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-8 shadow-sm">
        <p role={profileError ? 'alert' : 'status'} className="text-sm text-[#5e6966]">{profileError ? 'We could not verify your RMS profile. Check your connection and try again.' : 'Verifying your restaurant access…'}</p>
        {profileError && <Link href="/" className="mt-4 inline-block text-sm font-semibold text-[#a52e35] underline underline-offset-4">Return to HBA Kitchen</Link>}
      </div>
    </main>;
  }

  if (profile.role === 'STAFF') {
    const staffLinks = [
      ['Dashboard', '/dashboard'], ['Menu', '/menu'], ['Orders', '/orders'], ['Messages', '/messages'],
      ['Activity', '/activity'], ['Reports', '/reports'],
    ];
    return <div className="min-h-dvh bg-[#f6f5f1] text-[#202b2f]">
      <header className="border-b border-[#e6e2d9] bg-[#fffefa]">
        <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2.5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#202b2f] text-sm font-bold text-white">HBA</span><div><p className="text-sm font-bold">Staff Workspace</p><p className="text-xs text-[#66716e]">Restaurant operations</p></div></div>
          <nav aria-label="Staff navigation" className="order-3 flex w-full gap-1 overflow-x-auto pb-1 sm:order-none sm:ml-3 sm:w-auto sm:pb-0">{staffLinks.map(([label, href]) => <Link key={href} href={href} className="min-h-10 shrink-0 rounded-md px-3 py-2.5 text-sm font-medium text-[#5e6966] hover:bg-[#f3f1ec] hover:text-[#202b2f]">{label}</Link>)}</nav>
          <div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><p className="max-w-48 truncate text-sm font-semibold">{profile.fullName || profile.email}</p><p className="text-xs text-[#66716e]">STAFF</p></div><button type="button" onClick={() => { setLogoutError(''); setLogoutOpen(true); }} className="min-h-10 rounded-lg border border-[#e2dfd7] px-3 text-sm font-semibold hover:bg-[#f3f1ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a52e35]">Log out</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-7">{children}</main>
      <SignOutDialog open={logoutOpen} pending={signingOut} error={logoutError} onCancel={() => setLogoutOpen(false)} onConfirm={() => { void handleLogout(); }} />
    </div>;
  }

  return (
    <div className="rmsWorkspace flex h-dvh overflow-hidden bg-[#f6f5f1]">
      <Sidebar profile={profile} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header profile={profile} searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
