'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Download, RefreshCw, Receipt, ShoppingBag, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';

const ORDER_LIMIT = 1000;
const ITEM_LIMIT = 5000;
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B', PREPARING: '#3B82F6', READY: '#10B981', COMPLETED: '#344348', CANCELLED: '#D92F2F',
};
const CURRENCY = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });

type OrderRow = { id: string; order_number: number; subtotal: number | string; status: string; created_at: string };
type OrderItemRow = { order_id: string; item_name: string; quantity: number; unit_price: number | string; line_total: number | string };

function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [truncated, setTruncated] = useState(false);
  const online = useOnlineStatus();

  async function loadReport() {
    setLoading(true);
    setDataError('');
    try {
      const monthKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date());
      const start = new Date(`${monthKey}-01T00:00:00+08:00`);
      const supabase = createClient();
      const { data: orderRows, error: orderError } = await supabase.from('orders')
        .select('id,order_number,subtotal,status,created_at')
        .gte('created_at', start.toISOString()).order('created_at', { ascending: false }).limit(ORDER_LIMIT);
      if (orderError) throw orderError;
      const orderIds = (orderRows ?? []).map(order => order.id);
      const itemRows: OrderItemRow[] = [];
      for (let offset = 0; offset < orderIds.length && itemRows.length < ITEM_LIMIT; offset += 100) {
        const batch = orderIds.slice(offset, offset + 100);
        const remaining = ITEM_LIMIT - itemRows.length;
        const { data: rows, error } = await supabase.from('order_items')
          .select('order_id,item_name,quantity,unit_price,line_total')
          .in('order_id', batch).limit(remaining);
        if (error) throw error;
        itemRows.push(...((rows ?? []) as OrderItemRow[]));
        if ((rows?.length ?? 0) === remaining) break;
      }
      setOrders((orderRows ?? []) as OrderRow[]);
      setItems(itemRows);
      setTruncated((orderRows?.length ?? 0) === ORDER_LIMIT || itemRows.length === ITEM_LIMIT);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not load report data. Check your connection and Supabase permissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReport(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const report = useMemo(() => {
    const completed = orders.filter(order => order.status === 'COMPLETED');
    const revenue = completed.reduce((sum, order) => sum + Number(order.subtotal), 0);
    const statusNames = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    const statusData = statusNames.map(name => ({ name, value: orders.filter(order => order.status === name).length, color: STATUS_COLORS[name] }));
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
    const today = new Date(`${todayKey}T00:00:00+08:00`);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - (6 - index));
      const end = new Date(date);
      end.setUTCDate(end.getUTCDate() + 1);
      const dayRevenue = completed.filter(order => {
        const time = new Date(order.created_at).getTime();
        return time >= date.getTime() && time < end.getTime();
      }).reduce((sum, order) => sum + Number(order.subtotal), 0);
      return { day: new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' }).format(date), revenue: dayRevenue };
    });
    const itemsByName = new Map<string, { name: string; quantity: number; revenue: number }>();
    const completedOrderIds = new Set(completed.map(order => order.id));
    for (const item of items) {
      if (!completedOrderIds.has(item.order_id)) continue;
      const current = itemsByName.get(item.item_name) ?? { name: item.item_name, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Number(item.line_total ?? Number(item.unit_price) * item.quantity);
      itemsByName.set(item.item_name, current);
    }
    const topItems = Array.from(itemsByName.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    return { completed, revenue, average: completed.length ? revenue / completed.length : 0, statusData, days, topItems };
  }, [orders, items]);

  function exportCSV() {
    const headers = ['Order Number', 'Status', 'Subtotal', 'Created At'];
    const rows = orders.map(order => [order.order_number, order.status, Number(order.subtotal).toFixed(2), order.created_at]);
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hba-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function formatRevenue(value: number) {
    if (value >= 1000) return `₱${(value / 1000).toFixed(0)}k`;
    return `₱${value}`;
  }

  return (
    <DashboardLayout searchPlaceholder="Search reports...">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">Reports &amp; Live Analytics</h1>
          <p className="mt-0.5 text-sm text-[#9BAAB8]">Actual orders from the current month</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B7A8D]">{new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</span>
          <Button variant="outline" onClick={() => void loadReport()} disabled={!online || loading} isLoading={loading}><RefreshCw size={14} /> Refresh</Button>
          <Button variant="outline" onClick={exportCSV} disabled={orders.length === 0}><Download size={14} /> Export CSV</Button>
        </div>
      </div>

      {dataError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dataError}</p>}
      {!online && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: showing report data already loaded. Refreshing needs an internet connection.</p>}
      {truncated && <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">This report reached the {ORDER_LIMIT.toLocaleString()} order or {ITEM_LIMIT.toLocaleString()} line limit. Use database pagination for a full export.</p>}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { icon: <TrendingUp size={18} className="text-[#D92F2F]" />, bg: 'bg-red-50', label: 'Completed Revenue', value: CURRENCY.format(report.revenue), sub: 'Completed orders only' },
          { icon: <ShoppingBag size={18} className="text-blue-600" />, bg: 'bg-blue-50', label: 'Orders This Month', value: orders.length.toLocaleString(), sub: `${report.completed.length} completed` },
          { icon: <Receipt size={18} className="text-amber-600" />, bg: 'bg-amber-50', label: 'Average Completed Order', value: CURRENCY.format(report.average), sub: 'From completed orders' },
        ].map(card => <div key={card.label} className="rounded-lg border border-[#DDE3E8] bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2"><div className={`${card.bg} flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg`}>{card.icon}</div><p className="text-xs font-medium leading-tight text-[#6B7A8D]">{card.label}</p></div><p className="text-xl font-bold text-[#1A2332]">{card.value}</p><p className="mt-1 text-xs text-[#9BAAB8]">{card.sub}</p></div>)}
      </div>

      {loading && <p role="status" className="mb-4 text-center text-sm text-[#6B7A8D]">Loading report data…</p>}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#DDE3E8] bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-[#1A2332]">Completed Revenue Trend</h2>
          <p className="mb-4 text-xs text-[#9BAAB8]">Last seven days</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={report.days} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F6" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9BAAB8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 11, fill: '#9BAAB8' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={value => [CURRENCY.format(Number(value)), 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3E8' }} />
              <Bar dataKey="revenue" fill="#D92F2F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-[#DDE3E8] bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-[#1A2332]">Orders by Status</h2>
          <p className="mb-2 text-xs text-[#9BAAB8]">Current month records</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={report.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">{report.statusData.map(status => <Cell key={status.name} fill={status.color} />)}</Pie><Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3E8' }} /></PieChart>
          </ResponsiveContainer>
          <div className="mt-1 space-y-1.5">{report.statusData.map(status => <div key={status.name} className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: status.color }} /><span className="text-xs text-[#6B7A8D]">{status.name}</span></div><span className="text-xs font-semibold text-[#1A2332]">{status.value}</span></div>)}</div>
        </div>
      </div>

      <section className="rounded-lg border border-[#DDE3E8] bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-[#1A2332]">Top Selling Items</h2>
        <p className="mb-4 text-xs text-[#9BAAB8]">Completed order lines this month</p>
        {report.topItems.length === 0 ? <p className="py-8 text-center text-sm text-[#9BAAB8]">No completed item records for this month.</p> : <div className="space-y-3">{report.topItems.map((item, index) => <div key={item.name} className="flex items-center gap-3"><span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-[#F4F6F8] text-[#9BAAB8]'}`}>{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#1A2332]">{item.name}</p><div className="mt-1 flex items-center gap-2"><span className="h-1.5 flex-1 rounded-full bg-[#F4F6F8]"><span className="block h-1.5 rounded-full bg-[#D92F2F]" style={{ width: `${Math.max(4, item.quantity / report.topItems[0].quantity * 100)}%` }} /></span><span className="whitespace-nowrap text-[10px] text-[#9BAAB8]">{item.quantity} sold</span></div></div><strong className="whitespace-nowrap text-xs text-[#1A2332]">{CURRENCY.format(item.revenue)}</strong></div>)}</div>}
      </section>
    </DashboardLayout>
  );
}
