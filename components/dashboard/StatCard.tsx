import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg?: string;
}

export function StatCard({ icon, label, value, iconBg = 'bg-red-50' }: StatCardProps) {
  return (
    <div className="bg-[#fffefa] border border-[#e6e2d9] rounded-xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(32,43,47,0.04)] flex items-center gap-4 min-h-[106px]">
      <div className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-[#5e6966] font-medium leading-tight">{label}</p>
        <p className="text-2xl sm:text-[30px] font-bold tracking-tight text-[#202b2f] leading-tight mt-1">{value}</p>
      </div>
    </div>
  );
}
