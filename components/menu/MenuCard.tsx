'use client';

import React from 'react';
import Image from 'next/image';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { MenuItem } from '@/lib/domain';

const foodPhotos: Record<string, string> = {
  'M-001': 'photo-1604908176997-125f25cc6f3d', 'M-002': 'photo-1547592180-85f173990554',
  'M-003': 'photo-1569718212165-3a8278d5f624', 'M-004': 'photo-1544025162-d76694265947',
  'M-005': 'photo-1563805042-7684c019e1cb', 'M-006': 'photo-1544025162-d76694265947',
  'M-007': 'photo-1547592180-85f173990554', 'M-008': 'photo-1544145945-f90425340c7e',
  'M-009': 'photo-1544025162-d76694265947', 'M-010': 'photo-1604908176997-125f25cc6f3d',
  'M-011': 'photo-1488477181946-6428a0291777', 'M-012': 'photo-1513558161293-cdaf765edfd7',
  'M-013': 'photo-1544025162-d76694265947', 'M-014': 'photo-1547592180-85f173990554',
  'M-015': 'photo-1563805042-7684c019e1cb', 'M-016': 'photo-1513558161293-cdaf765edfd7',
};

interface MenuCardProps { item: MenuItem; onEdit: (item: MenuItem) => void; onDelete: (id: string) => void; onToggle: (id: string) => void; }

export function MenuCard({ item, onEdit, onDelete, onToggle }: MenuCardProps) {
  const isAvailable = item.availability === 'Available';
  const photo = item.image.startsWith('https://') ? null : foodPhotos[item.id];
  const imageSource = item.image.startsWith('https://') ? item.image : photo ? `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=720&h=420&q=80` : null;
  return <article className="overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-[0_2px_10px_rgba(32,43,47,0.04)] transition-shadow hover:shadow-md">
    <div className="relative h-40 bg-[#efede7]">
      {imageSource && <Image src={imageSource} alt={`${item.name} dish`} fill sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-cover" />}
      <span className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-sm font-semibold ${isAvailable ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{item.availability}</span>
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-semibold text-[#202b2f]">{item.name}</h2><p className="mt-0.5 text-sm text-[#66716e]">{item.category}</p></div><p className="shrink-0 text-base font-bold text-[#c6272e]">₱{item.price.toLocaleString()}</p></div>
      <div className="mt-3 flex items-center gap-2 border-t border-[#efede7] pt-3">
        <button type="button" onClick={() => onEdit(item)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e2dfd7] text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2]"><Pencil size={15} /> Edit</button>
        <button type="button" onClick={() => onToggle(item.id)} aria-label={isAvailable ? `Disable ${item.name}` : `Enable ${item.name}`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e2dfd7] text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2]">{isAvailable ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}{isAvailable ? 'Disable' : 'Enable'}</button>
        <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
      </div>
    </div>
  </article>;
}
