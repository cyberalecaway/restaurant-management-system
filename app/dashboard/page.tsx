'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, BookOpen, ClipboardList, Plus, Users, ShoppingCart, ArrowUpRight, CircleCheck, Clock3, ChefHat, XCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { PopularItems } from '@/components/dashboard/PopularItems';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';

export default function DashboardPage() {
  const [kpis, setKpis] = useState({ totalOrders: '—', revenue: '—', activeOrders: '—', menuItems: '—', staff: '—' });
  const [orderCounts, setOrderCounts] = useState({ completed: 0, preparing: 0, pending: 0, cancelled: 0, ready: 0 });
  const [salesData, setSalesData] = useState<{ day: string; revenue: number }[]>([]);
  const [dashboardError, setDashboardError] = useState('');
  const [recordLimitReached, setRecordLimitReached] = useState(false);
  const online = useOnlineStatus();
  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const supabase = createClient();
        const now = new Date();
        const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
        const todayStart = new Date(`${todayKey}T00:00:00+08:00`);
        const start = new Date(todayStart); start.setUTCDate(start.getUTCDate() - 6);
        const [ordersResult, totalOrdersResult, menuResult, staffResult] = await Promise.all([
          supabase.from('orders').select('status,subtotal,created_at').gte('created_at', start.toISOString()).order('created_at', { ascending: false }).limit(5000),
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('menu_items').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'STAFF').eq('status', 'ACTIVE'),
        ]);
        const issue = ordersResult.error ?? totalOrdersResult.error ?? menuResult.error ?? staffResult.error;
        if (issue) throw issue;
        const rows = ordersResult.data ?? [];
        const todayOrders = rows.filter(row => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(row.created_at)) === todayKey);
        const activeCount = todayOrders.filter(row => ['PENDING', 'PREPARING', 'READY'].includes(row.status)).length;
        const sumRevenue = todayOrders.filter(row => row.status === 'COMPLETED').reduce((sum, row) => sum + Number(row.subtotal), 0);
        const grouped = new Map<string, number>();
        rows.forEach(row => {
          if (row.status !== 'COMPLETED') return;
          const key = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' }).format(new Date(row.created_at));
          grouped.set(key, (grouped.get(key) ?? 0) + Number(row.subtotal));
        });
        const counts = {
          completed: todayOrders.filter(row => row.status === 'COMPLETED').length,
          preparing: todayOrders.filter(row => row.status === 'PREPARING').length,
          pending: todayOrders.filter(row => row.status === 'PENDING').length,
          cancelled: todayOrders.filter(row => row.status === 'CANCELLED').length,
          ready: todayOrders.filter(row => row.status === 'READY').length,
        };
        if (active) {
          setKpis({ totalOrders: String(totalOrdersResult.count ?? 0), revenue: `₱${sumRevenue.toLocaleString('en-PH')}`, activeOrders: String(activeCount), menuItems: String(menuResult.count ?? 0), staff: String(staffResult.count ?? 0) });
          setOrderCounts(counts);
          setRecordLimitReached(rows.length === 5000);
          setSalesData(Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start); date.setUTCDate(start.getUTCDate() + index);
            const day = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'short' }).format(date);
            return { day, revenue: grouped.get(day) ?? 0 };
          }));
        }
      } catch (error) { if (active) setDashboardError(error instanceof Error ? error.message : 'Could not load dashboard data.'); }
    }
    void loadDashboard();
    return () => { active = false; };
  }, []);
  const statusRows = [
    { label: 'Completed', value: orderCounts.completed, color: 'bg-green-600', Icon: CircleCheck },
    { label: 'Ready', value: orderCounts.ready, color: 'bg-emerald-600', Icon: ClipboardList },
    { label: 'Preparing', value: orderCounts.preparing, color: 'bg-blue-600', Icon: ChefHat },
    { label: 'Pending', value: orderCounts.pending, color: 'bg-amber-500', Icon: Clock3 },
    { label: 'Cancelled', value: orderCounts.cancelled, color: 'bg-red-600', Icon: XCircle },
  ];
  const totalStatus = Object.values(orderCounts).reduce((sum, value) => sum + value, 0);

  return (
    <DashboardLayout searchPlaceholder="Search orders, staff, menu items...">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold tracking-tight text-[#202b2f]">Dashboard</h1><p className="mt-1 text-base text-[#66716e]">Restaurant overview and today&apos;s performance.</p></div>
        <p className="text-sm font-medium text-[#66716e]">HBA Filipino Restaurant <span className="mx-1 text-[#a3aaa5]">·</span> Branch operations</p>
      </div>

      {dashboardError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Dashboard data is unavailable: {dashboardError}. Confirm Supabase configuration, schema, and account access.</p>}
      {!online && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: showing data already loaded. Refreshing needs an internet connection.</p>}
      {recordLimitReached && <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">The chart reached the 5,000 order limit, so recent sales totals may be incomplete.</p>}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard icon={<ShoppingCart size={20} className="text-[#c6272e]" />} label="Total Orders" value={kpis.totalOrders} iconBg="bg-[#fae9e5]" />
        <StatCard icon={<Banknote size={20} className="text-[#c6272e]" />} label="Today’s Revenue" value={kpis.revenue} iconBg="bg-[#fae9e5]" />
        <StatCard icon={<ClipboardList size={20} className="text-[#344348]" />} label="Active Orders" value={kpis.activeOrders} iconBg="bg-[#ecefeb]" />
        <StatCard icon={<BookOpen size={20} className="text-[#344348]" />} label="Menu Items" value={kpis.menuItems} iconBg="bg-[#ecefeb]" />
        <StatCard icon={<Users size={20} className="text-[#344348]" />} label="Active Staff" value={kpis.staff} iconBg="bg-[#ecefeb]" />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-5 shadow-[0_2px_10px_rgba(32,43,47,0.04)] xl:col-span-2" aria-labelledby="sales-overview-title">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h2 id="sales-overview-title" className="text-lg font-semibold text-[#202b2f]">Sales Overview</h2><p className="text-sm text-[#66716e]">Completed revenue - Last seven days</p></div></div>
          <div className="h-[250px] w-full" role="img" aria-label="Completed sales overview area chart for the last seven days">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d92f2f" stopOpacity={0.18} /><stop offset="95%" stopColor="#d92f2f" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid stroke="#efede7" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 14, fill: '#66716e' }} axisLine={false} tickLine={false} tickMargin={10} />
                <YAxis tickFormatter={value => `₱${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 13, fill: '#66716e' }} axisLine={false} tickLine={false} width={54} />
                <Tooltip formatter={value => [`₱${Number(value).toLocaleString()}`, 'Revenue']} contentStyle={{ fontSize: 14, borderRadius: 8, border: '1px solid #e6e2d9' }} />
                <Area type="monotone" dataKey="revenue" stroke="#d92f2f" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 5, fill: '#d92f2f' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-5 shadow-[0_2px_10px_rgba(32,43,47,0.04)]" aria-labelledby="order-status-title">
          <div className="mb-4"><h2 id="order-status-title" className="text-lg font-semibold text-[#202b2f]">Order Status</h2><p className="text-sm text-[#66716e]">Current order workflow</p></div>
          <div className="space-y-4">
            {statusRows.map(({ label, value, color, Icon }) => <div key={label}>
              <div className="mb-1.5 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-medium text-[#344348]"><Icon size={17} aria-hidden="true" className="text-[#66716e]" />{label}</div><span className="text-sm font-semibold text-[#202b2f]">{value}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-[#efede7]"><div className={`h-full rounded-full ${color}`} style={{ width: `${totalStatus ? (value / totalStatus) * 100 : 0}%` }} /></div>
            </div>)}
          </div>
          <Link href="/orders" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#e6e2d9] text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2]">Open order board <ArrowUpRight size={16} className="ml-2" /></Link>
        </section>
      </div>

      <section className="mb-5" aria-label="Recent restaurant orders"><RecentOrders /></section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><PopularItems /></div>
        <section className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-5 shadow-[0_2px_10px_rgba(32,43,47,0.04)]" aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className="text-lg font-semibold text-[#202b2f]">Quick Actions</h2><p className="mb-3 text-sm text-[#66716e]">Common tasks</p>
          <div className="space-y-2">
            <Link href="/menu?new=1" className="flex min-h-12 items-center gap-3 rounded-lg border border-[#e6e2d9] px-3 text-sm font-medium text-[#344348] hover:border-[#d92f2f]/40 hover:bg-[#fff8f6]"><Plus size={18} className="text-[#c6272e]" /> Add menu item</Link>
            <Link href="/orders" className="flex min-h-12 items-center gap-3 rounded-lg border border-[#e6e2d9] px-3 text-sm font-medium text-[#344348] hover:border-[#d92f2f]/40 hover:bg-[#fff8f6]"><ClipboardList size={18} className="text-[#c6272e]" /> View orders</Link>
            <Link href="/users" className="flex min-h-12 items-center gap-3 rounded-lg border border-[#e6e2d9] px-3 text-sm font-medium text-[#344348] hover:border-[#d92f2f]/40 hover:bg-[#fff8f6]"><Users size={18} className="text-[#c6272e]" /> Manage staff</Link>
            <Link href="/reports" className="flex min-h-12 items-center gap-3 rounded-lg border border-[#e6e2d9] px-3 text-sm font-medium text-[#344348] hover:border-[#d92f2f]/40 hover:bg-[#fff8f6]"><ArrowUpRight size={18} className="text-[#c6272e]" /> View reports</Link>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
