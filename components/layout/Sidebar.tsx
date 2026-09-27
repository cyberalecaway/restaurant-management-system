'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Activity, BookOpen, LayoutDashboard, Menu, Package, Settings, Users, X, BarChart3, LogOut } from 'lucide-react';
import { setLocalAuthIndicator, signOutSupabase } from '@/lib/auth-session';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Menu Management', href: '/menu', icon: BookOpen },
  { label: 'Orders', href: '/orders', icon: Package, badge: '14' },
  { label: 'User Management', href: '/users', icon: Users },
  { label: 'Activity History', href: '/activity', icon: Activity },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOutSupabase();
    } catch {
      // Clear the client-side indicator even if Supabase is unreachable.
      setLocalAuthIndicator(false);
    }
    onNavigate?.();
    router.push('/login');
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
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={`group flex min-h-12 items-center gap-3 rounded-lg border-l-[3px] px-3 text-[15px] font-medium transition-colors ${active ? 'border-[#e13b3b] bg-white/10 text-white' : 'border-transparent text-white/75 hover:bg-white/8 hover:text-white'}`}>
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {badge && <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white">{badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3 px-1 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d92f2f] text-sm font-bold">AU</div>
          <div className="min-w-0"><p className="text-sm font-semibold">Admin User</p><p className="truncate text-sm text-white/65">System Supervisor</p></div>
        </div>
        <button type="button" onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"><LogOut size={18} aria-hidden="true" /> Log out</button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return <aside className="hidden h-screen w-[248px] shrink-0 border-r border-white/10 lg:sticky lg:top-0 lg:block"><SidebarContent /></aside>;
}

export function MobileSidebar() {
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
        <SidebarContent onNavigate={() => setOpen(false)} />
      </aside>
    </div>}
  </>;
}
