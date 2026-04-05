import { Suspense } from 'react';
import Link from 'next/link';
import SignInForm from '@/components/SignInForm';
import { LogIn, ArrowRight } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0B4F96] rounded-full mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to access your agency dashboard</p>
        </div>

        {/* Sign In Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200 mb-6">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-lg" />}>
            <SignInForm />
          </Suspense>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-[#0B4F96] hover:text-[#48ccbc] font-semibold inline-flex items-center gap-1 group"
            >
              Sign up
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </p>
        </div>

        {/* Additional Links */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-center space-y-2">
          <p className="text-sm text-gray-600">
            <Link href="/pricing" className="text-[#0B4F96] hover:text-[#48ccbc] font-semibold">
              View Pricing
            </Link>
            {' • '}
            <Link href="/knowledge-base" className="text-[#0B4F96] hover:text-[#48ccbc] font-semibold">
              Browse Directory
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
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
