import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { AuthSession, NativeSessionInfo, UserProfile } from '../types/auth';
import { authService } from '../services/authService';
import { backupScheduler } from '../services/backupScheduler';
import { SuccessApiResponse } from '../types/successApiResponse';

interface GoogleOAuthResponse {
  id: string;
  email: string;
  name: string;
  picture?: string;
  expires_in: number;
  session: NativeSessionInfo;
}

interface AuthContextType {
  session: AuthSession | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  restoreError: string | null;
  retryRestore: () => Promise<void>;
  daysRemaining: number;
  isExpired: boolean;
  loginWithGoogle: (clientId: string, durationDays?: number) => Promise<void>;
  logout: () => Promise<void>;
  updateSessionDuration: (days: number) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const sessionCheckIntervalRef = useRef<number | null>(null);

  const handleSessionExpired = useCallback(async () => {
    notifications.show({
      title: 'Session Expired',
      message: 'Your session has reached its validity limit. Please sign in again.',
      color: 'red',
      autoClose: 6000,
    });
    backupScheduler.stop();
    await authService.clearSession();
    setSession(null);
  }, []);

  // Restore trusted session from native state on mount
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    setRestoreError(null);
    try {
      const nativeSession = await authService.restoreNativeSession();
      if (nativeSession) {
        // Valid session and database ready
        const restoredSession = authService.buildSessionFromNative(nativeSession);
        setSession(restoredSession);
        backupScheduler.start();
      } else {
        // Missing or expired session -> clear stale local state and show login
        await authService.clearSession();
        setSession(null);
      }
    } catch (err: unknown) {
      console.error('Native session restoration failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to restore database or secure credentials';
      setRestoreError(msg);
      setSession(null);
      // Do not fall back to cached localStorage authentication when restoration fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Actively enforce session expiry while the app stays open
  useEffect(() => {
    if (!session || !session.config || !session.config.expiresAt) return;

    const checkExpiry = () => {
      const expiresAt = new Date(session.config.expiresAt).getTime();
      const now = Date.now();
      if (now >= expiresAt) {
        handleSessionExpired();
      }
    };

    // Calculate exact remaining time for primary timer
    const timeUntilExpiry = new Date(session.config.expiresAt).getTime() - Date.now();
    const expiryTimer = setTimeout(() => {
      checkExpiry();
    }, Math.max(0, timeUntilExpiry));

    // Periodic check every 15 seconds as a fallback
    const intervalTimer = window.setInterval(checkExpiry, 15000);
    sessionCheckIntervalRef.current = intervalTimer;

    // Trigger check immediately upon window focus or visibility change
    const handleFocusOrVisible = () => {
      if (!document.hidden) {
        checkExpiry();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearTimeout(expiryTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [session, handleSessionExpired]);

  const isAuthenticated = Boolean(session && authService.isSessionValid(session));
  const isExpired = Boolean(session && !authService.isSessionValid(session));
  const daysRemaining = authService.getDaysRemaining(session);
  const user = session ? session.user : null;

  const loginWithGoogle = useCallback(
    async (clientId: string, durationDays: number = 90) => {
      if (!clientId.trim()) {
        throw new Error('Google OAuth Client ID is required');
      }

      // Invoke native desktop OAuth PKCE flow in Rust (Rust switches DB and stores session atomically)
      const response = await invoke<SuccessApiResponse<GoogleOAuthResponse>>('start_google_login', {
        clientId: clientId.trim(),
        durationDays,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Google OAuth failed');
      }

      const googleUser = response.data;
      const userProfile: UserProfile = {
        id: googleUser.id,
        name: googleUser.name,
        email: googleUser.email,
        avatarUrl: googleUser.picture,
        provider: 'google',
      };

      // Creates session from trusted native session metadata
      const newSession = authService.createSession(userProfile, googleUser.session);
      setSession(newSession);
      setRestoreError(null);
      backupScheduler.start();
    },
    []
  );

  const logout = useCallback(async () => {
    backupScheduler.stop();
    await authService.clearSession();
    setSession(null);
  }, []);

  const updateSessionDuration = useCallback(async (days: number) => {
    const updated = await authService.updateSessionDuration(days);
    if (updated) {
      setSession({ ...updated });
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const updated = await authService.refreshSession();
    if (updated) {
      setSession({ ...updated });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAuthenticated,
        isLoading,
        restoreError,
        retryRestore: initializeAuth,
        daysRemaining,
        isExpired,
        loginWithGoogle,
        logout,
        updateSessionDuration,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
