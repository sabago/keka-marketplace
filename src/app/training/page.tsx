'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export default function TrainingPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '', email, agencyName: '', tool: 'Training' }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch { setStatus('error'); }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#0B4F96] flex-shrink-0">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/[0.04] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-12 md:pt-20 md:pb-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-5">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <div className="inline-flex items-center gap-1.5 bg-[#48ccbc]/20 border border-[#48ccbc]/40 text-teal-200 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
            Coming Soon
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Training
          </h1>
          <p className="text-blue-200 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Courses and certifications designed for Massachusetts home care operators and their staff — from compliance basics to advanced care management.
          </p>
        </div>
      </div>

      {/* NOTIFY FORM */}
      <div className="flex-1 flex items-start justify-center">
        <div className="max-w-lg w-full mx-auto px-4 sm:px-6 py-14">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Be the first to know</h2>
            <p className="text-gray-500 text-sm mb-6">
              We are building a training library for home care professionals. Leave your email and we will notify you when it launches.
            </p>

            {status === 'done' ? (
              <p className="font-semibold text-sm" style={{ color: '#3da777' }}>You&apos;re on the list!</p>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B4F96]/30 focus:border-[#0B4F96]"
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-5 py-3 bg-[#0B4F96] text-white rounded-xl font-semibold text-sm hover:bg-[#0a4280] transition-colors flex-shrink-0 disabled:opacity-60"
                  >
                    Notify me
                  </button>
                </form>
                {status === 'error' && (
                  <p className="text-red-600 text-xs mt-3">Something went wrong, try again.</p>
                )}
              </>
            )}

            <p className="text-xs text-gray-400 mt-4">No spam. Unsubscribe at any time.</p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0B4F96] transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
