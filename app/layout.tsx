import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gershon Consulting — Client Onboarding',
  description: 'Complete your onboarding intake for Gershon Consulting.',
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
