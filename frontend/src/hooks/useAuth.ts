'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';

export function useAuth() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [isPending, startTransition] = useTransition();

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[useAuth] Logout error:', error);
    } finally {
      clearAuth();
      router.push('/login');
      toast.success('Logged out successfully');
    }
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    isPending,
    setAuth,
    logout,
  };
}
