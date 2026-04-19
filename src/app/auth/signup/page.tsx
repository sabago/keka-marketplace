import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect(
    '/auth/signin?message=Agency registration is by invitation only. Please contact us at info@masteringhomecare.com to get started.'
  );
}
