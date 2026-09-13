'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface FormData {
  fullName: string;
  email: string;
  mobile: string;
  role: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  mobile?: string;
  role?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', mobile: '', role: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email.';
    if (!form.mobile.trim()) errs.mobile = 'Mobile number is required.';
    else if (!/^(09|\+639)\d{9}$/.test(form.mobile.replace(/\s/g, ''))) errs.mobile = 'Enter a valid PH mobile number.';
    if (!form.role) errs.role = 'Please select a role.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push('/otp'), 1200);
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
            Register RMS Account
          </h1>
          <p className="text-center text-xs text-[#9BAAB8] mb-5">
            Create staff/admin profile to join your branch
          </p>

          {success && (
            <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700">
              Account created! Redirecting to OTP verification…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Maria Clara"
              value={form.fullName}
              onChange={set('fullName')}
              error={errors.fullName}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. m.clara@hba-bites.ph"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
            />
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="e.g. 09171234567"
              value={form.mobile}
              onChange={set('mobile')}
              error={errors.mobile}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={set('role')}
              error={errors.role}
              placeholder="Select Staff/Admin Role"
              options={[
                { value: 'STAFF', label: 'Staff' },
                { value: 'ADMIN', label: 'Admin' },
              ]}
            />
            <PasswordInput
              label="Password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={errors.confirmPassword}
            />

            <Button type="submit" className="w-full mt-1" isLoading={loading} size="lg">
              Register
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-[#9BAAB8]">
            Already have an account?{' '}
            <Link href="/login" className="text-[#D92F2F] font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
