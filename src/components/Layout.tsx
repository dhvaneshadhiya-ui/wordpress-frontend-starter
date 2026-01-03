import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import TrendingBar from './TrendingBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <TrendingBar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
