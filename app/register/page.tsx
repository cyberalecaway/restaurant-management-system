'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '@/components/layout/AuthLayout.module.css';
import { createClient } from '@/lib/supabase/client';
import { setLocalAuthIndicator } from '@/lib/auth-session';
import { normalizeEmail, normalizeWhitespace, validateRegistrationInput } from '@/lib/input-validation.mjs';
import { useOnlineStatus } from '@/lib/use-online-status';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';

interface FormData {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', mobile: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const online = useOnlineStatus();

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }));
      setErrors(current => ({ ...current, [field]: undefined }));
      setSuccess(false);
    };
  }

  function validate(): FormErrors {
    return validateRegistrationInput(form) as FormErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!online) { setErrors({ email: 'You are offline. Reconnect before creating an account.' }); return; }
    setErrors({});
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(form.email),
        password: form.password,
        options: { data: { full_name: normalizeWhitespace(form.fullName), mobile: form.mobile.replace(/[\s()-]/g, '') }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
      });
      if (error) { setErrors({ email: error.message }); setLoading(false); return; }
      if (data.session) {
        setLocalAuthIndicator(true);
        router.push('/');
        return;
      }
      setSuccess(true);
    } catch (error) {
      setErrors({ email: error instanceof Error ? error.message : 'Unable to connect to Supabase.' });
    }
    setLoading(false);
  }

  return (
    <AuthLayout>
      <div className={styles.darkControls}>
        <div className={styles.formCard}>
          <p className={styles.formEyebrow}>JOIN THE HBA TABLE</p>
          <h1 className={styles.formTitle}>Create your<br />account<em>.</em></h1>
          <p className={styles.formSubtitle}>Create your HBA Kitchen customer account.</p>

          {success && (
            <div className={styles.successMessage} role="status" aria-live="polite">
              Account created. Check your email for a confirmation link before signing in.</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Maria Clara"
              value={form.fullName}
              onChange={set('fullName')}
              error={errors.fullName}
              autoComplete="name"
              maxLength={120}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. m.clara@hba-bites.ph"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
              maxLength={254}
              required
            />
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="e.g. 09171234567"
              value={form.mobile}
              onChange={set('mobile')}
              error={errors.mobile}
              autoComplete="tel"
              maxLength={20}
              required
            />
            <PasswordInput
              label="Password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              autoComplete="new-password"
              maxLength={128}
              required
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={errors.confirmPassword}
              autoComplete="new-password"
              maxLength={128}
              required
            />

            <Button type="submit" className="w-full mt-1" isLoading={loading} disabled={!online || success} size="lg">
              Register
            </Button>
          </form>
          <GoogleAuthButton online={online} disabled={loading || success} nextPath="/" />
          <p className={styles.formPrivacyNote}>Your details help us manage your account and orders. <Link href="/privacy-policy">Read our Privacy Policy</Link>.</p>
          {!online && <p role="status" className={styles.infoMessage}>Offline: account registration needs an internet connection.</p>}

          <p className={styles.formFooterLink}>
            Already have an account?{' '}
            <Link href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
