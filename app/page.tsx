'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import { ArrowDown, ArrowRight, Check, ChefHat, ChevronRight, Clock3, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getAuthSnapshot, setLocalAuthIndicator, signOutSupabase, subscribeToAuth } from '@/lib/auth-session';
import styles from './landing.module.css';
import { createClient } from '@/lib/supabase/client';
import { validateOrderItems } from '@/lib/input-validation.mjs';
import { useOnlineStatus } from '@/lib/use-online-status';
import { MenuPhoto } from '@/components/menu/MenuPhoto';
import { SignOutDialog } from '@/components/auth/SignOutDialog';

type Product = { id: string; name: string; description: string; price: number; image: string; category: string; availability: 'Available' | 'Sold Out'; stockQuantity: number };

const categoryId = (category: string) => `menu-${category.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
const MENU_CACHE_KEY = 'hba-menu-cache-v2';
const CART_CACHE_KEY = 'hba-cart-v1';
const CHECKOUT_KEY = 'hba-checkout-key-v1';

function readCachedMenu(): Product[] {
  try {
    const cached: unknown = JSON.parse(window.localStorage.getItem(MENU_CACHE_KEY) ?? '[]');
    if (!Array.isArray(cached) || cached.length > 500) return [];
    return cached.filter((item): item is Product => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.category === 'string' && typeof item.description === 'string' && Number.isFinite(Number(item.price)) && typeof item.image === 'string' && Number.isInteger(item.stockQuantity) && item.stockQuantity >= 0 && (item.availability === 'Available' || item.availability === 'Sold Out'));
  } catch {
    return [];
  }
}

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const authenticated = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => false);
  const online = useOnlineStatus();
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState('');
  const [menuIsStale, setMenuIsStale] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [activeCategory, setActiveCategory] = useState('Featured');
  const [toast, setToast] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cartDrawerRef = useRef<HTMLElement>(null);
  const cartCloseRef = useRef<HTMLButtonElement>(null);
  const lastCartTriggerRef = useRef<HTMLElement | null>(null);
  const checkoutKeyRef = useRef<string | null>(null);
  const [cartHydrated, setCartHydrated] = useState(false);
  const categories = useMemo(() => ['Featured', ...Array.from(new Set(products.map(product => product.category)))], [products]);
  const featuredDishes = useMemo(() => products.slice(0, 4).map((product, index) => ({ ...product, number: String(index + 1).padStart(2, '0') })), [products]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (!active || error) return;
        try { setLocalAuthIndicator(Boolean(data.user)); } catch { /* Keep the existing signed-in display if storage is blocked. */ }
      } catch { /* The storefront remains usable if the session check is offline. */ }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      if (!online) {
        const cachedMenu = readCachedMenu();
        if (active && cachedMenu.length) setProducts(cachedMenu);
        if (active) {
          setMenuIsStale(true);
          setMenuError(cachedMenu.length ? 'Offline: showing the last menu saved on this device. Ordering will be available after prices are refreshed.' : 'You are offline and no saved menu is available on this device. Reconnect to load the menu.');
          setMenuLoading(false);
        }
        return;
      }
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('menu_items').select('id,name,description,price,image_url,category,availability,stock_quantity').order('name').limit(500);
        if (error) throw error;
        if (!active) return;
        const productsFromDatabase = (data ?? []).map(row => ({ id: row.id, name: row.name, description: row.description, price: Number(row.price), image: row.image_url ?? '', category: row.category, availability: row.availability, stockQuantity: Number(row.stock_quantity ?? 0) }));
        setProducts(productsFromDatabase);
        setMenuIsStale(false);
        try { window.localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(productsFromDatabase)); } catch { /* Browsing still works when storage is unavailable. */ }
        setMenuError('');
      } catch (error) {
        if (active) {
          const cachedMenu = readCachedMenu();
          if (cachedMenu.length) { setProducts(cachedMenu); setMenuIsStale(true); }
          setMenuError(cachedMenu.length ? 'Showing the last menu saved on this device. It may be out of date.' : error instanceof Error ? error.message : 'Menu could not be loaded. Check your internet connection and Supabase setup.');
        }
      } finally {
        if (active) setMenuLoading(false);
      }
    }
    const timer = window.setTimeout(() => { void loadMenu(); }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [online]);

  useEffect(() => {
    if (!online) return;
    const supabase = createClient();
    let active = true;
    const channel = supabase.channel('customer-menu-stock').on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, async () => {
      const { data, error } = await supabase.from('menu_items').select('id,name,description,price,image_url,category,availability,stock_quantity').order('name').limit(500);
      if (error || !active) return;
      const current = (data ?? []).map(row => ({ id: row.id, name: row.name, description: row.description, price: Number(row.price), image: row.image_url ?? '', category: row.category, availability: row.availability, stockQuantity: Number(row.stock_quantity ?? 0) }));
      setProducts(current);
      try { window.localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(current)); } catch { /* Browsing remains available if storage is blocked. */ }
    }).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [online]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(CART_CACHE_KEY) ?? '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const safeCart = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[0] === 'string' && Number.isInteger(entry[1]) && Number(entry[1]) >= 1 && Number(entry[1]) <= 99));
          setCart(safeCart);
        }
        checkoutKeyRef.current = window.localStorage.getItem(CHECKOUT_KEY);
      } catch { /* Cart state remains empty if local storage is blocked or corrupt. */ }
      setCartHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    try { window.localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cart)); } catch { /* Cart remains usable for this page session. */ }
  }, [cart, cartHydrated]);

  useEffect(() => {
    if (!cartHydrated) return;
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('openCart') !== '1') return;
    const timer = window.setTimeout(() => {
      setCartOpen(true);
      currentUrl.searchParams.delete('openCart');
      window.history.replaceState({}, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cartHydrated]);

  useEffect(() => {
    if (!authenticated) return;
    let pendingId: string | null = null;
    try { pendingId = window.localStorage.getItem('hba-pending-product'); } catch { return; }
    const pendingProduct = products.find((product) => product.id === pendingId && product.availability === 'Available' && product.stockQuantity > 0);
    if (pendingProduct) {
      const timer = window.setTimeout(() => {
        setCart(current => ({ ...current, [pendingProduct.id]: Math.min(99, pendingProduct.stockQuantity, (current[pendingProduct.id] ?? 0) + 1) }));
        setToast(`${pendingProduct.name} added to your order`);
        try { window.localStorage.removeItem('hba-pending-product'); } catch { /* The product has already been added to in-memory cart state. */ }
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [authenticated, products]);
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 700], [0, reduceMotion ? 0 : 105]);
  const heroOpacity = useTransform(scrollY, [0, 580], [1, 0.42]);

  useEffect(() => {
    const lenis = reduceMotion ? null : new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.92 });
    lenisRef.current = lenis;
    let frame = 0;
    const raf = (time: number) => { lenis?.raf(time); if (lenis) frame = requestAnimationFrame(raf); };
    if (lenis) frame = requestAnimationFrame(raf);
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); lenis?.destroy(); lenisRef.current = null; };
  }, [reduceMotion]);

  useEffect(() => {
    const sections = categories.map((category) => document.getElementById(category === 'Featured' ? 'featured' : categoryId(category))).filter((section): section is HTMLElement => Boolean(section));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveCategory(visible.target.id === 'featured' ? 'Featured' : categories.find((category) => categoryId(category) === visible.target.id) ?? 'Featured');
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.15, 0.35] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    if (!cartOpen) return;
    const drawer = cartDrawerRef.current;
    cartCloseRef.current?.focus();
    const keepFocusInDrawer = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setCartOpen(false); return; }
      if (event.key !== 'Tab') return;
      const focusable = drawer?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keepFocusInDrawer);
    lenisRef.current?.stop();
    return () => { window.removeEventListener('keydown', keepFocusInDrawer); lenisRef.current?.start(); lastCartTriggerRef.current?.focus(); };
  }, [cartOpen]);

  const quantities = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = useMemo(() => products.reduce((sum, product) => sum + product.price * (cart[product.id] ?? 0), 0), [cart, products]);
  const cartProducts = products.filter((product) => cart[product.id]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try {
      await signOutSupabase();
      setCart({});
      setMenuOpen(false);
      setLogoutOpen(false);
      setToast('You have been signed out.');
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(''), 2800);
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

  const goTo = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (target && reduceMotion) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    else if (target && lenisRef.current) lenisRef.current.scrollTo(target, { offset: -76 });
    else target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  }, [reduceMotion]);
  const changeQuantity = (id: string, amount: number) => {
    checkoutKeyRef.current = null;
    try { window.localStorage.removeItem(CHECKOUT_KEY); } catch { /* Checkout remains protected for this page session. */ }
    setCart((current) => {
      const product = products.find(item => item.id === id);
      const limit = product ? Math.min(99, product.stockQuantity) : 99;
      const next = { ...current, [id]: Math.min(limit, Math.max(0, (current[id] ?? 0) + amount)) };
      if (!next[id]) delete next[id];
      return next;
    });
  };
  const addToCart = async (product: Product) => {
    if (product.availability !== 'Available' || product.stockQuantity <= 0) { setToast(`${product.name} is sold out`); return; }
    if ((cart[product.id] ?? 0) >= Math.min(99, product.stockQuantity)) { setToast(`Only ${product.stockQuantity} servings of ${product.name} are available`); return; }
    if (!online) {
      if (!authenticated) { setMenuError('You are offline. Sign in while connected before starting an order.'); return; }
      changeQuantity(product.id, 1);
      setToast(`${product.name} saved in your bag. Place the order when you are back online.`);
      return;
    }
    let hasSupabaseSession = false;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      hasSupabaseSession = Boolean(data.user);
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : 'We could not verify your sign-in. Please try again.');
      return;
    }
    if (!hasSupabaseSession) {
      setLocalAuthIndicator(false);
      try { window.localStorage.setItem('hba-pending-product', String(product.id)); } catch { /* The user can add the dish after signing in. */ }
      router.push('/login?next=%2F&reason=add-to-cart');
      return;
    }
    changeQuantity(product.id, 1);
    setToast(`${product.name} added to your order`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2300);
  };
  const submitOrder = async () => {
    if (!online) { setCheckoutError('You are offline. Your order has not been sent. Reconnect and try again.'); return; }
    if (menuIsStale) { setCheckoutError('Refresh the menu while online to confirm current prices and availability before ordering.'); return; }
    const unavailable = cartProducts.find(product => product.availability !== 'Available' || cart[product.id] > product.stockQuantity);
    if (unavailable) { setCheckoutError(`${unavailable.name} has only ${unavailable.stockQuantity} servings available. Please update your bag.`); return; }
    const orderItems = cartProducts.map(product => ({ menu_item_id: product.id, quantity: cart[product.id] }));
    const validationError = validateOrderItems(orderItems);
    if (validationError) { setCheckoutError(validationError); return; }
    setCheckingOut(true);
    setCheckoutError('');
    try {
      const supabase = createClient();
      let storedKey: string | null = null;
      try { storedKey = window.localStorage.getItem(CHECKOUT_KEY); } catch { /* Keep the idempotency key in memory for this session. */ }
      const checkoutKey = checkoutKeyRef.current ?? storedKey ?? globalThis.crypto.randomUUID();
      checkoutKeyRef.current = checkoutKey;
      try { window.localStorage.setItem(CHECKOUT_KEY, checkoutKey); } catch { /* Keep the idempotency key in memory for this session. */ }
      const { data, error } = await supabase.rpc('create_customer_order', {
        p_checkout_key: checkoutKey,
        p_items: orderItems,
        p_table_label: 'Takeout',
        p_notes: null,
      });
      if (error) {
        if (error.code === 'PGRST202' || error.code === '42883') throw new Error('Order processing is not installed in your Supabase database yet. Run supabase/quality-controls.sql in the SQL Editor, then retry.');
        throw error;
      }
      const created = Array.isArray(data) ? data[0] : data;
      setCart({});
      const { data: refreshedMenu } = await supabase.from('menu_items').select('id,name,description,price,image_url,category,availability,stock_quantity').order('name').limit(500);
      if (refreshedMenu) {
        const current = refreshedMenu.map(row => ({ id: row.id, name: row.name, description: row.description, price: Number(row.price), image: row.image_url ?? '', category: row.category, availability: row.availability, stockQuantity: Number(row.stock_quantity ?? 0) }));
        setProducts(current);
        try { window.localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(current)); } catch { /* The visible menu is still updated in memory. */ }
      }
      checkoutKeyRef.current = null;
      try { window.localStorage.removeItem(CHECKOUT_KEY); } catch { /* The saved bag is cleared below. */ }
      setCartOpen(false);
      setToast(`Order #${created?.order_number ?? ''} placed successfully`.trim());
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Your order could not be placed. Your bag is still saved; please retry.');
    } finally {
      setCheckingOut(false);
    }
  };
  const openCart = (event: React.MouseEvent<HTMLElement>) => {
    lastCartTriggerRef.current = event.currentTarget;
    setCartOpen(true);
  };

  const nav = [['HOME', 'home'], ['MENU', 'menu'], ['ABOUT', 'about'], ['CONTACT', 'contact']];
  return (
    <div className={styles.loggedOutFrame}>
      <div className={styles.page}>
      <header inert={cartOpen} className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
        <div className={styles.navInner}>
          <a className={styles.logoLink} href="#home" aria-label="HBA home" onClick={(event) => { event.preventDefault(); goTo('home'); }}>
            <Image src="/hbatube_logo.png.png" alt="HBA" width={512} height={512} priority className={styles.navLogo} />
          </a>
          <nav className={styles.desktopNav} aria-label="Main navigation">
            {nav.map(([label, id]) => <button key={id} className={styles.navLink} onClick={() => { if (id === 'contact') router.push('/contact'); else goTo(id); }}>{label}</button>)}
          </nav>
          {authenticated && <Link className={styles.authLink} href="/my-orders">MY ORDERS</Link>}
          <button className={styles.authLink} onClick={() => {
            if (authenticated) requestSignOut();
            else router.push('/login?next=%2F');
          }}>{authenticated ? 'SIGN OUT' : 'SIGN IN'}</button>
          <button className={styles.cartButton} onClick={openCart} aria-label={`Open cart, ${quantities} items`}>
            <ShoppingBag size={17} strokeWidth={1.8} /><span>YOUR BAG</span><motion.i key={quantities} aria-live="polite">{quantities}</motion.i>
          </button>
          <button className={styles.menuToggle} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span className={menuOpen ? styles.burgerTopOpen : ''} /><span className={menuOpen ? styles.burgerBottomOpen : ''} />
          </button>
        </div>
        <AnimatePresence>{menuOpen && <motion.nav className={styles.mobileNav} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} aria-label="Mobile navigation">
          {nav.map(([label, id], index) => <motion.button key={id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.045 }} onClick={() => { setMenuOpen(false); if (id === 'contact') router.push('/contact'); else goTo(id); }}>{label}<ArrowRight size={16} /></motion.button>)}
          {authenticated && <motion.button key="my-orders" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => { setMenuOpen(false); router.push('/my-orders'); }}>MY ORDERS<ArrowRight size={16} /></motion.button>}
          <motion.button key="auth" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => { if (authenticated) requestSignOut(); else { setMenuOpen(false); router.push('/login?next=%2F'); } }}>{authenticated ? 'SIGN OUT' : 'SIGN IN'}<ArrowRight size={16} /></motion.button>
        </motion.nav>}</AnimatePresence>
      </header>

      <main inert={cartOpen}>
        <section className={styles.hero} id="home">
          <motion.div className={styles.heroPhoto} style={{ y: heroY, opacity: heroOpacity }} />
          <div className={styles.heroShade} />
          <div className={styles.heroContent}>
            <motion.p className={styles.heroKicker} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}><span /> GOOD FOOD, GOOD COMPANY</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.2 }}>A little more<br />joy on your <em>plate.</em></motion.h1>
            <motion.p className={styles.heroDescription} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.32 }}>Thoughtfully made comfort food, with a little HBA heart in every bite.</motion.p>
            <motion.div className={styles.heroActions} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.42 }}>
              <button className={styles.primaryButton} onClick={() => goTo('menu')}>ORDER YOUR FAVORITES <ArrowRight size={16} /></button>
              <button className={styles.secondaryButton} onClick={() => goTo('menu')}>EXPLORE THE MENU <ArrowDown size={15} /></button>
            </motion.div>
          </div>
          <div className={styles.heroBottom}><span>MADE WITH HEART IN MANILA</span><span>01 — 08 <i /></span></div>
          <div className={styles.heroStamp}><span>FRESH</span><ChefHat size={20} /><span>ALWAYS</span></div>
        </section>

        <section className={styles.promise} id="about">
          <p><span className={styles.redDot} /> HBA KITCHEN <span className={styles.promiseLine} /> GOOD FOOD. GOOD MOOD. GOOD TO GO.</p>
          <span className={styles.promiseNote}>A table is always better when there’s something delicious in the middle.</span>
        </section>

        <section className={styles.featuredExperience} id="featured">
          <div className={styles.featuredHeader}><p className={styles.eyebrow}>A LITTLE SOMETHING FROM OUR KITCHEN</p><h2>Good food,<br /><em>made with care.</em></h2><span>SCROLL TO DISCOVER <ArrowDown size={13} /></span></div>
          {featuredDishes.map((dish, index) => <FeaturedDish key={dish.id} dish={dish} index={index} total={featuredDishes.length} quantity={cart[dish.id] ?? 0} onAdd={() => addToCart(dish)} onChange={(amount) => changeQuantity(dish.id, amount)} />)}
        </section>

        <section className={styles.menuSection} id="menu">
          <div className={styles.menuHeading}>
            <div><p className={styles.eyebrow}>MADE FRESH, JUST FOR YOU</p><h2>Find your <em>favorite.</em></h2></div>
            <p className={styles.menuIntro}>A few good things from our kitchen.<br />Pick what you love; we’ll take it from here.</p>
          </div>
          <nav className={styles.categoryBar} aria-label="Menu categories">
            {categories.map((category) => <button type="button" key={category} aria-current={activeCategory === category ? 'location' : undefined} className={activeCategory === category ? styles.categoryActive : ''} onClick={() => { setActiveCategory(category); if (category === 'Featured') goTo('featured'); else goTo(categoryId(category)); }}>{category}<span>{category === 'Featured' ? String(featuredDishes.length).padStart(2, '0') : String(products.filter((p) => p.category === category).length).padStart(2, '0')}</span></button>)}
          </nav>
          <div className={styles.featuredIntro}><span>01 / THE HBA FAVORITES</span><p>House favorites, all in one place.</p></div>
          {menuError && <p className={styles.menuIntro} role="alert">{menuError}</p>}
          {!online && <p className={styles.menuIntro} role="status">You are offline. The saved menu can be browsed, and signed-in customers can keep a bag on this device. Orders are sent when you place them online.</p>}
          {menuLoading ? <p className={styles.menuIntro} role="status">Loading today’s menu…</p> : products.length === 0 ? <p className={styles.menuIntro}>{menuError ? 'The menu is temporarily unavailable.' : 'Our menu is being prepared. Please check back soon.'}</p> : null}
          {categories.slice(1).map((category) => {
            const items = products.filter((product) => product.category === category);
            return <div className={styles.categorySection} id={categoryId(category)} key={category}>
              <div className={styles.categoryHeading}><h3>{category}</h3><span>{String(items.length).padStart(2, '0')} ITEMS</span></div>
              <div className={styles.productGrid}>
                {items.map((product, index) => <motion.article className={styles.productCard} key={product.id} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.55, delay: index * 0.07 }}>
                  <div className={styles.productImageWrap}>
                    <MenuPhoto source={product.image} alt={product.name} className={styles.productImage} sizes="(max-width: 680px) 90vw, (max-width: 1000px) 45vw, 30vw" fallbackClassName={styles.imagePending} fallback={<><ChefHat size={22} aria-hidden="true" /><span>PHOTO TO BE ADDED</span></>} />
                    {cart[product.id] ? <span className={styles.inBag}><Check size={12} /> IN YOUR BAG · {cart[product.id]}</span> : null}
                  </div>
                  <div className={styles.productInfo}><div className={styles.productTitle}><h4>{product.name}</h4><span>₱{product.price}</span></div><p>{product.description}</p>
                    <p className={styles.freshNote}>{product.availability !== 'Available' || product.stockQuantity === 0 ? 'SOLD OUT' : `${product.stockQuantity} servings available`}</p>
                    <div className={styles.productActions}>{cart[product.id] ? <div className={styles.quantityControl}><button onClick={() => changeQuantity(product.id, -1)} aria-label={`Remove one ${product.name}`}><Minus size={14} /></button><span>{cart[product.id]}</span><button disabled={cart[product.id] >= Math.min(99, product.stockQuantity)} onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}><Plus size={14} /></button></div> : <span className={styles.freshNote}><Clock3 size={13} /> MADE TO ORDER</span>}
                      <button className={styles.addButton} disabled={product.availability !== 'Available' || product.stockQuantity === 0 || (cart[product.id] ?? 0) >= Math.min(99, product.stockQuantity)} onClick={() => addToCart(product)}>{product.availability !== 'Available' || product.stockQuantity === 0 ? 'SOLD OUT' : cart[product.id] ? 'ADD ANOTHER' : 'ADD TO BAG'}<Plus size={14} /></button></div>
                  </div>
                </motion.article>)}
              </div>
            </div>;
          })}
        </section>

        <section className={styles.orderBanner}>
          <div><p className={styles.eyebrow}>YOUR TABLE IS WAITING</p><h2>Good food is<br />closer than you <em>think.</em></h2><button className={styles.bannerButton} onClick={() => goTo('menu')}>PICK YOUR PLATE <ArrowRight size={16} /></button></div>
          <div className={styles.bannerImage} role="img" aria-label="A freshly made meal ready to enjoy" />
          <span className={styles.bannerFoot}>A LITTLE HBA HEART IN EVERY BITE.</span>
        </section>
      </main>

      <footer inert={cartOpen} className={styles.footer} id="contact"><span className={styles.footerBrand}>HBA</span><span>GOOD FOOD, GOOD COMPANY.</span><nav className={styles.footerLinks} aria-label="Footer"><Link href="/privacy-policy">PRIVACY POLICY</Link><a href="#home" onClick={(event) => { event.preventDefault(); goTo('home'); }}>BACK TO TOP ↑</a></nav><small>© 2026 HBA KITCHEN · MADE WITH CARE.</small></footer>

      <AnimatePresence>{toast && <motion.div className={styles.toast} role="status" aria-live="polite" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}><span><Check size={15} /></span>{toast}<button aria-label="Dismiss" onClick={() => setToast('')}><X size={14} /></button></motion.div>}</AnimatePresence>

      <SignOutDialog
        open={logoutOpen}
        pending={signingOut}
        error={logoutError}
        description={quantities > 0 ? `Your bag has ${quantities} ${quantities === 1 ? 'item' : 'items'}. Signing out will clear it from this device.` : 'You can sign back in at any time to continue using your account.'}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { void signOut(); }}
      />

      <AnimatePresence>{cartOpen && <>
        <motion.button className={styles.drawerBackdrop} aria-label="Close cart" onClick={() => setCartOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.aside ref={cartDrawerRef} className={styles.cartDrawer} role="dialog" aria-modal="true" aria-labelledby="cart-title" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 300 }}>
          <div className={styles.drawerHead}><div><p className={styles.eyebrow}>THE GOOD STUFF</p><h2 id="cart-title">Your order <span>({quantities})</span></h2></div><button ref={cartCloseRef} className={styles.closeButton} onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={21} /></button></div>
          {cartProducts.length ? <><div className={styles.cartItems}>{cartProducts.map((product) => <div className={styles.cartItem} key={product.id}><div className={styles.cartItemPhoto}><MenuPhoto source={product.image} alt="" sizes="76px" className="object-cover" fallbackClassName={styles.cartPhotoPending} fallback="NO PHOTO" /></div><div className={styles.cartItemCopy}><h3>{product.name}</h3><span>₱{product.price} <i>×</i> {cart[product.id]}</span><div className={styles.quantityControl}><button onClick={() => changeQuantity(product.id, -1)} aria-label={cart[product.id] === 1 ? `Remove ${product.name} from your order` : `Remove one ${product.name}`}><Minus size={13} /></button><span aria-live="polite">{cart[product.id]}</span><button disabled={cart[product.id] >= 99} onClick={() => changeQuantity(product.id, 1)} aria-label={`Add one ${product.name}`}><Plus size={13} /></button></div></div><strong>₱{product.price * cart[product.id]}</strong></div>)}</div>
            <div className={styles.drawerBottom}><div className={styles.subtotal}><span>Subtotal</span><strong>₱{subtotal}</strong></div><p>Taxes and delivery calculated at checkout.</p>{(!online || menuIsStale) && <p role="status" className={styles.menuIntro}>{!online ? 'You are offline. Your bag is saved on this device; place the order when you reconnect.' : 'Refresh the menu to confirm current prices and availability before ordering.'}</p>}{checkoutError && <p role="alert" className={styles.menuIntro}>{checkoutError}</p>}<button className={styles.checkoutButton} disabled={checkingOut || !online || menuIsStale} onClick={submitOrder}>{checkingOut ? 'PLACING ORDER…' : 'PLACE ORDER'} <ChevronRight size={17} /></button><button className={styles.continueShopping} onClick={() => setCartOpen(false)}>CONTINUE BROWSING</button></div></> : <div className={styles.emptyCart}><span><ShoppingBag size={24} /></span><h3>Something delicious<br />belongs in here.</h3><p>Take a look around and find your favorite.</p><button className={styles.primaryButton} onClick={() => { setCartOpen(false); goTo('menu'); }}>EXPLORE THE MENU <ArrowRight size={15} /></button></div>}
        </motion.aside>
      </>}</AnimatePresence>
      <button inert={cartOpen} className={styles.mobileCart} onClick={openCart} aria-label={`Open bag, ${quantities} items`}><ShoppingBag size={17} /> YOUR BAG <span aria-live="polite">{quantities}</span>{quantities > 0 && <b>₱{subtotal}</b>}</button>
      </div>
    </div>
  );
}

function FeaturedDish({ dish, index, total, quantity, onAdd, onChange }: { dish: Product & { number: string }; index: number; total: number; quantity: number; onAdd: () => void; onChange: (amount: number) => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [54, -54]);
  const imageScale = useTransform(scrollYProgress, [0, 0.25, 0.8, 1], reduceMotion ? [1, 1, 1, 1] : [0.9, 1, 1, 0.94]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.16, 0.84, 1], reduceMotion ? [1, 1, 1, 1] : [0.45, 1, 1, 0.55]);
  return <article ref={ref} className={`${styles.featuredDish} ${index % 2 ? styles.featuredDishReverse : ''}`}>
    <motion.div className={styles.featuredDishImageFrame} style={{ y: imageY, scale: imageScale, opacity: imageOpacity }}>
      <MenuPhoto source={dish.image} alt={dish.name} className={styles.featuredDishImage} sizes="(max-width: 700px) 100vw, 58vw" fallbackClassName={styles.featuredImagePending} fallback={<><ChefHat size={34} aria-hidden="true" /><span>UPLOAD THIS DISH PHOTO TO MENU IMAGES</span></>} />
      <span className={styles.featuredImageNumber}>{dish.number} / {String(total).padStart(2, '0')}</span>
      <span className={styles.featuredImageCaption}>FRESH FROM THE HBA KITCHEN</span>
    </motion.div>
    <motion.div className={styles.featuredDishCopy} initial={reduceMotion ? false : { opacity: 0, x: index % 2 ? -28 : 28 }} whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }} viewport={{ once: false, amount: 0.35 }} transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.2, 0.75, 0.25, 1] }}>
      <span className={styles.featuredDishNumber}>{dish.number} <i /> FEATURED DISH</span>
      <h3>{dish.name}</h3><p>{dish.description}</p>
      <strong className={styles.featuredPrice}>₱{dish.price}</strong>
      <span className={styles.stockNote}>{dish.availability !== 'Available' || dish.stockQuantity === 0 ? 'SOLD OUT' : `${dish.stockQuantity} servings available`}</span>
      {quantity ? <div className={styles.featuredOrderRow}><div className={styles.quantityControl}><button onClick={() => onChange(-1)} aria-label={`Remove one ${dish.name}`}><Minus size={15} /></button><span>{quantity}</span><button disabled={quantity >= Math.min(99, dish.stockQuantity)} onClick={() => onChange(1)} aria-label={`Add one ${dish.name}`}><Plus size={15} /></button></div><button className={styles.featuredAddButton} disabled={dish.availability !== 'Available' || dish.stockQuantity === 0 || quantity >= Math.min(99, dish.stockQuantity)} onClick={onAdd}>{dish.availability !== 'Available' || dish.stockQuantity === 0 ? 'SOLD OUT' : 'ADD ANOTHER'} <Plus size={15} /></button></div> : <button className={styles.featuredAddButton} disabled={dish.availability !== 'Available' || dish.stockQuantity === 0} onClick={onAdd}>{dish.availability !== 'Available' || dish.stockQuantity === 0 ? 'SOLD OUT' : 'ADD TO CART'} <ArrowRight size={15} /></button>}
      <span className={styles.scrollHint}>KEEP SCROLLING <ArrowDown size={13} /></span>
    </motion.div>
  </article>;
}
