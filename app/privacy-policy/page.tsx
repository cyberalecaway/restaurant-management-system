import Link from 'next/link';
import type { Metadata } from 'next';
import styles from './privacy-policy.module.css';

export const metadata: Metadata = {
  title: 'Privacy Policy | HBA Kitchen',
  description: 'Learn what information HBA Kitchen processes when you create an account, place an order, or send a contact message.',
};

const sections = [
  ['information', 'Information we process'],
  ['use', 'How we use information'],
  ['sharing', 'Who may receive it'],
  ['storage', 'Storage and retention'],
  ['choices', 'Your choices and rights'],
  ['security', 'Security'],
  ['contact', 'Questions and requests'],
];

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="HBA Kitchen home">
          <span className={styles.brandMark}>HBA</span>
          <span>HBA <i>KITCHEN</i></span>
        </Link>
        <Link href="/" className={styles.homeLink}>Back to HBA Kitchen</Link>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>THE HBA TABLE · PRIVACY</p>
        <h1>Your privacy,<br /><em>handled with care.</em></h1>
        <p className={styles.intro}>This notice explains how HBA Filipino Restaurant (“HBA Kitchen,” “we,” or “us”) handles information when you browse this site, create an account, or place an order.</p>
        <p className={styles.updated}>Effective date: September 27, 2026</p>
      </section>

      <div className={styles.contentLayout}>
        <nav className={styles.contents} aria-label="Privacy policy sections">
          <p>IN THIS POLICY</p>
          {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <article className={styles.article}>
          <section id="information">
            <span className={styles.sectionNumber}>01</span>
            <h2>Information we process</h2>
            <p><strong>Account details.</strong> When you register, we process your name, email address, and mobile number. Supabase Authentication handles sign-in credentials and session data; restaurant staff cannot view your password.</p>
            <p><strong>Google sign-in.</strong> If you choose Google, Google shares account information such as your name and email through Supabase. Google may also provide a profile image. We use the available name and email for your HBA profile; authentication provider data may remain in your Supabase account record.</p>
            <p><strong>Orders.</strong> We process the account connected to the order, customer name and email, selected menu items, quantities, prices, subtotal, order status, date and time, and any order notes or table/fulfillment label entered in the system. The current ordering flow does not ask for a payment card number or delivery address.</p>
            <p><strong>Restaurant operations.</strong> The system may record staff account identifiers, actions, notes, and timestamps in operational activity records to help authorized staff manage service and investigate issues.</p>
            <p><strong>Contact messages.</strong> When you use the contact form, we store your name, email address, subject, message, submission time, and your account ID if you are signed in. Guests can also contact us without creating an account.</p>
            <p><strong>Your browser.</strong> The site uses browser storage for your sign-in session and may save your bag, a menu cache, a pending item, and an order retry key on your device. Clearing site data may sign you out and remove the saved bag or cached menu.</p>
          </section>

          <section id="use">
            <span className={styles.sectionNumber}>02</span>
            <h2>How we use information</h2>
            <p>We use information to create and secure accounts, authenticate customers and staff, receive and manage orders, prepare and fulfill restaurant service, respond to customer requests, maintain operational records, troubleshoot the site, and meet applicable legal obligations.</p>
            <p>We do not sell personal information or use this site for targeted advertising. The current app does not integrate an online card payment service.</p>
          </section>

          <section id="sharing">
            <span className={styles.sectionNumber}>03</span>
            <h2>Who may receive it</h2>
            <ul>
              <li><strong>Authorized HBA staff.</strong> Staff and administrators can access information needed for their restaurant role. Customer orders are associated with the customer account and protected by the app’s access rules.</li>
              <li><strong>Contact messages.</strong> Authorized staff and administrators can read contact form submissions. Customers cannot read stored messages through the website.</li>
              <li><strong>Supabase.</strong> The app uses Supabase for authentication and database hosting, so account, order, and contact information is processed by Supabase to provide the service.</li>
              <li><strong>Google.</strong> If you select Google sign-in, Google processes the authentication request under its own privacy terms.</li>
              <li><strong>Image providers.</strong> Some decorative or menu images load from Unsplash or another image host configured for a menu item. When your browser requests an image, that host may receive ordinary connection details such as your IP address and browser request information.</li>
              <li><strong>Legal or safety needs.</strong> We may disclose information where required by law or where reasonably necessary to protect users, the restaurant, or the service.</li>
            </ul>
          </section>

          <section id="storage">
            <span className={styles.sectionNumber}>04</span>
            <h2>Storage and retention</h2>
            <p>Account and order records are stored in the restaurant’s Supabase project. We keep them while needed to provide the service, manage orders and accounts, maintain business records, resolve disputes, protect the system, and meet legal obligations. Different records may need to be kept for different periods; the app does not currently publish a fixed automatic deletion schedule.</p>
            <p>Contact messages are retained in the HBA Supabase project while needed to respond and maintain restaurant records; the app does not currently publish a fixed automatic deletion schedule.</p>
            <p>Bag and menu cache data stored in your browser remains on that device until it is removed, replaced, or cleared through your browser settings.</p>
          </section>

          <section id="choices">
            <span className={styles.sectionNumber}>05</span>
            <h2>Your choices and rights</h2>
            <p>You can choose whether to use Google sign-in, and you can clear locally saved site data in your browser. You may also ask us to provide access to, correct, or delete or block personal information, object to certain processing, or provide a portable copy where applicable under law. We may need to verify your identity before acting on a request, and some records may need to be retained for legal or business purposes.</p>
            <p>The National Privacy Commission explains data subject rights under the Philippine Data Privacy Act. You may also contact the Commission if you believe your privacy rights have been violated.</p>
            <a className={styles.externalLink} href="https://privacy.gov.ph/data-subject-rights/" target="_blank" rel="noreferrer">National Privacy Commission · Data Subject Rights <span aria-hidden="true">↗</span></a>
          </section>

          <section id="security">
            <span className={styles.sectionNumber}>06</span>
            <h2>Security</h2>
            <p>We use Supabase authentication, role checks, and database access policies to limit access to account and order information. No website or internet transmission can be guaranteed completely secure, so please keep your password private and do not share one-time codes.</p>
          </section>

          <section id="contact">
            <span className={styles.sectionNumber}>07</span>
            <h2>Questions and requests</h2>
            <p>For a privacy question or request, email <a href="mailto:alecawayh@gmail.com">alecawayh@gmail.com</a> or write to us through the contact page. Include the email address used for your account and describe what you need; never send your password or sign-in code.</p>
            <p>We may update this notice when the service or its data practices change. The effective date at the top shows the latest revision.</p>
          </section>

          <div className={styles.articleEnd}><span>HBA</span><p>GOOD FOOD, GOOD COMPANY.</p><Link href="/">Return to HBA Kitchen <span aria-hidden="true">→</span></Link></div>
        </article>
      </div>
      <footer className={styles.footer}><span>HBA KITCHEN · MANILA, PH</span><Link href="/">HOME</Link><span>© 2026 HBA KITCHEN</span></footer>
    </main>
  );
}
