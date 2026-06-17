'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface WaitlistFormProps {
  variant?: 'hero' | 'inline';
  darkBg?: boolean;
}

export default function WaitlistForm({ variant = 'inline', darkBg = true }: WaitlistFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, agencyName, tool: 'Credential Tracker' }),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-3 ${variant === 'hero' ? 'bg-white/10 border border-white/20 text-white' : 'bg-green-50 border border-green-200 text-green-800'} rounded-xl px-6 py-4 text-sm font-medium`}>
        <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${variant === 'hero' ? 'text-[#3da777]' : 'text-[#3da777]'}`} />
        You&apos;re on the list! We&apos;ll be in touch soon.
      </div>
    );
  }

  async function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || '—', email, agencyName: agencyName || '—', tool: 'Credential Tracker' }),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (variant === 'hero') {
    const inputClass = darkBg
      ? 'flex-1 min-w-0 px-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200/70 text-sm focus:outline-none focus:ring-2 focus:ring-[#3da777]/60 focus:border-[#3da777] focus:bg-white/15 transition-colors'
      : 'flex-1 min-w-0 px-4 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#3da777]/40 focus:border-[#3da777] transition-colors';
    return (
      <div className="w-full max-w-xl">
        <form onSubmit={handleHeroSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
          <input
            type="email"
            placeholder="Enter your work email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-3.5 bg-[#3da777] text-white rounded-xl font-bold text-sm hover:bg-[#359469] transition-colors shadow-lg disabled:opacity-60 whitespace-nowrap"
          >
            {status === 'loading' ? 'Joining…' : 'Join the Waitlist →'}
          </button>
        </form>
        {status === 'error' && (
          <p className={`mt-2 text-xs ${darkBg ? 'text-red-300' : 'text-red-500'}`}>Something went wrong. Please try again.</p>
        )}
      </div>
    );
  }

  // inline variant — full form
  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Your name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3da777]/40 focus:border-[#3da777] transition-colors"
          />
          <input
            type="email"
            placeholder="Work email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3da777]/40 focus:border-[#3da777] transition-colors"
          />
        </div>
        <input
          type="text"
          placeholder="Agency name"
          required
          value={agencyName}
          onChange={e => setAgencyName(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3da777]/40 focus:border-[#3da777] transition-colors"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-3.5 bg-[#3da777] text-white rounded-xl font-bold text-sm hover:bg-[#359469] transition-colors shadow-md disabled:opacity-60"
        >
          {status === 'loading' ? 'Joining…' : 'Request Early Access →'}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-600">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
