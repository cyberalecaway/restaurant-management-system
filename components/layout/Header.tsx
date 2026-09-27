'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { MobileSidebar } from './Sidebar';
import type { RmsProfileView } from '@/lib/rms-profile';

interface HeaderProps {
  searchPlaceholder?: string;
  profile: RmsProfileView;
}

export function Header({ searchPlaceholder = 'Search orders, staff, menu items...', profile }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className="bg-[#fffefa] border-b border-[#e6e2d9] px-3 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 sticky top-0 z-40">
      {/* Mobile menu trigger */}
      <MobileSidebar profile={profile} />

      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className="relative">
          <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#778078]" />
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full min-h-11 pl-10 pr-4 py-2 text-base bg-[#f7f6f2] border border-[#e2dfd7] rounded-lg outline-none focus:border-[#D92F2F] focus:bg-white transition-colors placeholder:text-[#727b79] text-[#202b2f]"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center">
        <div className="flex items-center gap-2.5 border-l border-[#e6e2d9] pl-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#D92F2F] text-sm font-bold text-white" aria-hidden="true">
            {profile.avatarUrl ? <Image src={profile.avatarUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : (profile.fullName || profile.email || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="max-w-40 truncate text-sm font-semibold leading-tight text-[#202b2f]">{profile.fullName || profile.email || 'HBA account'}</p>
            <p className="text-sm leading-tight text-[#66716e]">{profile.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
