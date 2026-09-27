'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { setLocalAuthIndicator } from '@/lib/auth-session';
import { ShieldCheck } from 'lucide-react';
import styles from '@/components/layout/AuthLayout.module.css';

const OTP_LENGTH = 6;

export default function OTPPage() {
  const router = useRouter();
  const [email, setEmail] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('email') ?? '');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp(current => current.map((currentDigit, currentIndex) => currentIndex === index ? digit : currentDigit));
    setError('');
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = otp.join('');
    if (!email.trim()) { setError('Enter the email address you registered with.'); return; }
    if (code.length !== OTP_LENGTH) { setError('Enter all 6 digits before continuing.'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'signup' });
      if (verifyError) { setError(verifyError.message); setLoading(false); return; }
      setLocalAuthIndicator(true);
      setSuccess(true);
      window.setTimeout(() => router.push('/'), 700);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify your email.');
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) { setError('Enter your email address before requesting a new code.'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
      if (resendError) setError(resendError.message);
      else { setSent(true); setError(''); }
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to resend the code.');
    }
    setLoading(false);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLFieldSetElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    setOtp(Array.from({ length: OTP_LENGTH }, (_, index) => pasted[index] ?? ''));
  }

  return <AuthLayout><div className={styles.darkControls}><div className={styles.formCard}>
    <p className={styles.formEyebrow}>EMAIL VERIFICATION</p><div className={styles.otpIcon}><ShieldCheck size={24} aria-hidden="true" /></div>
    <h1 className={styles.formTitle}>Verify your<br />account<em>.</em></h1>
    <p className={styles.formSubtitle}>Enter the one-time code sent to your email address.</p>
    {error && <div className={styles.errorMessage} role="alert">{error}</div>}
    {success && <div className={styles.successMessage} role="status">Email verified. Continuing to HBA Kitchen…</div>}
    {sent && <div className={styles.successMessage} role="status">A new confirmation code has been sent.</div>}
    <form onSubmit={handleVerify} noValidate className="space-y-4">
      <Input label="Email Address" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required />
      <fieldset onPaste={handlePaste} className={styles.otpFieldset}>
        <legend className={styles.otpLegend}>6-DIGIT VERIFICATION CODE</legend>
        <div className={styles.otpDigits}>{otp.map((digit, index) => <input key={index} ref={element => { inputRefs.current[index] = element; }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1} autoComplete={index === 0 ? 'one-time-code' : 'off'} value={digit} onChange={event => setDigit(index, event.target.value)} aria-label={`Verification digit ${index + 1} of ${OTP_LENGTH}`} required />)}</div>
      </fieldset>
      <Button type="submit" className="w-full" isLoading={loading} size="lg">Verify email</Button>
    </form>
    <button type="button" disabled={loading} onClick={handleResend} className="mt-4 min-h-11 w-full text-sm font-semibold text-[#d92f2f] hover:underline disabled:opacity-60">Resend confirmation code</button>
    <p className={styles.formFooterLink}><Link href="/register">Back to registration</Link></p>
  </div></div></AuthLayout>;
}
