'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right';
  delay?: number; // ms
}

export default function AnimatedSection({
  children,
  className = '',
  animation = 'fade-up',
  delay = 0,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const base = 'transition-all duration-700 ease-out';

  const animations: Record<string, { from: string; to: string }> = {
    'fade-up': {
      from: 'opacity-0 translate-y-8',
      to: 'opacity-100 translate-y-0',
    },
    'fade-in': {
      from: 'opacity-0',
      to: 'opacity-100',
    },
    'slide-left': {
      from: 'opacity-0 -translate-x-8',
      to: 'opacity-100 translate-x-0',
    },
    'slide-right': {
      from: 'opacity-0 translate-x-8',
      to: 'opacity-100 translate-x-0',
    },
  };

  const { from, to } = animations[animation];

  return (
    <div
      ref={ref}
      className={`${base} ${visible ? to : from} ${className}`}
    >
      {children}
    </div>
  );
}
