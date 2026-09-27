'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from '@/components/layout/AuthLayout.module.css';
import { setLocalAuthIndicator } from '@/lib/auth-session';
import { createClient } from '@/lib/supabase/client';
import { normalizeEmail, validateLoginInput } from '@/lib/input-validation.mjs';
import { useOnlineStatus } from '@/lib/use-online-status';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { safeNextPath } from '@/lib/safe-next-path.mjs';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cartSignIn = searchParams.get('reason') === 'add-to-cart';
  const callbackError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);
  const online = useOnlineStatus();

  function validate() {
    return validateLoginInput(email, password) as typeof errors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    if (!online) { setErrors({ general: 'You are offline. Reconnect before signing in.' }); return; }
    setErrors({});
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
      if (error) {
        setErrors({ general: error.message === 'Invalid login credentials' ? 'Your email or password is incorrect. Check your details and try again.' : error.message });
        setLoading(false);
        return;
      }
      setLocalAuthIndicator(true);
      const requestedPage = new URLSearchParams(window.location.search).get('next');
      router.push(requestedPage ? safeNextPath(requestedPage, window.location.origin) : '/dashboard');
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Unable to connect to Supabase.' });
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className={styles.darkControls}>
        <div className={styles.formCard}>
          <p className={styles.formHomeLink}><Link href="/">HBA Kitchen home</Link></p>
          <p className={styles.formEyebrow}>YOUR HBA ACCOUNT</p>
          <h1 className={styles.formTitle}>Welcome back<em>.</em></h1>
          <p className={styles.formSubtitle}>Sign in to order from HBA Kitchen or manage restaurant operations.</p>

          {cartSignIn && <div className={styles.infoMessage} role="status">Sign in to add your selected dish. We’ll put it in your bag when you return.</div>}

          {errors.general && <div role="alert" className={styles.errorMessage}>{errors.general}</div>}
          {callbackError === 'oauth' && <div role="alert" className={styles.errorMessage}>Google sign-in was canceled or could not be completed. Try again or use email and password.</div>}
          {callbackError === 'auth' && <div role="alert" className={styles.errorMessage}>Authentication could not be completed. Please retry; the sign-in request or confirmation link may have expired.</div>}
          {callbackError === 'confirmation' && <div role="alert" className={styles.errorMessage}>This sign-in link could not be verified. Request a new confirmation or recovery link and try again.</div>}
          {!online && <div role="status" className={styles.infoMessage}>Offline: sign in needs an internet connection.</div>}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <Input label="Email Address" type="email" placeholder="admin@hba-bites.ph" value={email} onChange={(event) => { setEmail(event.target.value); setErrors(current => ({ ...current, email: undefined, general: undefined })); }} error={errors.email} autoComplete="email" maxLength={254} required />
            <PasswordInput label="Password" placeholder="Enter your password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors(current => ({ ...current, password: undefined, general: undefined })); }} error={errors.password} autoComplete="current-password" maxLength={128} required />
            <div className="flex items-center justify-end pt-1">
              <Link href="/forgot-password" className="text-xs text-[#D92F2F] hover:underline font-medium">Forgot Password?</Link>
            </div>
            <Button type="submit" className="w-full mt-2" isLoading={loading} disabled={!online} size="lg">Log In</Button>
          </form>

          <GoogleAuthButton online={online} disabled={loading} nextPath={searchParams.get('next') ?? '/dashboard'} />
          <p className={styles.formFooterLink}>Don&apos;t have an account?{' '}<Link href="/register">Sign Up</Link></p>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLayout><p className={styles.formSubtitle}>Loading sign in…</p></AuthLayout>}>
      <LoginForm />
    </Suspense>
  );
}
