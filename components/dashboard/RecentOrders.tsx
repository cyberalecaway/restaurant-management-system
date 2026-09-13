import React from 'react';
import Link from 'next/link';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { recentOrders } from '@/lib/mock-data';

export function RecentOrders() {
  return (
    <div className="bg-white border border-[#DDE3E8] rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE3E8]">
        <div>
          <h3 className="text-sm font-semibold text-[#1A2332]">Recent Active Orders</h3>
          <p className="text-xs text-[#9BAAB8] mt-0.5">Live order tracking</p>
        </div>
        <Link href="/orders" className="text-xs text-[#D92F2F] font-medium hover:underline">
          View All Orders
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F0F3F6] bg-[#F8FAFC]">
              {['Order ID', 'Customer', 'Items', 'Total', 'Status'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[#6B7A8D] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentOrders.map(order => (
              <tr key={order.id} className="border-b border-[#F0F3F6] hover:bg-[#FAFBFC] transition-colors">
                <td className="px-4 py-3 text-xs font-mono font-semibold text-[#D92F2F] whitespace-nowrap">{order.id}</td>
                <td className="px-4 py-3 text-xs font-medium text-[#1A2332] whitespace-nowrap">{order.customer}</td>
                <td className="px-4 py-3 text-xs text-[#6B7A8D] max-w-[200px] truncate">{order.items}</td>
                <td className="px-4 py-3 text-xs font-semibold text-[#1A2332] whitespace-nowrap">₱{order.total.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
