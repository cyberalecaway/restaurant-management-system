import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { PopularItems } from '@/components/dashboard/PopularItems';
import { ShoppingCart, Banknote, Users, BookOpen } from 'lucide-react';

export default function DashboardPage() {
  return (
    <DashboardLayout searchPlaceholder="Search orders, staff, menu items...">
      {/* Welcome banner */}
      <div className="bg-[#1E2A2F] rounded-xl p-6 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-xl font-bold leading-tight">Welcome back, Admin!</h1>
          <p className="text-white/60 text-sm mt-1.5 leading-relaxed">
            Here is the current performance statement for HBA Filipino Restaurant for today.
          </p>
        </div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 bg-[#D92F2F] hover:bg-[#B82525] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
        >
          Manage Menu
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={<ShoppingCart size={20} className="text-[#D92F2F]" />}
          label="Total Orders"
          value="1,284"
          iconBg="bg-red-50"
        />
        <StatCard
          icon={<Banknote size={20} className="text-green-600" />}
          label="Revenue"
          value="₱186,450"
          iconBg="bg-green-50"
        />
        <StatCard
          icon={<Users size={20} className="text-blue-600" />}
          label="Active Staff"
          value="12"
          iconBg="bg-blue-50"
        />
        <StatCard
          icon={<BookOpen size={20} className="text-purple-600" />}
          label="Menu Items"
          value="32"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Lower section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <RecentOrders />
        </div>
        <div>
          <PopularItems />
        </div>
      </div>
    </DashboardLayout>
  );
}
