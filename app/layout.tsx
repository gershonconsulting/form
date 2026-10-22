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

// Fonts are loaded here (in <head>) instead of an @import inside an inline <style>
// in GershonOnboarding.tsx — that inline @import was HTML-escaped on SSR and produced
// a bogus 404 request plus React hydration errors.
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
