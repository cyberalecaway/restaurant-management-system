'use client';

import React from 'react';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { MenuItem } from '@/lib/domain';
import { MenuPhoto } from './MenuPhoto';

interface MenuCardProps { item: MenuItem; onEdit: (item: MenuItem) => void; onDelete: (id: string) => void; onToggle: (id: string) => void; }

export function MenuCard({ item, onEdit, onDelete, onToggle }: MenuCardProps) {
  const isAvailable = item.availability === 'Available';

  return <article className="overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-[0_2px_10px_rgba(32,43,47,0.04)] transition-shadow hover:shadow-md">
    <div className="relative h-40 bg-[#efede7]">
      <MenuPhoto source={item.image} alt={`${item.name} dish`} sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover" fallbackClassName="flex h-full flex-col items-center justify-center gap-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[#777872]" fallback={<><span>No photo uploaded</span><span className="text-[10px] font-normal normal-case tracking-normal">Upload to Supabase Storage / menu-images</span></>} />
      <span className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-sm font-semibold ${isAvailable ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{item.availability}</span>
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-semibold text-[#202b2f]">{item.name}</h2><p className="mt-0.5 text-sm text-[#66716e]">{item.category}</p></div><p className="shrink-0 text-base font-bold text-[#c6272e]">₱{item.price.toLocaleString()}</p></div>
      <p className={`mt-3 text-sm font-semibold ${item.stockQuantity > 0 ? 'text-[#344348]' : 'text-red-700'}`}>{item.stockQuantity} servings in stock{item.stockQuantity === 0 ? ' · Sold out to customers' : ''}</p>
      <div className="mt-3 flex items-center gap-2 border-t border-[#efede7] pt-3">
        <button type="button" onClick={() => onEdit(item)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e2dfd7] text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2]"><Pencil size={15} /> Edit</button>
        <button type="button" onClick={() => onToggle(item.id)} aria-label={isAvailable ? `Disable ${item.name}` : `Enable ${item.name}`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e2dfd7] text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2]">{isAvailable ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}{isAvailable ? 'Disable' : 'Enable'}</button>
        <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
      </div>
    </div>
  </article>;
}
