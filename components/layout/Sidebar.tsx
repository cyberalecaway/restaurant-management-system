'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Activity, BookOpen, LayoutDashboard, Menu, Package, Settings, Users, X, BarChart3, LogOut, MessageCircle, Boxes } from 'lucide-react';
import { signOutSupabase } from '@/lib/auth-session';
import type { RmsProfileView } from '@/lib/rms-profile';
import { SignOutDialog } from '@/components/auth/SignOutDialog';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Menu Management', href: '/menu', icon: BookOpen },
  { label: 'Orders', href: '/orders', icon: Package },
  { label: 'User Management', href: '/users', icon: Users, adminOnly: true },
  { label: 'Messages', href: '/messages', icon: MessageCircle },
  { label: 'Activity History', href: '/activity', icon: Activity },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Inventory / Stock', href: '/inventory', icon: Boxes, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

function SidebarContent({ profile, onNavigate }: { profile: RmsProfileView; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try {
      await signOutSupabase();
      setLogoutOpen(false);
      onNavigate?.();
      router.replace('/login?signedOut=1');
    } catch {
      setLogoutError('We could not sign you out. Check your connection and try again.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#202b2f] text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
          <Image src="/hbatube_logo.png.png" alt="HBA Restaurant" width={40} height={40} className="h-full w-full object-contain" priority />
        </div>
        <div>
          <p className="text-base font-bold tracking-wide">HBA Kitchen</p>
          <p className="text-sm text-white/70">Restaurant operations</p>
        </div>
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-6">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">Workspace</p>
        {navItems.filter(item => !item.adminOnly || profile.role === 'ADMIN').map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={`group flex min-h-12 items-center gap-3 rounded-lg border-l-[3px] px-3 text-[15px] font-medium transition-colors ${active ? 'border-[#e13b3b] bg-white/10 text-white' : 'border-transparent text-white/75 hover:bg-white/8 hover:text-white'}`}>
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 px-1 pb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d92f2f] text-sm font-bold">
            {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : (profile.fullName || profile.email || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{profile.fullName || profile.email || 'HBA account'}</p><p className="truncate text-sm text-white/65">{profile.role}</p></div>
        </div>
        <button type="button" onClick={() => { setLogoutError(''); setLogoutOpen(true); }} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><LogOut size={18} aria-hidden="true" /> Log out</button>
      </div>
      <SignOutDialog open={logoutOpen} pending={signingOut} error={logoutError} onCancel={() => setLogoutOpen(false)} onConfirm={() => { void handleLogout(); }} />
    </div>
  );
}

export function Sidebar({ profile }: { profile: RmsProfileView }) {
  return <aside className="hidden h-screen w-[248px] shrink-0 border-r border-white/10 lg:sticky lg:top-0 lg:block"><SidebarContent profile={profile} /></aside>;
}

export function MobileSidebar({ profile }: { profile: RmsProfileView }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-label="Open navigation menu" aria-expanded={open} aria-controls="mobile-navigation" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#263238] hover:bg-[#f3f1ec] lg:hidden"><Menu size={22} /></button>
    {open && <div className="fixed inset-0 z-[60] lg:hidden">
      <button type="button" aria-label="Close navigation menu" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="absolute inset-0 cursor-default bg-black/50" />
      <aside id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Main navigation" className="relative z-10 h-full w-[min(86vw,300px)] shadow-2xl">
        <button type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} aria-label="Close navigation menu" className="absolute right-3 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10"><X size={21} /></button>
        <SidebarContent profile={profile} onNavigate={() => setOpen(false)} />
      </aside>
    </div>}
  </>;
}
