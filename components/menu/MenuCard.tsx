'use client';

import React from 'react';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { MenuItem } from '@/lib/mock-data';

const FOOD_EMOJIS: Record<string, string> = {
  'M-001': '🍗', 'M-002': '🍲', 'M-003': '🍜', 'M-004': '🥢',
  'M-005': '🍨', 'M-006': '🥩', 'M-007': '🥘', 'M-008': '🥥',
  'M-009': '🍖', 'M-010': '🥩', 'M-011': '🍮', 'M-012': '🍋',
  'M-013': '🔥', 'M-014': '🍵', 'M-015': '🍦', 'M-016': '🧋',
};

interface MenuCardProps {
  item: MenuItem;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export function MenuCard({ item, onEdit, onDelete, onToggle }: MenuCardProps) {
  const isAvailable = item.availability === 'Available';
  const emoji = FOOD_EMOJIS[item.id] ?? '🍽️';

  return (
    <div className="bg-white border border-[#DDE3E8] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image area */}
      <div className="h-36 bg-gradient-to-br from-[#F4F6F8] to-[#E8EDF2] flex items-center justify-center relative">
        <span className="text-6xl">{emoji}</span>
        {/* Availability badge overlay */}
        <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isAvailable
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {item.availability}
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-[#1A2332] truncate">{item.name}</h3>
        <p className="text-[11px] text-[#9BAAB8] mt-0.5">{item.category}</p>
        <p className="text-base font-bold text-[#D92F2F] mt-1.5">₱{item.price}</p>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#F0F3F6]">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-[#6B7A8D] hover:text-[#1A2332] hover:bg-gray-50 rounded transition-colors border border-[#DDE3E8]"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={() => onToggle(item.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-[#6B7A8D] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors border border-[#DDE3E8]"
            title={isAvailable ? 'Mark as Sold Out' : 'Mark as Available'}
          >
            {isAvailable
              ? <><ToggleRight size={12} /> Active</>
              : <><ToggleLeft size={12} /> Off</>
            }
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="flex items-center justify-center p-1.5 text-[#9BAAB8] hover:text-red-500 hover:bg-red-50 rounded transition-colors border border-[#DDE3E8]"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
