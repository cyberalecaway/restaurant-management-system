import React from 'react';
import { popularItems } from '@/lib/mock-data';

export function PopularItems() {
  return (
    <div className="bg-white border border-[#DDE3E8] rounded-lg shadow-sm">
      <div className="px-5 py-4 border-b border-[#DDE3E8]">
        <h3 className="text-sm font-semibold text-[#1A2332]">Today&apos;s Popular Items</h3>
        <p className="text-xs text-[#9BAAB8] mt-0.5">Most ordered today</p>
      </div>
      <div className="divide-y divide-[#F0F3F6]">
        {popularItems.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3 px-5 py-3.5">
            {/* Rank + emoji */}
            <div className="w-9 h-9 rounded-lg bg-[#F4F6F8] flex items-center justify-center text-lg flex-shrink-0">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#1A2332] truncate">{item.name}</p>
              <p className="text-[10px] text-[#9BAAB8]">{item.orders} orders today</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#D92F2F]">{item.price}</p>
              <p className="text-[10px] text-[#9BAAB8]">#{i + 1} rank</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
