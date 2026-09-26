import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { notifications } from '@mantine/notifications';
import { AuthSession, UserProfile } from '../types/auth';
import { authService } from '../services/authService';
import { backupScheduler } from '../services/backupScheduler';
import { SuccessApiResponse } from '../types/successApiResponse';

interface GoogleOAuthResponse {
  id: string;
  email: string;
  name: string;
  picture?: string;
  expires_in: number;
}

interface AuthContextType {
  session: AuthSession | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

  // Check and initialize session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const existing = authService.getSession();
      if (existing && authService.isSessionValid(existing)) {
        // Enforce database isolation for returning user
        try {
          await invoke('switch_user_database', { userId: existing.user.id });
        } catch (err) {
          console.error('Failed to isolate user database on init:', err);
        }
        setSession(existing);
        backupScheduler.start();
      } else {
        if (existing) {
          await authService.clearSession();
        }
        setSession(null);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // [P2 Fix] Actively enforce session expiry while the app stays open
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

  // [P1 Fix] Real Google OAuth 2.0 PKCE login with token exchange and OS Keychain storage
  const loginWithGoogle = useCallback(
    async (clientId: string, durationDays: number = 90) => {
      if (!clientId.trim()) {
        throw new Error('Google OAuth Client ID is required');
      }

      // Invoke native desktop OAuth PKCE flow in Rust
      const response = await invoke<SuccessApiResponse<GoogleOAuthResponse>>('start_google_login', {
        clientId: clientId.trim(),
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

      // Creates session and isolates SQLite database to this user
      const newSession = await authService.createSession(userProfile, durationDays);
      setSession(newSession);
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
    const updated = authService.updateSessionDuration(days);
    if (updated) {
      setSession({ ...updated });
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const updated = authService.refreshSession();
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
