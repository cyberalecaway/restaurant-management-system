'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';

interface RecentOrderRow { id: string; order_number: number; customer_name: string; status: string; subtotal: number | string; order_items?: { item_name: string; quantity: number }[] }

export function RecentOrders() {
  const [orders, setOrders] = useState<RecentOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase.from('orders').select('id,order_number,customer_name,status,subtotal,order_items(item_name,quantity)').order('created_at', { ascending: false }).limit(6);
        if (queryError) throw queryError;
        if (active) setOrders(data ?? []);
      } catch (queryError) { if (active) setError(queryError instanceof Error ? queryError.message : 'Could not load recent orders.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  return <section className="overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-[0_2px_10px_rgba(32,43,47,0.04)]" aria-labelledby="recent-orders-title">
    <div className="flex items-center justify-between gap-3 border-b border-[#e6e2d9] px-5 py-4"><div><h2 id="recent-orders-title" className="text-lg font-semibold text-[#202b2f]">Recent Orders</h2><p className="mt-0.5 text-sm text-[#66716e]">Latest restaurant orders</p></div><Link href="/orders" className="shrink-0 rounded-md px-2 py-2 text-sm font-semibold text-[#c6272e] hover:bg-[#fae9e5]">View All Orders</Link></div>
    {error && <p role="alert" className="px-5 py-3 text-sm text-red-700">Could not load orders: {error}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-[#e6e2d9] bg-[#f7f6f2]">{['Order ID', 'Customer', 'Items', 'Total', 'Status'].map(label => <th key={label} scope="col" className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#5e6966]">{label}</th>)}</tr></thead>
      <tbody>{loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#66716e]">Loading orders…</td></tr> : orders.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#66716e]">No orders have been placed yet.</td></tr> : orders.map(order => <tr key={order.id} className="border-b border-[#efede7] transition-colors last:border-0 hover:bg-[#fbfaf7]"><td className="whitespace-nowrap px-4 py-3.5 font-mono font-semibold text-[#c6272e]">#HBA-{order.order_number}</td><td className="whitespace-nowrap px-4 py-3.5 font-medium text-[#202b2f]">{order.customer_name}</td><td className="max-w-[220px] truncate px-4 py-3.5 text-[#5e6966]">{(order.order_items ?? []).map(item => `${item.quantity}× ${item.item_name}`).join(', ') || 'No items'}</td><td className="whitespace-nowrap px-4 py-3.5 font-semibold text-[#202b2f]">₱{Number(order.subtotal).toLocaleString('en-PH')}</td><td className="px-4 py-3.5"><OrderStatusBadge status={order.status} /></td></tr>)}</tbody>
    </table></div>
  </section>;
}
