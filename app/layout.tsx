import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { TrendingBar } from '@/components/TrendingBar';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'iGeeksBlog - Apple News, How-To Guides, Tips & App Reviews',
    template: '%s | iGeeksBlog',
  },
  description: 'Your daily source for Apple news, how-to guides, tips, and app reviews.',
  metadataBase: new URL(process.env.SITE_URL || 'https://dev.igeeksblog.com'),
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'iGeeksBlog',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@igeeksblog',
    creator: '@igeeksblog',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <TrendingBar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
