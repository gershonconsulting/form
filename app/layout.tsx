import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://welcome.gershon.ai'),
  title: 'Welcome by Gershon.AI',
  description: 'Complete your onboarding intake for Gershon Consulting.',
  applicationName: 'Welcome by Gershon.AI',
  alternates: { canonical: 'https://welcome.gershon.ai/' },
  openGraph: {
    title: 'Welcome by Gershon.AI',
    description: 'Complete your onboarding intake for Gershon Consulting.',
    url: 'https://welcome.gershon.ai/',
    siteName: 'Welcome by Gershon.AI',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

// Unified Gershon design: system font stack (same as Linalysis) — no web fonts to load.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
