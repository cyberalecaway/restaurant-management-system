'use client';

import { MessageCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function MessagesPage() {
  return (
    <DashboardLayout searchPlaceholder="Search messages...">
      <div className="mb-5">
        <h1 className="text-lg font-bold text-[#1A2332]">Communication &amp; Messages</h1>
        <p className="mt-0.5 text-sm text-[#9BAAB8]">Internal team messaging</p>
      </div>
      <section className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-[#DDE3E8] bg-white px-6 py-12 text-center shadow-sm">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f7f6f2] text-[#66716e]"><MessageCircle size={25} /></span>
        <h2 className="text-base font-semibold text-[#1A2332]">Messaging is not connected yet</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#6B7A8D]">No messages have been stored. The current database has no conversation or message tables, so this page does not display sample chats or accept messages that would disappear after refresh.</p>
      </section>
    </DashboardLayout>
  );
}
