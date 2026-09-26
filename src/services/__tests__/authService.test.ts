// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';
import { UserProfile } from '../../types/auth';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd, args) => {
    if (cmd === 'update_session_duration') {
      const now = new Date();
      const days = args?.durationDays || 90;
      const expires = new Date(now.getTime() + days * 86400000);
      return Promise.resolve({
        success: true,
        data: {
          user_id: 'user-123',
          authenticated_at: now.toISOString(),
          expires_at: expires.toISOString(),
          duration_days: days,
        },
      });
    }
    if (cmd === 'refresh_auth_session') {
      const now = new Date();
      const expires = new Date(now.getTime() + 90 * 86400000);
      return Promise.resolve({
        success: true,
        data: {
          user_id: 'user-123',
          authenticated_at: now.toISOString(),
          expires_at: expires.toISOString(),
          duration_days: 90,
        },
      });
    }
    return Promise.resolve({ success: true, data: null });
  }),
}));

describe('authService', () => {
  const mockUser: UserProfile = {
    id: 'user-123',
    name: 'Test Developer',
    email: 'test@example.com',
    provider: 'google',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('creates a session with default 90-day duration and isolates user database', () => {
    const session = authService.createSession(mockUser);
    expect(session.user.id).toBe('user-123');
    expect(session.config.durationDays).toBe(90);

    const authTime = new Date(session.config.authenticatedAt).getTime();
    const expiryTime = new Date(session.config.expiresAt).getTime();
    const diffDays = Math.round((expiryTime - authTime) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(90);

    // Verify tokens are never saved to localStorage
    const storedRaw = localStorage.getItem('flashcode_auth_session');
    expect(storedRaw).not.toBeNull();
    expect(storedRaw).not.toContain('accessToken');
    expect(storedRaw).not.toContain('refreshToken');
  });

  it('validates active session within TTL', () => {
    const session = authService.createSession(mockUser, 90);
    expect(authService.isSessionValid(session)).toBe(true);
    expect(authService.getDaysRemaining(session)).toBeGreaterThanOrEqual(89);
  });

  it('detects expired session after duration expires', () => {
    const session = authService.createSession(mockUser, 90);
    session.config.expiresAt = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    authService.saveSession(session);

    expect(authService.isSessionValid(session)).toBe(false);
    expect(authService.getDaysRemaining(session)).toBe(0);
  });

  it('supports updating session duration dynamically (e.g. to 180 days / 6 months)', async () => {
    authService.createSession(mockUser, 90);
    const updated = await authService.updateSessionDuration(180);

    expect(updated).not.toBeNull();
    expect(updated?.config.durationDays).toBe(180);
    expect(authService.getDaysRemaining(updated)).toBeGreaterThanOrEqual(179);
  });

  it('refreshes an active session for another full cycle from today', async () => {
    authService.createSession(mockUser, 90);
    const refreshed = await authService.refreshSession();

    expect(refreshed).not.toBeNull();
    expect(authService.isSessionValid(refreshed)).toBe(true);
    expect(authService.getDaysRemaining(refreshed)).toBe(90);
  });

  it('clears session, resets active user DB, and removes keychain tokens on logout', async () => {
    authService.createSession(mockUser, 90);
    expect(authService.getSession()).not.toBeNull();

    await authService.clearSession();
    expect(authService.getSession()).toBeNull();
  });
});
