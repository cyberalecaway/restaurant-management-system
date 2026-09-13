import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  searchPlaceholder?: string;
}

export function DashboardLayout({ children, searchPlaceholder }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F8]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header searchPlaceholder={searchPlaceholder} />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
