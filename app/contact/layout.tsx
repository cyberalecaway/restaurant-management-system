import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact HBA Kitchen',
  description: 'Questions about the HBA Kitchen menu or your order? Contact our team in Cebu, Philippines.',
};

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
