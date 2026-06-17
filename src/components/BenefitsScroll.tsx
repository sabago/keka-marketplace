'use client';

import { useEffect, useRef } from 'react';
import {
  ShieldCheck,
  ShoppingBag,
  Clock,
  FileCheck,
  TrendingUp,
  Users,
  ClipboardList,
  BadgeCheck,
  Zap,
  Lock,
} from 'lucide-react';

const benefits = [
  { icon: ShoppingBag,   text: 'Buy policies & templates in the Marketplace' },
  { icon: ShieldCheck,   text: 'Stay audit-ready, always' },
  { icon: Clock,         text: 'Save hours on credential tracking' },
  { icon: FileCheck,     text: 'AI parses credentials automatically' },
  { icon: BadgeCheck,    text: 'Never miss a license renewal' },
  { icon: TrendingUp,    text: 'Grow your agency with confidence' },
  { icon: Users,         text: 'Manage staff compliance in one place' },
  { icon: ClipboardList, text: 'Onboarding checklists built in' },
  { icon: Zap,           text: '30 & 7-day expiry alerts, automatically' },
  { icon: Lock,          text: 'HIPAA-aware from day one' },
];

// Duplicate for seamless infinite loop
const items = [...benefits, ...benefits];

export default function BenefitsScroll() {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let animId: number;
    let pos = 0;
    const speed = 0.6;

    const totalWidth = track.scrollWidth / 2;

    function tick() {
      if (!pausedRef.current) {
        pos += speed;
        if (pos >= totalWidth) pos = 0;
        track!.style.transform = `translateX(-${pos}px)`;
      }
      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };
    track.addEventListener('mouseenter', pause);
    track.addEventListener('mouseleave', resume);

    return () => {
      cancelAnimationFrame(animId);
      track.removeEventListener('mouseenter', pause);
      track.removeEventListener('mouseleave', resume);
    };
  }, []);

  return (
    <div className="bg-white border-t border-gray-100">
      {/* Scroller */}
      <div className="relative overflow-hidden py-5">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />

        {/* Scrolling track */}
        <div ref={trackRef} className="flex items-center gap-3 w-max will-change-transform">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700 whitespace-nowrap select-none"
              >
                <Icon className="w-3.5 h-3.5 text-[#3da777] flex-shrink-0" />
                {item.text}
              </span>
            );
          })}
        </div>
      </div>

      {/* Dot grid — lighter at top, darker at bottom, no closing line */}
      <div className="relative overflow-hidden" style={{ height: '72px' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '8px 8px',
          }}
        />
        {/* Top-to-bottom fade: white at top fades out → dots get progressively visible */}
        <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, white 0%, transparent 100%)' }} />
        {/* Side fades */}
        <div className="absolute inset-y-0 left-0 w-32 pointer-events-none"
          style={{ background: 'linear-gradient(to right, white, transparent)' }} />
        <div className="absolute inset-y-0 right-0 w-32 pointer-events-none"
          style={{ background: 'linear-gradient(to left, white, transparent)' }} />
      </div>
    </div>
  );
}
