'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@hba-bites.ph');
  const [emailSent, setEmailSent] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; newPassword?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setErrors({ email: 'Email is required.' }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrors({ email: 'Enter a valid email.' }); return; }
    setErrors({});
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    setEmailSent(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!newPassword) errs.newPassword = 'New password is required.';
    else if (newPassword.length < 8) errs.newPassword = 'Minimum 8 characters.';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
    setDone(true);
    setTimeout(() => router.push('/login'), 1500);
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[320px]">
        <div className="bg-white border border-[#DDE3E8] rounded-xl shadow-md p-7">
          {/* Logo */}
          <div className="flex justify-center mb-4">
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

          <h1 className="text-center text-base font-bold text-[#1A2332] mb-1">
            Reset Your Password
          </h1>
          <p className="text-center text-xs text-[#9BAAB8] mb-5">
            Complete both security steps below to update credentials
          </p>

          {done && (
            <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 text-center">
              Password updated! Redirecting to login…
            </div>
          )}

          {/* Step 1 */}
          <div className="bg-[#F8FAFC] border border-[#DDE3E8] rounded-lg p-4 mb-4">
            <p className="text-xs font-semibold text-[#1A2332] uppercase tracking-wide mb-3">
              Step 1 — Request OTP
            </p>
            <form onSubmit={handleRequestOTP} noValidate className="space-y-3">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="admin@hba-bites.ph"
                value={email}
                onChange={e => setEmail(e.target.value)}
                error={errors.email}
              />
              {!emailSent ? (
                <Button type="submit" variant="outline" size="sm" className="w-full" isLoading={loading}>
                  Send OTP
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                  <CheckCircle2 size={14} className="flex-shrink-0 text-green-600" />
                  OTP Sent Successfully
                </div>
              )}
            </form>
          </div>

          {/* Step 2 */}
          <div className={`bg-[#F8FAFC] border border-[#DDE3E8] rounded-lg p-4 ${!emailSent ? 'opacity-50 pointer-events-none' : ''}`}>
            <p className="text-xs font-semibold text-[#1A2332] uppercase tracking-wide mb-3">
              Step 2 — Define New Credentials
            </p>
            <form onSubmit={handleUpdate} noValidate className="space-y-3">
              <PasswordInput
                label="New Password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                error={errors.newPassword}
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
              />
              <Button type="submit" className="w-full" isLoading={loading} size="lg">
                Update Password
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-[#9BAAB8]">
            <Link href="/login" className="text-[#D92F2F] font-medium hover:underline">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
