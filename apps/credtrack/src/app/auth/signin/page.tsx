'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  SessionRequired: 'Please sign in to continue.',
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const urlError = searchParams.get('error');

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(
    urlError ? (ERROR_MESSAGES[urlError] ?? 'Sign-in failed. Please try again.') : ''
  );
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? result.error);
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B4F96] to-[#48ccbc] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-white/70">
            Mastering HomeCare
          </p>
          <h1 className="text-3xl font-bold text-white">Sign in to CredTrack</h1>
          <p className="mt-2 text-sm text-white/80">
            MHC PRO members — your account is already here.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {error && (
            <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="jane@sunrisehomecare.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0B4F96] focus:outline-none focus:ring-2 focus:ring-[#0B4F96]/20"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                {/* Placeholder — forgot-password route is post-MVP */}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="Your password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#0B4F96] focus:outline-none focus:ring-2 focus:ring-[#0B4F96]/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0B4F96] py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0a4585] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-medium text-[#0B4F96] hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
