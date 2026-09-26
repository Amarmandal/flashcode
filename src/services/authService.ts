import { invoke } from '@tauri-apps/api/core';
import { AuthSession, SessionConfig, UserProfile } from '../types/auth';
import { SuccessApiResponse } from '../types/successApiResponse';

const STORAGE_SESSION_KEY = 'flashcode_auth_session';
const DEFAULT_SESSION_DURATION_DAYS = 90;

export const authService = {
  /**
   * Retrieves non-sensitive session metadata from localStorage.
   * Access & refresh tokens are stored securely in OS Keychain, never here.
   */
  getSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(STORAGE_SESSION_KEY);
      if (!data) return null;
      const session = JSON.parse(data) as AuthSession;
      return session;
    } catch (err) {
      console.error('Failed to read session from storage:', err);
      return null;
    }
  },

  /**
   * Validates if the given session is still within its TTL (e.g. 90 days)
   */
  isSessionValid(session: AuthSession | null): boolean {
    if (!session || !session.config || !session.config.expiresAt) {
      return false;
    }
    const expiresAt = new Date(session.config.expiresAt).getTime();
    const now = Date.now();
    return now < expiresAt;
  },

  /**
   * Calculates the number of whole days remaining before session expires
   */
  getDaysRemaining(session: AuthSession | null): number {
    if (!session || !session.config || !session.config.expiresAt) {
      return 0;
    }
    const expiresAt = new Date(session.config.expiresAt).getTime();
    const now = Date.now();
    const diffMs = expiresAt - now;
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  },

  /**
   * Persists session metadata (profile + expiry) without any sensitive tokens
   */
  saveSession(session: AuthSession): void {
    try {
      session.config.lastActiveAt = new Date().toISOString();
      // Ensure no tokens ever leak into localStorage
      const safeSession: AuthSession = {
        user: session.user,
        config: session.config,
      };
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(safeSession));
    } catch (err) {
      console.error('Failed to save session metadata to storage:', err);
    }
  },

  /**
   * Retrieves the access token from the OS Keychain via Tauri native IPC
   */
  async getSecureAccessToken(): Promise<string | null> {
    try {
      const res = await invoke<SuccessApiResponse<string | null>>('get_secure_access_token');
      return res.data || null;
    } catch (err) {
      console.warn('Could not read access token from keychain:', err);
      return null;
    }
  },

  /**
   * Creates a new session for a user with the specified duration in days (default 90)
   * Also isolates the database to this user via Tauri
   */
  async createSession(
    user: UserProfile,
    durationDays: number = DEFAULT_SESSION_DURATION_DAYS
  ): Promise<AuthSession> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const config: SessionConfig = {
      durationDays,
      authenticatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActiveAt: now.toISOString(),
    };

    const session: AuthSession = {
      user,
      config,
    };

    this.saveSession(session);

    // Physically isolate SQLite database for this user
    try {
      await invoke('switch_user_database', { userId: user.id });
    } catch (err) {
      console.error('Failed to switch user database:', err);
    }

    return session;
  },

  /**
   * Updates the duration setting for an existing session (e.g. 30, 90, 180, 365 days)
   */
  updateSessionDuration(durationDays: number): AuthSession | null {
    const current = this.getSession();
    if (!current) return null;

    const authTime = new Date(current.config.authenticatedAt).getTime();
    const newExpiresAt = new Date(authTime + durationDays * 24 * 60 * 60 * 1000);

    const finalExpiresAt =
      newExpiresAt.getTime() <= Date.now()
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : newExpiresAt;

    current.config.durationDays = durationDays;
    current.config.expiresAt = finalExpiresAt.toISOString();

    this.saveSession(current);
    return current;
  },

  /**
   * Refreshes the session expiration for another full cycle from today
   */
  refreshSession(): AuthSession | null {
    const current = this.getSession();
    if (!current) return null;

    const durationDays = current.config.durationDays || DEFAULT_SESSION_DURATION_DAYS;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    current.config.authenticatedAt = now.toISOString();
    current.config.expiresAt = expiresAt.toISOString();
    current.config.lastActiveAt = now.toISOString();

    this.saveSession(current);
    return current;
  },

  /**
   * Clears session, resets active user database, and wipes keychain credentials
   */
  async clearSession(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      await invoke('close_user_database');
      await invoke('clear_secure_tokens');
    } catch (err) {
      console.error('Failed to clear session and tokens:', err);
    }
  },
};
