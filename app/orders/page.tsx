'use client';

import React, { useState, useMemo } from 'react';
import { Search, CalendarDays } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { mockOrders, OrderStatus } from '@/lib/mock-data';

type TabStatus = 'All Orders' | 'Pending' | 'Preparing' | 'Completed' | 'Cancelled';
const TABS: TabStatus[] = ['All Orders', 'Pending', 'Preparing', 'Completed', 'Cancelled'];

const STATUS_MAP: Record<TabStatus, OrderStatus | null> = {
  'All Orders': null,
  'Pending':    'PENDING',
  'Preparing':  'PREPARING',
  'Completed':  'COMPLETED',
  'Cancelled':  'CANCELLED',
};

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabStatus>('All Orders');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('2026-04-12');

  const filtered = useMemo(() => {
    return mockOrders.filter(o => {
      const statusFilter = STATUS_MAP[activeTab];
      const matchesStatus = !statusFilter || o.status === statusFilter;
      const matchesSearch = !search ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.customer.toLowerCase().includes(search.toLowerCase()) ||
        o.items.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [activeTab, search]);

  // Summary counts
  const counts = useMemo(() => ({
    total:     mockOrders.length,
    pending:   mockOrders.filter(o => o.status === 'PENDING').length,
    preparing: mockOrders.filter(o => o.status === 'PREPARING').length,
    completed: mockOrders.filter(o => o.status === 'COMPLETED').length,
    cancelled: mockOrders.filter(o => o.status === 'CANCELLED').length,
  }), []);

  return (
    <DashboardLayout searchPlaceholder="Search orders...">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">Real-time Active Orders</h1>
          <p className="text-sm text-[#9BAAB8] mt-0.5">Monitor, dispatch, and track customer table status</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[#9BAAB8]" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] text-[#1A2332]"
          />
        </div>
      </div>

      {/* Tabs + Table card */}
      <div className="bg-white border border-[#DDE3E8] rounded-lg shadow-sm mb-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-[#DDE3E8] overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-md whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'bg-[#D92F2F] text-white border-[#D92F2F]'
                  : 'text-[#6B7A8D] border-transparent hover:text-[#1A2332] hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
          {/* Search inside card */}
          <div className="ml-auto pb-2 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] placeholder:text-[#9BAAB8] text-[#1A2332] w-44"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F0F3F6] bg-[#F8FAFC]">
                {['Order ID', 'Customer', 'Table', 'Items Summary', 'Total', 'Status', 'Time'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7A8D] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#9BAAB8] text-sm">
                    No orders found for this filter.
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="border-b border-[#F0F3F6] hover:bg-[#FAFBFC] transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-[#D92F2F] whitespace-nowrap">{order.id}</td>
                    <td className="px-4 py-3 text-xs font-medium text-[#1A2332] whitespace-nowrap">{order.customer}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A8D] whitespace-nowrap">{order.table}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A8D] max-w-[200px] truncate">{order.items}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#1A2332] whitespace-nowrap">₱{order.total.toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-xs text-[#9BAAB8] whitespace-nowrap">{order.createdAt.split(' ').slice(1).join(' ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Orders',  value: counts.total,     color: 'text-[#1A2332]', bg: 'bg-white' },
          { label: 'Pending',       value: counts.pending,   color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Preparing',     value: counts.preparing, color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Completed',     value: counts.completed, color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Cancelled',     value: counts.cancelled, color: 'text-red-600',    bg: 'bg-red-50' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-[#DDE3E8] rounded-lg p-4 text-center`}>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-[#6B7A8D] mt-1 font-medium">{card.label}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
