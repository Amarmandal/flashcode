export type AuthProvider = 'google' | 'account';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: AuthProvider;
}

export type SessionDurationDays = 30 | 90 | 180 | 365;

export interface NativeSessionInfo {
  user_id: string;
  authenticated_at: string;
  expires_at: string;
  duration_days: number;
}

export interface SessionConfig {
  durationDays: number;
  authenticatedAt: string;
  expiresAt: string;
  lastActiveAt: string;
}

export interface AuthSession {
  user: UserProfile;
  config: SessionConfig;
}

export interface AuthState {
  session: AuthSession | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  daysRemaining: number;
  isExpired: boolean;
}
