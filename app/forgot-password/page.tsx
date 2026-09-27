'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
import styles from '@/components/layout/AuthLayout.module.css';
import { createClient } from '@/lib/supabase/client';
import { setLocalAuthIndicator, signOutSupabase } from '@/lib/auth-session';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'recovery');
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
    try {
      const supabase = createClient();
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', '/forgot-password?mode=recovery');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callback.toString() });
      if (error) setErrors({ email: error.message });
      else setEmailSent(true);
    } catch (error) {
      setErrors({ email: error instanceof Error ? error.message : 'Unable to request a password reset.' });
    }
    setLoading(false);
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
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setErrors({ newPassword: error.message }); setLoading(false); return; }
      try { await signOutSupabase(); } catch { setLocalAuthIndicator(false); }
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (error) {
      setErrors({ newPassword: error instanceof Error ? error.message : 'Unable to update your password.' });
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className={styles.darkControls}>
        <div className={styles.formCard}>
          <p className={styles.formEyebrow}>ACCOUNT RECOVERY</p>
          <h1 className={styles.formTitle}>Reset your<br />password<em>.</em></h1>
          <p className={styles.formSubtitle}>Verify your email and choose a new password for your HBA account.</p>

          {done && (
            <div className={styles.successMessage} role="status" aria-live="polite">
              Password updated! Redirecting to login…
            </div>
          )}

          <div className={styles.stepCard}>
            <p className={styles.stepTitle}>
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
                autoComplete="email"
                required
              />
              {!emailSent ? (
                <Button type="submit" variant="outline" size="sm" className="w-full" isLoading={loading}>
                  Send OTP
                </Button>
              ) : (
                <>
                  <div role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <CheckCircle2 size={18} className="flex-shrink-0 text-green-600" />
                    Code request sent. Check your inbox.
                  </div>
                  <button type="button" className={styles.switchEmail} onClick={() => { setEmailSent(false); setNewPassword(''); setConfirmPassword(''); setErrors({}); }}>Use a different email</button>
                </>
              )}
            </form>
          </div>

          {/* Step 2 */}
          <div className={styles.stepCard}>
            <p className={styles.stepTitle}>
              Step 2 — Define New Credentials
            </p>
            <fieldset disabled={!emailSent} className={styles.resetFieldset} aria-describedby={!emailSent ? 'otp-help' : undefined}>
              {!emailSent && <p id="otp-help" className={styles.formSubtitle}>Request an email code above to unlock password changes.</p>}
              <form onSubmit={handleUpdate} noValidate className="space-y-3">
                <PasswordInput label="New Password" placeholder="At least 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} error={errors.newPassword} autoComplete="new-password" required />
                <PasswordInput label="Confirm New Password" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} error={errors.confirmPassword} autoComplete="new-password" required />
                <Button type="submit" className="w-full" isLoading={loading} size="lg">Update Password</Button>
              </form>
            </fieldset>
          </div>

          <p className={styles.formFooterLink}>
            <Link href="/login">
              ← Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
