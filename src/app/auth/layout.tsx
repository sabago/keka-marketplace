/**
 * Auth layout — no global Header or Footer.
 * Sign-in, sign-up, password reset pages are focused flows
 * and should not show the site navigation.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
