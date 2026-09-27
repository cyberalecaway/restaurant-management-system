'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';

interface ContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase.from('contact_messages')
        .select('id,user_id,name,email,subject,message,created_at')
        .order('created_at', { ascending: false })
        .limit(250);
      if (queryError) {
        if (queryError.code === 'PGRST205' || queryError.code === '42P01') {
          throw new Error('The contact inbox is not set up yet. Run supabase/contact-messages.sql in the Supabase SQL Editor.');
        }
        throw new Error('Messages could not be loaded. Check your connection and staff access.');
      }
      setMessages((data ?? []) as ContactMessage[]);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Messages could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let removeChannel: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      try {
        const supabase = createClient();
        const refresh = async () => { if (active) await loadMessages(); };
        void refresh();
        const channel = supabase.channel('staff-contact-inbox').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, () => { void refresh(); }).subscribe();
        removeChannel = () => { void supabase.removeChannel(channel); };
      } catch {
        void loadMessages();
      }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); removeChannel?.(); };
  }, [loadMessages]);

  return (
    <DashboardLayout searchPlaceholder="Search messages...">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">Customer Messages</h1>
          <p className="mt-1 text-sm text-[#66716e]">Contact form submissions for HBA Kitchen</p>
        </div>
        <span className="text-sm font-medium text-[#66716e]">{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
      {loading ? <p role="status" className="py-12 text-center text-sm text-[#66716e]">Loading customer messages…</p> : messages.length === 0 ? (
        <section className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-[#e6e2d9] bg-[#fffefa] px-6 py-12 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f2eee7] text-[#b52530]"><MessageCircle size={25} aria-hidden="true" /></span>
          <h2 className="text-lg font-semibold text-[#202b2f]">No customer messages yet</h2>
          <p className="mt-2 max-w-md text-base leading-6 text-[#66716e]">Messages sent from the customer contact page will appear here.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {messages.map(message => <article key={message.id} className="rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-5 shadow-[0_2px_10px_rgba(32,43,47,0.04)] sm:p-6">
            <header className="flex flex-col justify-between gap-3 border-b border-[#efede7] pb-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[.13em] text-[#b52530]">Customer inquiry</p>
                <h2 className="mt-1 break-words text-lg font-semibold text-[#202b2f]">{message.subject}</h2>
                <p className="mt-1 text-sm text-[#66716e]">From {message.name} · {formatDate(message.created_at)}</p>
              </div>
              <a className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-[#d8d5cc] px-3 text-sm font-semibold text-[#8e202a] hover:bg-[#f7f6f2]" href={`mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}><Mail size={16} aria-hidden="true" /> Reply by email</a>
            </header>
            <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-[#343632]">{message.message}</p>
            <p className="mt-4 break-all text-sm text-[#66716e]">{message.email}</p>
            {message.user_id && <p className="mt-1 text-xs text-[#777872]">Submitted while signed in</p>}
          </article>)}
        </div>
      )}
    </DashboardLayout>
  );
}
