import { ReactNode, useEffect } from 'react';
import { Header } from './Header';
import { TrendingBar } from './TrendingBar';

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
    <div className="min-h-screen bg-background">
      <Header />
      <TrendingBar />
      <main>{children}</main>
    </div>
  );
}
