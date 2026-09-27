'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, LoaderCircle, Menu, Send, ShoppingBag, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { MenuPhoto } from '@/components/menu/MenuPhoto';
import { SignOutDialog } from '@/components/auth/SignOutDialog';
import { createClient } from '@/lib/supabase/client';
import { getAuthSnapshot, setLocalAuthIndicator, signOutSupabase, subscribeToAuth } from '@/lib/auth-session';
import { validateContactInput } from '@/lib/contact-validation.mjs';
import landing from '@/app/landing.module.css';
import styles from './contact.module.css';

type ContactFields = { name: string; email: string; subject: string; message: string };
type ContactErrors = Partial<Record<keyof ContactFields, string>>;

const INITIAL_FIELDS: ContactFields = { name: '', email: '', subject: '', message: '' };

function readBagCount() {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem('hba-cart-v1') ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
    return Object.values(value).reduce<number>((sum, quantity) => sum + (Number.isInteger(quantity) && Number(quantity) > 0 ? Number(quantity) : 0), 0);
  } catch {
    return 0;
  }
}

export default function ContactPage() {
  const router = useRouter();
  const authenticated = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bagCount, setBagCount] = useState(0);
  const [photoSource, setPhotoSource] = useState('');
  const [fields, setFields] = useState<ContactFields>(INITIAL_FIELDS);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [notice, setNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    let active = true;
    async function syncPageDetails() {
      setBagCount(readBagCount());
      try {
        const supabase = createClient();
        const [{ data: { user }, error: authError }, { data: dish }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('menu_items').select('image_url').eq('name', 'Chicken Adobo').maybeSingle(),
        ]);
        if (!active) return;
        if (!authError) {
          try { setLocalAuthIndicator(Boolean(user)); } catch { /* Contact browsing does not depend on browser storage. */ }
        }
        if (dish?.image_url) setPhotoSource(dish.image_url);
      } catch { /* Contact details and form work even if optional account/photo data is unavailable. */ }
    }
    void syncPageDetails();
    const updateBag = () => setBagCount(readBagCount());
    window.addEventListener('storage', updateBag);
    return () => { active = false; window.removeEventListener('storage', updateBag); };
  }, []);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try {
      await signOutSupabase();
      if (bagCount > 0) {
        try { window.localStorage.removeItem('hba-cart-v1'); } catch { /* Sign-out can complete even if browser storage is blocked. */ }
      }
      setBagCount(0);
      setLogoutOpen(false);
      router.replace('/login?next=%2Fcontact&signedOut=1');
    } catch {
      setLogoutError('We could not sign you out. Check your connection and try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const requestSignOut = () => {
    setLogoutError('');
    setLogoutOpen(true);
  };

  const setField = (field: keyof ContactFields) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields(current => ({ ...current, [field]: event.target.value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setNotice('');
    setSubmitError('');
  };

  const validate = () => {
    return validateContactInput(fields) as ContactErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendingRef.current) return;
    setNotice('');
    setSubmitError('');
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    sendingRef.current = true;
    setSending(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const { error } = await supabase.from('contact_messages').insert({
        user_id: user?.id ?? null,
        name: fields.name.trim(),
        email: fields.email.trim().toLowerCase(),
        subject: fields.subject.trim(),
        message: fields.message.trim(),
      });
      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          throw new Error('The contact form is not connected yet. Please email us directly while the site is being set up.');
        }
        throw new Error('We could not send your message. Please try again or email us directly.');
      }
      setFields(INITIAL_FIELDS);
      setErrors({});
      setNotice('Thank you. Your message has been sent to HBA Kitchen.');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We could not send your message. Please try again or email us directly.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const navItems = [
    { label: 'HOME', href: '/' },
    { label: 'MENU', href: '/#menu' },
    { label: 'ABOUT', href: '/#about' },
    { label: 'CONTACT', href: '/contact', current: true },
  ];

  return (
    <div className={styles.page}>
      <header className={`${landing.navbar} ${landing.navbarScrolled}`}>
        <div className={landing.navInner}>
          <Link className={landing.logoLink} href="/" aria-label="HBA Kitchen home">
            <Image src="/hbatube_logo.png.png" alt="HBA Kitchen" width={512} height={512} priority className={landing.navLogo} />
          </Link>
          <nav className={landing.desktopNav} aria-label="Customer navigation">
            {navItems.map(item => <Link key={item.label} href={item.href} aria-current={item.current ? 'page' : undefined} className={`${landing.navLink} ${item.current ? styles.currentNav : ''}`}>{item.label}</Link>)}
          </nav>
          {authenticated && <Link className={landing.authLink} href="/my-orders">MY ORDERS</Link>}
          <button className={landing.authLink} type="button" onClick={() => authenticated ? requestSignOut() : router.push('/login?next=%2Fcontact')}>
            {authenticated ? 'SIGN OUT' : 'SIGN IN'}
          </button>
          <Link className={landing.cartButton} href="/?openCart=1" aria-label={`Your bag, ${bagCount} items`}>
            <ShoppingBag size={17} strokeWidth={1.8} /><span>YOUR BAG</span><i>{bagCount}</i>
          </Link>
          <button className={landing.menuToggle} type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && <motion.nav className={styles.mobileMenu} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} aria-label="Mobile customer navigation">
            {navItems.map((item, index) => <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .04 }}><Link href={item.href} onClick={() => setMenuOpen(false)} aria-current={item.current ? 'page' : undefined}>{item.label}<ArrowRight size={16} /></Link></motion.div>)}
            {authenticated && <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}><Link href="/my-orders" onClick={() => setMenuOpen(false)}>MY ORDERS<ArrowRight size={16} /></Link></motion.div>}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <button type="button" onClick={() => authenticated ? requestSignOut() : (setMenuOpen(false), router.push('/login?next=%2Fcontact'))}>{authenticated ? 'SIGN OUT' : 'SIGN IN'}<ArrowRight size={16} /></button>
            </motion.div>
          </motion.nav>}
        </AnimatePresence>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="contact-title">
          <p className={styles.eyebrow}>GET IN TOUCH</p>
          <h1 id="contact-title">We&apos;d love to hear from you.</h1>
          <p>Have a question about our menu, orders, or HBA Kitchen? Send us a message and our team will get back to you.</p>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.details} aria-labelledby="contact-details-title">
            <h2 id="contact-details-title">Come say hello.</h2>
            <dl className={styles.detailList}>
              <div className={styles.detailItem}><dt>Email</dt><dd><a href="mailto:alecawayh@gmail.com">alecawayh@gmail.com</a></dd></div>
              <div className={styles.detailItem}><dt>Phone</dt><dd><a href="tel:09621792538">0962 179 2538</a></dd></div>
              <div className={styles.detailItem}><dt>Location</dt><dd>Cebu, Philippines</dd></div>
              <div className={styles.detailItem}><dt>Hours</dt><dd>Monday – Sunday<br />10:00 AM – 9:00 PM</dd></div>
            </dl>
            <div className={styles.photoFrame} aria-label="A taste of HBA Kitchen">
              <MenuPhoto source={photoSource} alt="Chicken Adobo from HBA Kitchen" className={styles.photo} sizes="(max-width: 650px) 100vw, 36vw" fallbackClassName={styles.photoFallback} fallback="Good food, good company." />
            </div>
          </section>

          <section className={styles.formPanel} aria-labelledby="message-title">
            <h2 id="message-title">Send us a message</h2>
            <p>Fill in the details below and our team will be in touch.</p>
            {notice && <p className={styles.notice} role="status" aria-live="polite">{notice}</p>}
            {submitError && <p className={`${styles.notice} ${styles.errorNotice}`} role="alert">{submitError} <a href="mailto:alecawayh@gmail.com">Email us</a>.</p>}
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <div className={styles.field}>
                <label htmlFor="contact-name">Name <span className={styles.required} aria-hidden="true">*</span></label>
                <input id="contact-name" name="name" autoComplete="name" value={fields.name} onChange={setField('name')} placeholder="Your name" maxLength={120} required aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'contact-name-error' : undefined} />
                {errors.name && <p id="contact-name-error" className={styles.fieldError} role="alert">{errors.name}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="contact-email">Email <span className={styles.required} aria-hidden="true">*</span></label>
                <input id="contact-email" name="email" type="email" inputMode="email" autoComplete="email" value={fields.email} onChange={setField('email')} placeholder="Your email" maxLength={254} required aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'contact-email-error' : undefined} />
                {errors.email && <p id="contact-email-error" className={styles.fieldError} role="alert">{errors.email}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="contact-subject">Subject <span className={styles.required} aria-hidden="true">*</span></label>
                <input id="contact-subject" name="subject" value={fields.subject} onChange={setField('subject')} placeholder="What is this about?" maxLength={160} required aria-required="true" aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? 'contact-subject-error' : undefined} />
                {errors.subject && <p id="contact-subject-error" className={styles.fieldError} role="alert">{errors.subject}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="contact-message">Message <span className={styles.required} aria-hidden="true">*</span></label>
                <textarea id="contact-message" name="message" value={fields.message} onChange={setField('message')} placeholder="Write your message..." maxLength={5000} required aria-required="true" aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'contact-message-error' : undefined} />
                {errors.message && <p id="contact-message-error" className={styles.fieldError} role="alert">{errors.message}</p>}
              </div>
              <button className={styles.sendButton} type="submit" disabled={sending}>
                {sending ? <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> SENDING…</> : <>SEND MESSAGE <Send size={16} aria-hidden="true" /></>}
              </button>
            </form>
          </section>
        </div>
      </main>

      <footer className={styles.footerContact}>
        <span>HBA KITCHEN · GOOD FOOD, GOOD COMPANY.</span>
        <nav aria-label="Footer navigation"><Link href="/privacy-policy">PRIVACY POLICY</Link><Link href="/">HOME <ArrowRight size={14} aria-hidden="true" /></Link></nav>
      </footer>
      <SignOutDialog
        open={logoutOpen}
        pending={signingOut}
        error={logoutError}
        description={bagCount > 0 ? `Your bag has ${bagCount} ${bagCount === 1 ? 'item' : 'items'}. Signing out will clear it from this device.` : 'You can sign back in at any time to continue using your account.'}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { void handleSignOut(); }}
      />
    </div>
  );
}
