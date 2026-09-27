'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MenuPhoto } from '@/components/menu/MenuPhoto';

interface PopularItem { name: string; orders: number; price: number; image?: string | null }

export function PopularItems() {
  const [items, setItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function load() {
      try {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
        const start = new Date(`${today}T00:00:00+08:00`);
        const { data, error: queryError } = await supabase.from('order_items').select('item_name,quantity,unit_price,orders!inner(created_at,status),menu_items(image_url)').gte('orders.created_at', start.toISOString()).neq('orders.status', 'CANCELLED').limit(5000);
        if (queryError) throw queryError;
        const aggregated = new Map<string, PopularItem>();
        for (const raw of data ?? []) {
          const row = raw as unknown as { item_name: string; quantity: number; unit_price: number | string; menu_items: { image_url: string | null } | null };
          const existing = aggregated.get(row.item_name);
          if (existing) existing.orders += row.quantity;
          else aggregated.set(row.item_name, { name: row.item_name, orders: row.quantity, price: Number(row.unit_price), image: row.menu_items?.image_url });
        }
        if (active) {
          setItems(Array.from(aggregated.values()).sort((a, b) => b.orders - a.orders).slice(0, 4));
          setTruncated(data?.length === 5000);
          setError('');
        }
      } catch (queryError) { if (active) setError(queryError instanceof Error ? queryError.message : 'Could not load popular items.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    const channel = supabase.channel('rms-popular-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void load(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);

  return <section className="overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-[0_2px_10px_rgba(32,43,47,0.04)]" aria-labelledby="popular-items-title">
    <div className="border-b border-[#e6e2d9] px-5 py-4"><h2 id="popular-items-title" className="text-lg font-semibold text-[#202b2f]">Popular Menu Items</h2><p className="mt-0.5 text-sm text-[#66716e]">Most ordered today</p></div>
    {error && <p role="alert" className="px-5 py-3 text-sm text-red-700">Could not load popular items: {error}</p>}
    {truncated && <p role="status" className="px-5 py-2 text-xs text-amber-800">The 5,000 line limit was reached; rankings may be incomplete.</p>}
    <div className="divide-y divide-[#efede7]">{loading ? <p className="px-5 py-8 text-center text-sm text-[#66716e]">Loading menu sales...</p> : items.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#66716e]">No sales data yet.</p> : items.map((item, index) => <div key={item.name} className="flex items-center gap-3 px-4 py-4 sm:px-5"><div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0eee8]"><MenuPhoto source={item.image} alt="" sizes="48px" className="object-cover" fallbackClassName="text-[8px] font-semibold text-[#66716e]" fallback="NO PHOTO" /></div><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold text-[#202b2f]">{item.name}</p><p className="text-sm text-[#66716e]">{item.orders} sold today</p></div><div className="text-right"><p className="text-base font-bold text-[#c6272e]">₱{item.price.toLocaleString('en-PH')}</p><p className="text-sm text-[#66716e]">#{index + 1} rank</p></div></div>)}</div>
  </section>;
}
