'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download, TrendingUp, ShoppingBag, Receipt, Star } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { revenueData, categoryData, topDishes, staffPerformance } from '@/lib/mock-data';

function formatRevenue(value: number) {
  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}k`;
  return `₱${value}`;
}

export default function ReportsPage() {
  return (
    <DashboardLayout searchPlaceholder="Search reports...">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">Reports &amp; Live Analytics</h1>
          <p className="text-sm text-[#9BAAB8] mt-0.5">Performance insights and operational metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none text-[#1A2332]">
            <option>April 2026 (Monthly)</option>
            <option>March 2026 (Monthly)</option>
            <option>Q1 2026 (Quarterly)</option>
          </select>
          <Button variant="outline" size="sm">
            <Download size={14} /> PDF Report
          </Button>
          <Button variant="outline" size="sm">
            <Download size={14} /> Export Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          {
            icon: <TrendingUp size={18} className="text-[#D92F2F]" />, bg: 'bg-red-50',
            label: 'Total Revenue This Month', value: '₱486,250',
            sub: '+12.4% vs last month', subColor: 'text-green-600',
          },
          {
            icon: <ShoppingBag size={18} className="text-blue-600" />, bg: 'bg-blue-50',
            label: 'Total Orders Handled', value: '1,284',
            sub: '+8.1% vs target', subColor: 'text-green-600',
          },
          {
            icon: <Receipt size={18} className="text-amber-600" />, bg: 'bg-amber-50',
            label: 'Average Ticket Size', value: '₱379',
            sub: 'Steady Pinoy average spend', subColor: 'text-[#9BAAB8]',
          },
          {
            icon: <Star size={18} className="text-yellow-500" />, bg: 'bg-yellow-50',
            label: 'Customer Satisfaction', value: '4.8 / 5.0',
            sub: 'Based on 420 reviews', subColor: 'text-[#9BAAB8]',
          },
        ].map(card => (
          <div key={card.label} className="bg-white border border-[#DDE3E8] rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${card.bg} w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>{card.icon}</div>
              <p className="text-xs text-[#6B7A8D] font-medium leading-tight">{card.label}</p>
            </div>
            <p className="text-xl font-bold text-[#1A2332]">{card.value}</p>
            <p className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#1A2332] mb-1">Revenue Trend</h3>
          <p className="text-xs text-[#9BAAB8] mb-4">Weekly Sales Performance</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F6" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9BAAB8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 11, fill: '#9BAAB8' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip
                formatter={(value) => [`₱${Number(value).toLocaleString()}`, 'Revenue']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3E8' }}
              />
              <Bar dataKey="revenue" fill="#D92F2F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category donut */}
        <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#1A2332] mb-1">Orders by Category</h3>
          <p className="text-xs text-[#9BAAB8] mb-2">Food category breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Share']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3E8' }} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="space-y-1.5 mt-1">
            {categoryData.map(cat => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-xs text-[#6B7A8D]">{cat.name}</span>
                </div>
                <span className="text-xs font-semibold text-[#1A2332]">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top selling dishes */}
        <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#1A2332] mb-1">Top Selling Dishes Today</h3>
          <p className="text-xs text-[#9BAAB8] mb-4">Most popular items by order count</p>
          <div className="space-y-3">
            {topDishes.map(dish => (
              <div key={dish.name} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  dish.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                  dish.rank === 2 ? 'bg-gray-100 text-gray-600' :
                  dish.rank === 3 ? 'bg-orange-100 text-orange-600' :
                  'bg-[#F4F6F8] text-[#9BAAB8]'
                }`}>
                  {dish.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#1A2332] truncate">{dish.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 bg-[#F4F6F8] rounded-full h-1.5">
                      <div
                        className="bg-[#D92F2F] h-1.5 rounded-full"
                        style={{ width: `${(dish.orders / topDishes[0].orders) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#9BAAB8] whitespace-nowrap">{dish.orders} orders</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-[#1A2332] whitespace-nowrap">{dish.revenue}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Staff performance */}
        <div className="bg-white border border-[#DDE3E8] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#1A2332] mb-1">Staff Operational Performance</h3>
          <p className="text-xs text-[#9BAAB8] mb-4">Efficiency and satisfaction metrics</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F0F3F6]">
                  {['Staff Member', 'Actions / Handled', 'Avg. Speed', 'CSAT'].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-[#6B7A8D] whitespace-nowrap pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map(staff => (
                  <tr key={staff.name} className="border-b border-[#F0F3F6] last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1E2A2F] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                          {staff.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-[#1A2332] whitespace-nowrap">{staff.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[#6B7A8D] whitespace-nowrap">{staff.actionsHandled}</td>
                    <td className="py-2.5 pr-3 text-xs text-[#6B7A8D] whitespace-nowrap">{staff.avgSpeed}</td>
                    <td className="py-2.5 text-xs font-semibold text-amber-600 whitespace-nowrap">{staff.csat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
