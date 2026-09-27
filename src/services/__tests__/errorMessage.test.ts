import { describe, expect, it } from 'vitest';
import { errorMessage } from '../errorMessage';

describe('backup error messages', () => {
  it.each([
    new Error('Restore detail'),
    { success: false, message: 'Restore detail' },
    'Restore detail',
  ])('preserves the error detail from %j', (error) => {
    expect(errorMessage(error, 'Fallback')).toBe('Restore detail');
  });

  it.each([null, undefined, {}, { message: 5 }, ''])('falls back for %j', (error) => {
    expect(errorMessage(error, 'Fallback')).toBe('Fallback');
  });
});
