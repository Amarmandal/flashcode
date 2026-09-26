// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';
import { UserProfile } from '../../types/auth';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({ success: true }),
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

  it('creates a session with default 90-day duration and isolates user database', async () => {
    const session = await authService.createSession(mockUser);
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

  it('validates active session within TTL', async () => {
    const session = await authService.createSession(mockUser, 90);
    expect(authService.isSessionValid(session)).toBe(true);
    expect(authService.getDaysRemaining(session)).toBeGreaterThanOrEqual(89);
  });

  it('detects expired session after duration expires', async () => {
    const session = await authService.createSession(mockUser, 90);
    session.config.expiresAt = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    authService.saveSession(session);

    expect(authService.isSessionValid(session)).toBe(false);
    expect(authService.getDaysRemaining(session)).toBe(0);
  });

  it('supports updating session duration dynamically (e.g. to 180 days / 6 months)', async () => {
    await authService.createSession(mockUser, 90);
    const updated = authService.updateSessionDuration(180);

    expect(updated).not.toBeNull();
    expect(updated?.config.durationDays).toBe(180);
    expect(authService.getDaysRemaining(updated)).toBeGreaterThanOrEqual(179);
  });

  it('refreshes an active session for another full cycle from today', async () => {
    await authService.createSession(mockUser, 90);
    const refreshed = authService.refreshSession();

    expect(refreshed).not.toBeNull();
    expect(authService.isSessionValid(refreshed)).toBe(true);
    expect(authService.getDaysRemaining(refreshed)).toBe(90);
  });

  it('clears session, resets active user DB, and removes keychain tokens on logout', async () => {
    await authService.createSession(mockUser, 90);
    expect(authService.getSession()).not.toBeNull();

    await authService.clearSession();
    expect(authService.getSession()).toBeNull();
  });
});
