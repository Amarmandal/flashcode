import { invoke } from '@tauri-apps/api/core';
import { AuthSession, NativeSessionInfo, SessionConfig, UserProfile } from '../types/auth';
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
   * Retrieves a valid access token from the OS Keychain via Tauri native IPC.
   * The native side automatically refreshes the token if it's expired.
   * Returns null only when no credentials are stored (user not signed in).
   * Throws on refresh failures, revoked credentials, or Keychain errors
   * so callers can distinguish retryable vs. reauthentication-required errors.
   */
  async getSecureAccessToken(): Promise<string | null> {
    try {
      const res = await invoke<SuccessApiResponse<string | null>>('get_secure_access_token');
      return res.data || null;
    } catch (err: unknown) {
      // Extract the error message from Tauri's error response
      const message = typeof err === 'object' && err !== null && 'message' in err
        ? (err as { message: string }).message
        : String(err);

      // "No stored credentials" means the user isn't signed in — return null
      if (message.includes('No stored credentials') || message.includes('No active session')) {
        return null;
      }

      // All other errors (revoked creds, network, keychain) should propagate
      throw new Error(message);
    }
  },

  /**
   * Restores session from trusted native state in OS Keychain.
   * Derives the active user database from the trusted native record.
   * Returns null if no session exists or session is expired.
   * Throws if credential store or database opening/migrations fail.
   */
  async restoreNativeSession(): Promise<NativeSessionInfo | null> {
    try {
      const res = await invoke<SuccessApiResponse<NativeSessionInfo>>('restore_auth_session');
      return res.data;
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : String(err);

      // Distinguish missing/expired session from database/keychain errors
      if (
        message.includes('No active session') ||
        message.includes('Session has expired') ||
        message.includes('No stored credentials')
      ) {
        return null;
      }

      // Database opening, migration, or keychain failures throw so UI blocks views
      throw new Error(message);
    }
  },

  /**
   * Constructs an AuthSession using trusted native session info and cached profile.
   */
  buildSessionFromNative(nativeSession: NativeSessionInfo): AuthSession {
    const cached = this.getSession();
    const user: UserProfile =
      cached && cached.user && cached.user.id === nativeSession.user_id
        ? cached.user
        : {
            id: nativeSession.user_id,
            name: 'Flashcode User',
            email: '',
            provider: 'google',
          };

    const config: SessionConfig = {
      durationDays: nativeSession.duration_days,
      authenticatedAt: nativeSession.authenticated_at,
      expiresAt: nativeSession.expires_at,
      lastActiveAt: new Date().toISOString(),
    };

    const session: AuthSession = { user, config };
    this.saveSession(session);
    return session;
  },

  /**
   * Creates a session after successful native authentication or configuration.
   */
  createSession(
    user: UserProfile,
    sessionOrDuration: NativeSessionInfo | number = DEFAULT_SESSION_DURATION_DAYS
  ): AuthSession {
    let durationDays = DEFAULT_SESSION_DURATION_DAYS;
    let authenticatedAt = new Date().toISOString();
    let expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    if (typeof sessionOrDuration === 'number') {
      durationDays = sessionOrDuration;
      expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    } else if (sessionOrDuration && typeof sessionOrDuration === 'object') {
      durationDays = sessionOrDuration.duration_days;
      authenticatedAt = sessionOrDuration.authenticated_at;
      expiresAt = sessionOrDuration.expires_at;
    }

    const config: SessionConfig = {
      durationDays,
      authenticatedAt,
      expiresAt,
      lastActiveAt: new Date().toISOString(),
    };

    const session: AuthSession = { user, config };
    this.saveSession(session);
    return session;
  },

  /**
   * Updates session duration authoritatively in native Rust state.
   */
  async updateSessionDuration(durationDays: number): Promise<AuthSession | null> {
    const current = this.getSession();
    if (!current) return null;

    const res = await invoke<SuccessApiResponse<NativeSessionInfo>>('update_session_duration', {
      durationDays,
    });
    const nativeInfo = res.data;

    current.config.durationDays = nativeInfo.duration_days;
    current.config.expiresAt = nativeInfo.expires_at;
    current.config.authenticatedAt = nativeInfo.authenticated_at;

    this.saveSession(current);
    return current;
  },

  /**
   * Refreshes session for another full cycle authoritatively in native Rust state.
   */
  async refreshSession(): Promise<AuthSession | null> {
    const current = this.getSession();
    if (!current) return null;

    const res = await invoke<SuccessApiResponse<NativeSessionInfo>>('refresh_auth_session');
    const nativeInfo = res.data;

    current.config.durationDays = nativeInfo.duration_days;
    current.config.expiresAt = nativeInfo.expires_at;
    current.config.authenticatedAt = nativeInfo.authenticated_at;

    this.saveSession(current);
    return current;
  },

  /**
   * Clears session, resets active user database, and wipes keychain credentials
   */
  async clearSession(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      await invoke('clear_secure_tokens');
    } catch (err) {
      console.error('Failed to clear session and tokens:', err);
    }
  },
};
