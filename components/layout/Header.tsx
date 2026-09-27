'use client';

import React, { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import { MobileSidebar } from './Sidebar';

interface HeaderProps {
  searchPlaceholder?: string;
}

export function Header({ searchPlaceholder = 'Search orders, staff, menu items...' }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className="bg-[#fffefa] border-b border-[#e6e2d9] px-3 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 sticky top-0 z-40">
      {/* Mobile menu trigger */}
      <MobileSidebar />

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
      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <button type="button" aria-label="Notifications, 5 unread" className="relative flex h-11 w-11 items-center justify-center text-[#4d5858] hover:bg-[#f3f1ec] rounded-lg transition-colors">
          <Bell size={20} aria-hidden="true" />
          <span aria-hidden="true" className="absolute top-0.5 right-0.5 min-w-5 h-5 px-1 bg-[#D92F2F] text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
            5
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#e6e2d9]">
          <div className="w-10 h-10 rounded-full bg-[#D92F2F] flex items-center justify-center text-white text-sm font-bold flex-shrink-0" aria-hidden="true">
            AU
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[#202b2f] leading-tight">Admin User</p>
            <p className="text-sm text-[#66716e] leading-tight">System Supervisor</p>
          </div>
        </div>
      </div>
    </header>
  );
}
