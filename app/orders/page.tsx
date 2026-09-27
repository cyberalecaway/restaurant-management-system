'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Search, X, ClipboardList, Clock3, CircleCheck, ChefHat, XCircle, LayoutGrid, List } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { Order, OrderStatus } from '@/lib/domain';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';

type View = 'Board View' | 'Table View';
const filters = ['ALL', 'PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const;
type Filter = typeof filters[number];
const boardStatuses: OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = { PENDING: 'PREPARING', PREPARING: 'READY', READY: 'COMPLETED' };
const transitionLabel: Partial<Record<OrderStatus, string>> = { PENDING: 'Accept order', PREPARING: 'Mark ready', READY: 'Mark completed' };

function toOrder(row: { id: string; order_number: number; customer_name: string; table_label: string; status: OrderStatus; subtotal: number | string; created_at: string; order_items?: { item_name: string; quantity: number }[] }): Order {
  return {
    id: row.id,
    orderNumber: `#HBA-${row.order_number}`,
    customer: row.customer_name,
    table: row.table_label,
    items: (row.order_items ?? []).map(item => `${item.quantity}× ${item.item_name}`).join(', ') || 'No items recorded',
    total: Number(row.subtotal),
    status: row.status,
    createdAt: row.created_at,
  };
}

function orderTime(value: string) { return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }); }
function orderServiceDate(value: string) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(value)); }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [savingOrderId, setSavingOrderId] = useState('');
  const [recordLimitReached, setRecordLimitReached] = useState(false);
  const online = useOnlineStatus();
  const [view, setView] = useState<View>('Board View');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [serviceDate, setServiceDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()));
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function loadOrders() {
      try {
        const { data, error } = await supabase.from('orders').select('id,order_number,customer_name,table_label,status,subtotal,created_at,order_items(item_name,quantity)').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        if (active) {
          setOrders((data ?? []).map(row => toOrder(row as Parameters<typeof toOrder>[0])));
          setRecordLimitReached((data ?? []).length === 500);
        }
      } catch (error) {
        if (active) setDataError(error instanceof Error ? error.message : 'Could not load restaurant orders.');
      } finally { if (active) setLoading(false); }
    }
    void loadOrders();
    const channel = supabase.channel('rms-orders-board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void loadOrders(); })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);
  const [selected, setSelected] = useState<Order | null>(null);
  const [notice, setNotice] = useState('');
  const visibleOrders = useMemo(() => orders.filter(order => {
    const matchesFilter = filter === 'ALL' || order.status === filter;
    const matchesDate = !serviceDate || orderServiceDate(order.createdAt) === serviceDate;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${order.id} ${order.customer} ${order.table} ${order.items}`.toLowerCase().includes(term);
    return matchesFilter && matchesDate && matchesSearch;
  }), [orders, filter, search, serviceDate]);

  async function updateStatus(order: Order, status: OrderStatus) {
    if (!online) { setDataError('You are offline. Reconnect before changing an order.'); return; }
    if (savingOrderId) return;
    setSavingOrderId(order.id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
      if (error) throw error;
      setOrders(current => current.map(item => item.id === order.id ? { ...item, status } : item));
      if (selected?.id === order.id) setSelected({ ...order, status });
      setDataError('');
      setNotice(`${order.orderNumber ?? order.id} moved to ${status.toLowerCase()}.`);
      window.setTimeout(() => setNotice(''), 3500);
    } catch (error) { setDataError(error instanceof Error ? error.message : 'Could not update this order.'); }
    finally { setSavingOrderId(''); }
  }

  return <DashboardLayout searchPlaceholder="Search orders...">
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><h1 className="text-2xl font-bold tracking-tight text-[#202b2f]">Orders</h1><p className="mt-1 text-base text-[#66716e]">Monitor and manage active restaurant orders.</p></div>
      <div className="flex items-center gap-2 text-sm text-[#66716e]"><CalendarDays size={18} aria-hidden="true" /><label htmlFor="service-date">Service date</label><input id="service-date" type="date" value={serviceDate} onChange={event => setServiceDate(event.target.value)} className="min-h-11 rounded-lg border border-[#e2dfd7] bg-[#fffefa] px-3 text-sm text-[#202b2f]" /></div>
    </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {[
        { label: 'Pending', status: 'PENDING' as OrderStatus, Icon: Clock3, tone: 'text-amber-700' },
        { label: 'Preparing', status: 'PREPARING' as OrderStatus, Icon: ChefHat, tone: 'text-blue-700' },
        { label: 'Ready', status: 'READY' as OrderStatus, Icon: ClipboardList, tone: 'text-green-700' },
        { label: 'Completed', status: 'COMPLETED' as OrderStatus, Icon: CircleCheck, tone: 'text-green-700' },
        { label: 'Cancelled', status: 'CANCELLED' as OrderStatus, Icon: XCircle, tone: 'text-red-700' },
      ].map(({ label, status, Icon, tone }) => <div key={status} className="flex items-center gap-3 rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-3.5"><Icon size={20} className={tone} aria-hidden="true" /><div><p className="text-sm text-[#66716e]">{label}</p><p className="text-xl font-bold text-[#202b2f]">{orders.filter(order => order.status === status).length}</p></div></div>)}
    </div>

    <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-3 sm:flex-row sm:items-center">
      <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filter orders by status">
        {filters.map(option => <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors ${filter === option ? 'bg-[#202b2f] text-white' : 'text-[#5e6966] hover:bg-[#f3f1ec]'}`}>{option === 'ALL' ? 'All' : option.charAt(0) + option.slice(1).toLowerCase()}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[210px] flex-1"><span className="sr-only">Search orders</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#778078]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order or customer" className="min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-[#f7f6f2] pl-10 pr-3 text-sm focus:border-[#d92f2f]" /></label>
        <div className="flex rounded-lg border border-[#e6e2d9] bg-[#f7f6f2] p-1" role="group" aria-label="Choose orders view">
          {(['Board View', 'Table View'] as const).map((option, index) => <button key={option} type="button" onClick={() => setView(option)} aria-pressed={view === option} className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium ${view === option ? 'bg-white text-[#202b2f] shadow-sm' : 'text-[#66716e]'}`}>{index === 0 ? <LayoutGrid size={16} /> : <List size={16} />}{option}</button>)}
        </div>
      </div>
    </div>

    {notice && <p role="status" className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">{notice}</p>}
    {dataError && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dataError}</p>}
    {!online && <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: orders already loaded are read-only until your connection returns.</p>}
    {recordLimitReached && <p role="status" className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Showing the 500 newest orders. Older records are not included in this view.</p>}

    {loading ? <div role="status" className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-10 text-center text-[#66716e]">Loading orders…</div> : view === 'Board View' ? <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 2xl:grid-cols-5">
      {boardStatuses.filter(status => filter === 'ALL' || status === filter).map(status => {
        const items = visibleOrders.filter(order => order.status === status);
        return <section key={status} aria-labelledby={`column-${status}`} className="min-h-48 rounded-xl border border-[#e6e2d9] bg-[#efeee9] p-2.5">
          <div className="mb-2 flex items-center justify-between px-1.5 py-1"><h2 id={`column-${status}`} className="text-sm font-bold uppercase tracking-wide text-[#344348]">{status.charAt(0) + status.slice(1).toLowerCase()}</h2><span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-semibold text-[#5e6966]">{items.length}</span></div>
          <div className="space-y-2.5">{items.map(order => <article key={order.id} className="rounded-lg border border-[#e4e1d9] bg-[#fffefa] p-3.5 shadow-[0_1px_3px_rgba(32,43,47,0.04)]">
            <div className="mb-2 flex items-start justify-between gap-2"><button type="button" onClick={() => setSelected(order)} className="text-left text-sm font-bold text-[#c6272e] hover:underline">{order.orderNumber ?? order.id}</button><OrderStatusBadge status={order.status} /></div>
            <p className="text-base font-semibold text-[#202b2f]">{order.customer}</p><p className="mt-0.5 text-sm text-[#66716e]">{order.table} <span className="mx-1">·</span> {orderTime(order.createdAt)}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#5e6966]">{order.items}</p>
            <div className="mt-3 flex items-center justify-between border-t border-[#efede7] pt-2.5"><span className="text-base font-bold text-[#202b2f]">₱{order.total.toLocaleString()}</span><div className="flex items-center gap-2">
              {nextStatus[status] && <button type="button" disabled={!online || savingOrderId === order.id} onClick={() => updateStatus(order, nextStatus[status]!)} className="min-h-10 rounded-md bg-[#d92f2f] px-3 text-sm font-semibold text-white hover:bg-[#b82525] disabled:cursor-not-allowed disabled:opacity-50">{savingOrderId === order.id ? 'Saving…' : transitionLabel[status]}</button>}
              {status === 'COMPLETED' || status === 'CANCELLED' ? <button type="button" onClick={() => setSelected(order)} className="min-h-10 rounded-md border border-[#e2dfd7] px-3 text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2]">Details</button> : <button type="button" onClick={() => setSelected(order)} className="min-h-10 rounded-md px-2 text-sm font-semibold text-[#66716e] hover:bg-[#f7f6f2]">Details</button>}
            </div></div>
          </article>)}{items.length === 0 && <p className="rounded-lg border border-dashed border-[#d5d2ca] bg-white/60 px-3 py-6 text-center text-sm text-[#66716e]">No {status.toLowerCase()} orders</p>}</div>
        </section>;
      })}
    </div> : <div className="overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa]">
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#e6e2d9] bg-[#f7f6f2]">{['Order ID', 'Customer', 'Table', 'Items', 'Total', 'Status', 'Time', 'Action'].map(label => <th key={label} scope="col" className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#5e6966]">{label}</th>)}</tr></thead>
        <tbody>{visibleOrders.map(order => <tr key={order.id} className="border-b border-[#efede7] last:border-0 hover:bg-[#fbfaf7]"><td className="px-4 py-3.5 font-mono font-semibold text-[#c6272e]">{order.orderNumber ?? order.id}</td><td className="px-4 py-3.5 font-medium text-[#202b2f]">{order.customer}</td><td className="px-4 py-3.5 text-[#5e6966]">{order.table}</td><td className="max-w-[250px] truncate px-4 py-3.5 text-[#5e6966]">{order.items}</td><td className="whitespace-nowrap px-4 py-3.5 font-semibold">₱{order.total.toLocaleString()}</td><td className="px-4 py-3.5"><OrderStatusBadge status={order.status} /></td><td className="whitespace-nowrap px-4 py-3.5 text-[#5e6966]">{orderTime(order.createdAt)}</td><td className="px-4 py-3.5"><button type="button" onClick={() => setSelected(order)} className="min-h-10 rounded-md px-3 text-sm font-semibold text-[#c6272e] hover:bg-[#fae9e5]">View</button></td></tr>)}
          {visibleOrders.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#66716e]">No orders match your search and filter.</td></tr>}</tbody></table></div>
    </div>}

    {selected && <div className="fixed inset-0 z-[70] flex justify-end" role="presentation">
      <button type="button" aria-label="Close order details" onClick={() => setSelected(null)} className="absolute inset-0 bg-black/40" />
      <aside role="dialog" aria-modal="true" aria-labelledby="order-detail-heading" className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[#e6e2d9] bg-[#fffefa] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#e6e2d9] px-5 py-5"><div><p className="text-sm font-semibold uppercase tracking-wide text-[#66716e]">Order details</p><h2 id="order-detail-heading" className="mt-1 text-xl font-bold text-[#202b2f]">{selected.orderNumber ?? selected.id}</h2></div><button type="button" aria-label="Close order details" onClick={() => setSelected(null)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#f3f1ec]"><X size={21} /></button></div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-[#66716e]">Customer</p><p className="mt-1 text-base font-semibold text-[#202b2f]">{selected.customer}</p></div><div><p className="text-sm text-[#66716e]">Table</p><p className="mt-1 text-base font-semibold text-[#202b2f]">{selected.table}</p></div><div className="col-span-2"><p className="text-sm text-[#66716e]">Order time</p><p className="mt-1 text-base font-medium text-[#202b2f]">{orderTime(selected.createdAt)}</p></div></div>
          <section><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#344348]">Items summary</h3><p className="rounded-lg border border-[#e6e2d9] bg-[#f7f6f2] p-4 text-base leading-6 text-[#344348]">{selected.items}</p></section>
          <div className="flex items-center justify-between border-t border-[#e6e2d9] pt-4"><span className="text-base font-semibold text-[#344348]">Order total</span><strong className="text-2xl text-[#202b2f]">₱{selected.total.toLocaleString()}</strong></div>
          <div className="flex items-center justify-between"><span className="text-base font-medium text-[#344348]">Status</span><OrderStatusBadge status={selected.status} /></div>
        </div>
        <div className="space-y-2 border-t border-[#e6e2d9] p-5">
          {nextStatus[selected.status] && <button type="button" disabled={!online || savingOrderId === selected.id} onClick={() => updateStatus(selected, nextStatus[selected.status]!)} className="min-h-12 w-full rounded-lg bg-[#d92f2f] px-4 text-base font-semibold text-white hover:bg-[#b82525] disabled:cursor-not-allowed disabled:opacity-50">{savingOrderId === selected.id ? 'Saving…' : transitionLabel[selected.status]}</button>}
          {['PENDING', 'PREPARING', 'READY'].includes(selected.status) && <button type="button" disabled={!online || savingOrderId === selected.id} onClick={() => updateStatus(selected, 'CANCELLED')} className="min-h-11 w-full rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel order</button>}
        </div>
      </aside>
    </div>}
  </DashboardLayout>;
}
