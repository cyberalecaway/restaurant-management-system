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
    <header className="bg-white border-b border-[#DDE3E8] px-5 py-3 flex items-center gap-4 sticky top-0 z-40">
      {/* Mobile menu trigger */}
      <MobileSidebar />

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
          <input
            type="text"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] focus:bg-white transition-colors placeholder:text-[#9BAAB8] text-[#1A2332]"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-2 text-[#6B7A8D] hover:bg-gray-100 rounded-md transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#D92F2F] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            5
          </span>
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#DDE3E8]">
          <div className="w-8 h-8 rounded-full bg-[#D92F2F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            AU
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-[#1A2332] leading-tight">Admin User</p>
            <p className="text-[10px] text-[#9BAAB8] leading-tight">System Supervisor</p>
          </div>
        </div>
      </div>
    </header>
  );
}
