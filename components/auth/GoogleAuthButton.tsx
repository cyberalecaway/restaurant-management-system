'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '@/components/layout/AuthLayout.module.css';
import { safeNextPath } from '@/lib/safe-next-path.mjs';

interface GoogleAuthButtonProps {
  online: boolean;
  disabled?: boolean;
  nextPath?: string | null;
}

export function GoogleAuthButton({ online, disabled = false, nextPath }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    if (!online || disabled || loading) return;
    setError('');
    setLoading(true);
    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      const safeNext = safeNextPath(nextPath, window.location.origin);
      callbackUrl.searchParams.set('next', safeNext);
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString() },
      });
      if (authError) throw authError;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to start Google sign-in.';
      setError(message.toLowerCase().includes('provider') && message.toLowerCase().includes('not enabled')
        ? 'Google sign-in is not enabled in Supabase yet. Enable it in Authentication settings.'
        : message);
      setLoading(false);
    }
  }

  return <>
    {error && <p role="alert" className={styles.errorMessage}>{error}</p>}
    <div className={styles.socialDivider}><span>or</span></div>
    <div className={styles.socialButtons}>
      <button type="button" className={styles.socialButton} onClick={() => void signInWithGoogle()} disabled={!online || disabled || loading}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.88c-.58 2.96-2.24 5.47-4.7 7.16l7.19 5.59c4.2-3.87 6.61-9.57 6.61-17.22Z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.79l-7.19-5.59c-2 1.35-4.56 2.15-8.71 2.15-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
        {loading ? 'Connecting to Google...' : 'Continue with Google'}
      </button>
    </div>
  </>;
}
