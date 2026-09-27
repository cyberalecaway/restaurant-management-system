import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps { children: React.ReactNode }

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.authPage}>
      <aside className={styles.photoPanel}>
        <div className={styles.photoOverlay} />
        <Link className={styles.brand} href="/" aria-label="HBA Kitchen home">
          <Image src="/hbatube_logo.png.png" alt="HBA" width={512} height={512} priority />
          <span>HBA <i>KITCHEN</i></span>
        </Link>
        <div className={styles.story}>
          <span className={styles.kicker}><i /> THE HBA TABLE</span>
          <h2>Good food.<br />Good <em>company.</em></h2>
          <p>Come on in. There’s always a place for you here.</p>
        </div>
        <span className={styles.photoCaption}>MADE WITH HEART · MANILA, PH</span>
      </aside>
      <main className={styles.formPanel}>
        <div className={styles.formContent}>{children}</div>
        <footer className={styles.formFooter}><span>HBA KITCHEN</span><span>GOOD FOOD, GOOD COMPANY.</span><Link href="/privacy-policy">PRIVACY POLICY</Link></footer>
      </main>
    </div>
  );
}
