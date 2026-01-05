import { ReactNode, useEffect, Suspense } from 'react';
import { Header } from './Header';
import { TrendingBar } from './TrendingBar';
import { Footer } from './Footer';
import { LoadingSkeleton } from './LoadingSkeleton';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={<LoadingSkeleton />}>
        <Header />
        <TrendingBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </Suspense>
    </div>
  );
}
