'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import type { OrderStatus } from '@/lib/domain';

interface CustomerOrder {
  id: string;
  order_number: number;
  customer_id: string | null;
  customer_name: string;
  status: OrderStatus;
  subtotal: number | string;
  created_at: string;
  order_items?: { item_name: string; quantity: number; unit_price: number | string }[];
}

function localOrderTime(value: string) {
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' });
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limited, setLimited] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function loadOrders() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Please sign in to view your orders.');
        const { data, error: queryError } = await supabase.from('orders').select('id,order_number,customer_id,customer_name,status,subtotal,created_at,order_items(item_name,quantity,unit_price)').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(50);
        if (queryError) throw queryError;
        if (active) {
          setOrders((data ?? []) as CustomerOrder[]);
          setLimited((data ?? []).length === 50);
          setError('');
        }
      } catch (loadError) { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your orders.'); }
      finally { if (active) setLoading(false); }
    }
    void loadOrders();
    let channel = supabase.channel('customer-own-orders');
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) {
        channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${data.user.id}` }, () => { void loadOrders(); }).subscribe();
      }
    });
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);

  return <main className="min-h-dvh bg-[#f6f5f1] text-[#202b2f]">
    <header className="border-b border-[#e6e2d9] bg-[#fffefa]">
      <div className="mx-auto flex min-h-20 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="HBA Kitchen home"><Image src="/hbatube_logo.png.png" alt="" width={42} height={42} /><span className="text-base font-semibold">HBA Kitchen</span></Link>
        <Link href="/" className="min-h-11 rounded-lg px-3 py-3 text-sm font-semibold text-[#a52e35] hover:bg-[#fae9e5]">Back to menu</Link>
      </div>
    </header>
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#a52e35]">YOUR HBA ACCOUNT</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your orders</h1><p className="mt-2 text-base text-[#66716e]">Order updates refresh from your HBA account.</p></div>
      {limited && <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Showing your 50 most recent orders.</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {loading ? <p role="status" className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-10 text-center text-sm text-[#66716e]">Loading your orders...</p> : orders.length === 0 ? <section className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] px-6 py-14 text-center shadow-sm"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f6f2] text-[#a52e35]"><ClipboardList size={25} /></span><h2 className="text-xl font-semibold">No orders yet</h2><p className="mt-2 text-sm text-[#66716e]">Your orders will appear here after you place one.</p><Link href="/#menu" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#c6272e] px-5 text-sm font-semibold text-white hover:bg-[#a82026]">Explore the menu</Link></section> : <div className="space-y-4">{orders.map(order => <article key={order.id} className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#efede7] pb-4"><div><h2 className="text-lg font-semibold">Order #{order.order_number}</h2><p className="mt-1 text-sm text-[#66716e]">{localOrderTime(order.created_at)}</p></div><OrderStatusBadge status={order.status} /></div>
        <ul className="space-y-2 py-4">{(order.order_items ?? []).map((item, index) => <li key={`${order.id}-${index}`} className="flex justify-between gap-4 text-sm"><span className="text-[#344348]">{item.quantity} × {item.item_name}</span><span className="shrink-0 text-[#66716e]">₱{(Number(item.unit_price) * item.quantity).toLocaleString('en-PH')}</span></li>)}</ul>
        <div className="flex justify-between border-t border-[#efede7] pt-4 text-sm"><span className="font-semibold">Total</span><strong>₱{Number(order.subtotal).toLocaleString('en-PH')}</strong></div>
      </article>)}</div>}
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#66716e] hover:text-[#a52e35]"><ArrowLeft size={16} /> Back to HBA Kitchen</Link>
    </div>
  </main>;
}
