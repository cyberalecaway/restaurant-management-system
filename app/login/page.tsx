'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DEMO_CREDENTIALS } from '@/lib/mock-data';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Password is required.';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      router.push('/dashboard');
    } else {
      setErrors({ general: 'Invalid credentials. Use the demo account to sign in.' });
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[300px]">
        {/* Card */}
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
            Restaurant Management System
          </h1>
          <p className="text-center text-xs text-[#9BAAB8] mb-6">
            Sign in to manage your kitchen &amp; service
          </p>

          {errors.general && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600">
              {errors.general}
            </div>
          )}

          {/* Demo hint */}
          <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
            <p className="font-semibold mb-0.5">Demo Credentials</p>
            <p>{DEMO_CREDENTIALS.email}</p>
            <p>{DEMO_CREDENTIALS.password}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@hba-bites.ph"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
            />
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
            />

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#D92F2F]"
                />
                <span className="text-xs text-[#6B7A8D]">Remember device</span>
              </label>
              <Link href="/forgot-password" className="text-xs text-[#D92F2F] hover:underline font-medium">
                Forgot Password?
              </Link>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={loading} size="lg">
              Login
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-[#9BAAB8]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#D92F2F] font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
