import type { Metadata, Viewport } from 'next';
import { Providers } from '@/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'ManufactureIQ | Admin Dashboard',
  description: 'Enterprise Manufacturing Analytics & IoT Monitoring Platform',
};

export const viewport: Viewport = {
  themeColor: '#0a0b10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
