'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, User, AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userInfo, setUserInfo] = useState<{
    email: string;
    name: string | null;
    agency: string;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No token provided. Please check your email for the correct link.');
      setValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      const response = await fetch(`/api/auth/set-password?token=${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid token');
      }

      if (data.valid) {
        setTokenValid(true);
        setUserInfo(data.user);
      } else {
        setTokenError(data.error || 'Invalid token');
      }
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'Failed to validate token');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      // Success!
      setSuccess(true);

      // Redirect to sign-in after 3 seconds
      setTimeout(() => {
        router.push('/auth/signin?message=Password set successfully. Please sign in.');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  // Token validation loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-12 h-12 text-[#0B4F96] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  // Token invalid state
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid or Expired Link</h1>
            <p className="text-gray-600 mb-6">{tokenError}</p>
            <div className="bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg text-left mb-6">
              <p className="text-sm text-gray-700">
                <strong>Need help?</strong>
              </p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Check your email for the most recent invitation link</li>
                <li>Links expire after 24 hours for security</li>
                <li>Contact support if you need a new invitation</li>
              </ul>
            </div>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-[#0B4F96] text-white rounded-lg font-bold hover:bg-[#094080] transition-all"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Password Set Successfully!</h1>
            <p className="text-lg text-gray-700 mb-6">
              Welcome to the platform, {userInfo?.name || 'there'}!
            </p>
            <div className="bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg text-left mb-6">
              <p className="text-sm text-gray-700">
                <strong>What's next?</strong>
              </p>
              <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Redirecting you to sign in...</li>
                <li>Use your email and new password to log in</li>
                <li>Complete your agency profile</li>
                <li>Start managing referrals and accessing resources</li>
              </ul>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Redirecting to sign in...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password setup form
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#48ccbc] rounded-full mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your Password</h1>
          <p className="text-gray-600">Complete your account setup</p>
        </div>

        {/* User Info Card */}
        <div className="bg-blue-50 border-l-4 border-[#0B4F96] p-4 rounded-r-lg mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-[#0B4F96]" />
                <span className="text-sm font-semibold text-gray-900">
                  {userInfo?.name || 'User'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-[#0B4F96]" />
                <span className="text-sm text-gray-700">{userInfo?.email}</span>
              </div>
              <div className="text-xs text-gray-600">
                Agency: <strong>{userInfo?.agency}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 mb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B4F96] focus:border-transparent"
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Must match password above</p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#48ccbc] text-white rounded-lg font-bold text-lg hover:bg-[#3ab8a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  'Set Password & Continue'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Note */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By setting your password, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-[#0B4F96]">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-[#0B4F96]">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-12 h-12 text-[#0B4F96] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
