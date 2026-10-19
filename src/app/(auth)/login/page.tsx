import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: { absolute: 'Masuk | EksplorinAja' },
  description: 'Masuk ke ruang belajar EksplorinAja.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
