import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg?: string;
}

export function StatCard({ icon, label, value, iconBg = 'bg-red-50' }: StatCardProps) {
  return (
    <div className="bg-white border border-[#DDE3E8] rounded-lg p-4 shadow-sm flex items-center gap-4">
      <div className={`${iconBg} w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#6B7A8D] font-medium leading-tight">{label}</p>
        <p className="text-xl font-bold text-[#1A2332] leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}
