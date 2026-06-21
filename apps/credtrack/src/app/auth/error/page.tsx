import Link from 'next/link';

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The sign-in link is no longer valid.',
  OAuthSignin: 'Error in constructing an authorization URL.',
  OAuthCallback: 'Error in handling the response from the provider.',
  OAuthCreateAccount: 'Could not create an account.',
  EmailCreateAccount: 'Could not create an email account.',
  Callback: 'Error in the OAuth callback.',
  OAuthAccountNotLinked: 'This email is already linked to another account.',
  EmailSignin: 'Check your email inbox.',
  CredentialsSignin: 'The email or password you entered is incorrect.',
  SessionRequired: 'Please sign in to access this page.',
  Default: 'An unexpected error occurred. Please try again.',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Sign-in error</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/signin"
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="w-full text-gray-600 text-sm hover:text-gray-900 transition-colors"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
