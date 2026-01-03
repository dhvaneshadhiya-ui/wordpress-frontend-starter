import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TrendingBar } from '@/components/TrendingBar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <TrendingBar />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}
