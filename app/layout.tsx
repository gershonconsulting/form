import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gershon Consulting — Client Onboarding',
  description: 'Complete your onboarding intake for Gershon Consulting.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
