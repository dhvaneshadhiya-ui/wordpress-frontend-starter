import { ReactNode, useEffect } from 'react';
import { Header } from './Header';
import { TrendingBar } from './TrendingBar';
import { Footer } from './Footer';

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
      <Header />
      <TrendingBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
