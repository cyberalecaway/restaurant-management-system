'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { DEMO_OTP } from '@/lib/mock-data';
import { ShieldCheck } from 'lucide-react';

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 59;

export default function OTPPage() {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length) {
      const newOtp = Array(OTP_LENGTH).fill('');
      pasted.split('').forEach((char, i) => { newOtp[i] = char; });
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    setOtp(Array(OTP_LENGTH).fill(''));
    setError('');
    setCountdown(COUNTDOWN_SECONDS);
    setCanResend(false);
    inputRefs.current[0]?.focus();
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    if (code === DEMO_OTP) {
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1000);
    } else {
      setError(`Invalid OTP. Use demo code: ${DEMO_OTP}`);
      setLoading(false);
    }
  }

  const formatted = String(countdown).padStart(2, '0');

  return (
    <AuthLayout>
      <div className="w-full max-w-[300px]">
        <div className="bg-white border border-[#DDE3E8] rounded-xl shadow-md p-7">
          {/* Logo */}
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-[#DDE3E8] shadow-sm">
              <Image
                src="/hbatube_logo.png.png"
                alt="HBA Logo"
                width={56}
                height={56}
                className="object-contain w-full h-full"
              />
            </div>
          </div>

          {/* Verification icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center">
              <ShieldCheck size={28} className="text-[#D92F2F]" />
            </div>
          </div>

          <h1 className="text-center text-base font-bold text-[#1A2332] mb-1">
            Verify Your Account
          </h1>
          <p className="text-center text-xs text-[#9BAAB8] mb-6 leading-relaxed">
            We sent a 6-digit verification code to your email/phone. Enter it below to proceed.
          </p>

          {/* Demo hint */}
          <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 text-center">
            Demo OTP: <span className="font-bold tracking-widest">{DEMO_OTP}</span>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 text-center">
              Verified! Redirecting…
            </div>
          )}

          {/* OTP inputs */}
          <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`
                  w-10 h-11 text-center text-base font-bold rounded-md border outline-none transition-colors
                  ${digit ? 'border-[#D92F2F] bg-red-50 text-[#D92F2F]' : 'border-[#DDE3E8] bg-white text-[#1A2332]'}
                  focus:border-[#D92F2F] focus:ring-2 focus:ring-red-100
                `}
              />
            ))}
          </div>

          <Button onClick={handleVerify} className="w-full" isLoading={loading} size="lg">
            Verify OTP
          </Button>

          {/* Resend */}
          <div className="mt-4 text-center space-y-1">
            {!canResend && (
              <p className="text-xs text-[#9BAAB8]">
                Resend in <span className="font-semibold text-[#1A2332]">00:{formatted}</span>
              </p>
            )}
            <button
              onClick={handleResend}
              disabled={!canResend}
              className="text-xs text-[#D92F2F] font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Resend OTP
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-[#9BAAB8]">
            <Link href="/login" className="text-[#D92F2F] font-medium hover:underline">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
