'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CredTrackPlan } from '@/types/next-auth';

interface Props {
  currentPlan: CredTrackPlan | null;
  isBundled: boolean;
  isLoggedIn: boolean;
}

const PLANS = [
  {
    id: 'STARTER' as CredTrackPlan,
    name: 'Starter',
    price: '$0',
    period: '/mo',
    description: 'Get started with manual credential tracking.',
    features: [
      'Up to 5 active staff',
      'Manual credential entry',
      'Expiration alerts',
      'CSV export',
    ],
    cta: 'Get started free',
    ctaHref: '/auth/signup',
    highlight: false,
  },
  {
    id: 'GROWTH' as CredTrackPlan,
    name: 'Growth',
    price: '$49',
    period: '/mo',
    description: 'AI document parsing and larger teams.',
    features: [
      'Up to 50 active staff',
      'AI document parsing (100 docs/mo)',
      'Auto-extract issuer, license #, dates',
      'Compliance dashboard',
      'Email reminders',
    ],
    cta: 'Upgrade to Growth',
    ctaHref: null, // triggers checkout
    highlight: true,
  },
  {
    id: 'ENTERPRISE' as CredTrackPlan,
    name: 'Enterprise',
    price: '$149',
    period: '/mo',
    description: 'Unlimited staff and unlimited AI parsing.',
    features: [
      'Unlimited staff',
      'Unlimited AI document parsing',
      'Priority support',
      'All Growth features',
    ],
    cta: 'Upgrade to Enterprise',
    ctaHref: null, // triggers checkout
    highlight: false,
  },
] as const;

export default function PricingClient({ currentPlan, isBundled, isLoggedIn }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleUpgrade(plan: 'GROWTH' | 'ENTERPRISE') {
    if (!isLoggedIn) {
      window.location.href = '/auth/signup';
      return;
    }
    setLoading(plan);
    setError('');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to start checkout.');
        setLoading(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
      setLoading(null);
    }
  }

  if (isBundled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
        <div className="max-w-md text-center">
          <div className="mb-4 inline-block rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
            MHC PRO — CredTrack Included
          </div>
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            You&apos;re all set.
          </h1>
          <p className="mb-6 text-gray-500">
            CredTrack is included with your Mastering HomeCare PRO subscription.
            All features — including unlimited AI parsing — are unlocked.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-[#0B4F96] px-6 py-2.5 font-semibold text-white hover:bg-[#0a4585] transition"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
          <p className="mt-3 text-lg text-gray-500">
            Start free. Upgrade when your team grows.
          </p>
          {!isLoggedIn && (
            <p className="mt-2 text-sm text-gray-400">
              Already on Mastering HomeCare PRO?{' '}
              <Link href="/auth/signin" className="text-[#0B4F96] underline">
                Sign in — CredTrack is included.
              </Link>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isStarter = plan.id === 'STARTER';

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl bg-white p-7 shadow-sm ring-1 ${
                  plan.highlight
                    ? 'ring-[#0B4F96] shadow-lg'
                    : 'ring-gray-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0B4F96] px-3 py-0.5 text-xs font-semibold text-white">
                    Most popular
                  </div>
                )}

                <div className="mb-5">
                  <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                  <div className="mt-1 flex items-end gap-0.5">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="mb-1 text-sm text-gray-500">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                </div>

                <ul className="mb-7 flex-1 space-y-2.5 text-sm text-gray-700">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#48ccbc]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="rounded-lg bg-gray-100 py-2.5 text-center text-sm font-medium text-gray-500">
                    Current plan
                  </div>
                ) : isStarter ? (
                  <Link
                    href={isLoggedIn ? '/dashboard' : (plan.ctaHref ?? '/auth/signup')}
                    className="block rounded-lg border border-gray-300 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    {isLoggedIn ? 'Go to dashboard' : plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id as 'GROWTH' | 'ENTERPRISE')}
                    disabled={loading === plan.id}
                    className={`rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      plan.highlight
                        ? 'bg-[#0B4F96] hover:bg-[#0a4585]'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {loading === plan.id ? 'Redirecting…' : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* MHC bundle callout */}
        <div className="mt-10 rounded-2xl bg-indigo-50 p-6 text-center">
          <p className="font-semibold text-indigo-900">On Mastering HomeCare PRO, Business, or Enterprise?</p>
          <p className="mt-1 text-sm text-indigo-700">
            CredTrack — including unlimited AI parsing — is included at no extra cost.
          </p>
          <Link
            href="/auth/signin"
            className="mt-3 inline-block text-sm font-medium text-indigo-700 underline hover:text-indigo-900"
          >
            Sign in with your MHC account →
          </Link>
        </div>
      </div>
    </main>
  );
}
