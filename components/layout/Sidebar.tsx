'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Users,
  MessageSquare,
  Activity,
  BarChart3,
  Settings,
  X,
  Menu,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',        href: '/dashboard', icon: <LayoutDashboard size={16} /> },
  { label: 'Menu Management',  href: '/menu',       icon: <UtensilsCrossed size={16} /> },
  { label: 'Orders',           href: '/orders',     icon: <ClipboardList size={16} />,  badge: 14 },
  { label: 'User Management',  href: '/users',      icon: <Users size={16} /> },
  { label: 'Messages',         href: '/messages',   icon: <MessageSquare size={16} />,  badge: 3  },
  { label: 'Activity History', href: '/activity',   icon: <Activity size={16} /> },
  { label: 'Reports',          href: '/reports',    icon: <BarChart3 size={16} /> },
  { label: 'Settings',         href: '/settings',   icon: <Settings size={16} /> },
];

function HBALogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-lg overflow-hidden flex-shrink-0 bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src="/hbatube_logo.png.png"
        alt="HBA Logo"
        width={size}
        height={size}
        className="object-contain w-full h-full"
      />
    </div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <HBALogo size={36} />
          <div>
            <p className="text-white font-bold text-sm leading-tight">HBA RMS</p>
            <p className="text-white/50 text-[10px] leading-tight mt-0.5">V2.4 Branch Admin</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="ml-auto text-white/60 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150
                ${isActive
                  ? 'bg-[#D92F2F] text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="flex-shrink-0 bg-[#D92F2F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {isActive ? null : item.badge}
                </span>
              )}
              {item.badge && !isActive && (
                <span className="absolute" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Admin profile */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#D92F2F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            AU
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-xs font-medium truncate">Admin User</p>
            <p className="text-white/50 text-[10px] truncate">harvey@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[176px] flex-shrink-0 bg-[#1E2A2F] h-screen sticky top-0">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 text-[#1A2332] hover:bg-gray-100 rounded-md"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[200px] bg-[#1E2A2F] flex flex-col">
            <SidebarContent onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
