'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
