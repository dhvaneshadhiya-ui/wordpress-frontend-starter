'use client';

import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NewsletterSignupProps {
  variant?: 'default' | 'compact';
}

export function NewsletterSignup({ variant = 'default' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI only - integrate with your email service
    if (email) {
      setSubmitted(true);
      setEmail('');
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 ${variant === 'compact' ? 'text-sm' : ''}`}>
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span className="text-foreground">Thanks for subscribing!</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm">
          Subscribe
        </Button>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Stay Updated</h3>
          <p className="text-sm text-muted-foreground">Get the latest articles in your inbox</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit">Subscribe</Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
