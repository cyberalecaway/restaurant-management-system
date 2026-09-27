import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  searchPlaceholder?: string;
}

export function DashboardLayout({ children, searchPlaceholder }: DashboardLayoutProps) {
  return (
    <div className="rmsWorkspace flex h-dvh overflow-hidden bg-[#f6f5f1]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
