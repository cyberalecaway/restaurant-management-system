'use client';

import { useEffect, useRef } from 'react';
import { LogOut, LoaderCircle, X } from 'lucide-react';

interface SignOutDialogProps {
  open: boolean;
  pending: boolean;
  error?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SignOutDialog({
  open,
  pending,
  error = '',
  description = 'You can sign back in at any time to continue using your account.',
  onCancel,
  onConfirm,
}: SignOutDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const pendingRef = useRef(pending);

  useEffect(() => {
    onCancelRef.current = onCancel;
    pendingRef.current = pending;
  }, [onCancel, pending]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => confirmRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingRef.current) {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#111714]/65 p-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !pending) onCancel();
    }}>
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sign-out-title"
        aria-describedby="sign-out-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e9e4da] bg-[#fffefa] shadow-[0_24px_80px_rgba(0,0,0,.28)]"
      >
        <div className="flex items-start justify-between gap-5 px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fbe9e7] text-[#b82e35]">
              <LogOut size={21} aria-hidden="true" />
            </span>
            <div className="pt-0.5">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#a52e35]">HBA Kitchen</p>
              <h2 id="sign-out-title" className="mt-1 text-xl font-semibold tracking-tight text-[#202b2f]">Sign out?</h2>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={pending} aria-label="Keep me signed in" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#66716e] transition hover:bg-[#f3f1ec] hover:text-[#202b2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a52e35] disabled:cursor-not-allowed disabled:opacity-50">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 pb-6 sm:px-7 sm:pb-7">
          <p id="sign-out-description" className="text-[15px] leading-6 text-[#5e6966]">{description}</p>
          {error && <p role="alert" className="mt-4 rounded-lg border border-[#e8b8b5] bg-[#fff0ef] px-3.5 py-3 text-sm leading-5 text-[#92272d]">{error}</p>}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={pending} className="min-h-12 rounded-lg border border-[#d8d4cb] px-5 text-sm font-semibold text-[#303b3d] transition hover:bg-[#f3f1ec] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a52e35] disabled:cursor-not-allowed disabled:opacity-60">
              Keep me signed in
            </button>
            <button ref={confirmRef} type="button" onClick={onConfirm} disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#b82e35] px-5 text-sm font-semibold text-white transition hover:bg-[#9f252c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a52e35] disabled:cursor-wait disabled:opacity-75">
              {pending ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Signing out…</> : 'Sign out'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
