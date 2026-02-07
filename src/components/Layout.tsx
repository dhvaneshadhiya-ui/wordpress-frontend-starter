import { ReactNode, useEffect } from 'react';
import { Header } from './Header';
import { DexertoNavigation } from './DexertoNavigation';
import { TrendingBar } from './TrendingBar';
import { Footer } from './Footer';
import { WPPost } from '@/lib/wordpress';

interface LayoutProps {
  children: ReactNode;
  posts?: WPPost[];
  useDexertoNav?: boolean;
}

export function Layout({ children, posts, useDexertoNav = false }: LayoutProps) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {useDexertoNav ? <DexertoNavigation /> : <Header />}
      {!useDexertoNav && <TrendingBar posts={posts} />}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
