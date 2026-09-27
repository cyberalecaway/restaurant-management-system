'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from '@/app/landing.module.css';

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 40;
      setScrolled((current) => current === nextScrolled ? current : nextScrolled);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver((entries) => {
      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio);

      if (visibleSections[0]) setActiveSection(visibleSections[0].target.id);
    }, { rootMargin: '-22% 0px -60% 0px', threshold: [0, 0.2, 0.5, 0.8] });

    navItems.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
      <div className={styles.navInner}>
        <Link className={styles.logoLink} href="#home" aria-label="HBA home" onClick={closeMenu}>
          <Image
            src="/hbatube_logo.png.png"
            alt="HBA"
            width={512}
            height={512}
            priority
            className={styles.navLogo}
          />
        </Link>

        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navItems.map((item) => (
            <a
              className={`${styles.navLink} ${activeSection === item.id ? styles.navLinkActive : ''}`}
              href={`#${item.id}`}
              aria-current={activeSection === item.id ? 'location' : undefined}
              key={item.id}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.navActions}>
          <Link className={styles.loginLink} href="/login">Login</Link>
          <Link className={styles.navCta} href="/register">Get started <span>↗</span></Link>
        </div>

        <button
          className={styles.menuToggle}
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="hba-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={23} strokeWidth={1.8} /> : <Menu size={23} strokeWidth={1.8} />}
        </button>
      </div>

      <nav
        id="hba-mobile-menu"
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        {navItems.map((item, index) => (
          <a
            className={`${styles.mobileNavLink} ${activeSection === item.id ? styles.mobileNavLinkActive : ''}`}
            href={`#${item.id}`}
            onClick={closeMenu}
            key={item.id}
            style={{ transitionDelay: menuOpen ? `${index * 35}ms` : '0ms' }}
          >
            <span>0{index + 1}</span>{item.label}
          </a>
        ))}
        <div className={styles.mobileActions}>
          <Link className={styles.mobileLogin} href="/login" onClick={closeMenu}>Login</Link>
          <Link className={styles.navCta} href="/register" onClick={closeMenu}>Get started <span>↗</span></Link>
        </div>
      </nav>
    </header>
  );
}