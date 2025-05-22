/**
 * @vitest-environment happy-dom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTheme } from './useTheme'; // Adjust path as necessary

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

describe('useTheme hook', () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Stub window.localStorage
    vi.stubGlobal('localStorage', localStorageMock);
    // Clear any previous storage
    localStorageMock.clear();
    // Spy on localStorage methods
    getItemSpy = vi.spyOn(localStorageMock, 'getItem');
    setItemSpy = vi.spyOn(localStorageMock, 'setItem');
  });

  afterEach(() => {
    // Restore original localStorage and clear spies
    vi.unstubAllGlobals();
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('should initialize with "light" theme by default if localStorage is empty', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.colorScheme).toBe('light');
    expect(getItemSpy).toHaveBeenCalledWith('mantine-color-scheme');
    // The initial useEffect also calls setItem if it was empty and defaulted
    expect(setItemSpy).toHaveBeenCalledWith('mantine-color-scheme', 'light');
  });

  it('should initialize with theme from localStorage if present (e.g., "dark")', () => {
    localStorageMock.setItem('mantine-color-scheme', 'dark');
    getItemSpy.mockClear(); // Clear spy calls from setItem in this line
    setItemSpy.mockClear();

    const { result } = renderHook(() => useTheme());
    expect(result.current.colorScheme).toBe('dark');
    expect(getItemSpy).toHaveBeenCalledWith('mantine-color-scheme');
    // setItem should not be called if the value was already in localStorage
    expect(setItemSpy).not.toHaveBeenCalled();
  });
  
  it('should initialize with "light" theme if localStorage value is invalid', () => {
    localStorageMock.setItem('mantine-color-scheme', 'invalid-theme');
    getItemSpy.mockClear();
    setItemSpy.mockClear();

    const { result } = renderHook(() => useTheme());
    expect(result.current.colorScheme).toBe('light');
    expect(getItemSpy).toHaveBeenCalledWith('mantine-color-scheme');
    expect(setItemSpy).toHaveBeenCalledWith('mantine-color-scheme', 'light'); 
  });


  it('should toggle theme from light to dark and update localStorage', () => {
    const { result } = renderHook(() => useTheme()); // Starts light by default
    expect(result.current.colorScheme).toBe('light');
    
    // Clear initial setItem call from useEffect
    setItemSpy.mockClear();

    act(() => {
      result.current.toggleColorScheme();
    });

    expect(result.current.colorScheme).toBe('dark');
    expect(setItemSpy).toHaveBeenCalledWith('mantine-color-scheme', 'dark');
  });

  it('should toggle theme from dark to light and update localStorage', () => {
    localStorageMock.setItem('mantine-color-scheme', 'dark');
    const { result } = renderHook(() => useTheme()); // Starts dark
    expect(result.current.colorScheme).toBe('dark');
    
    // Clear initial setItem call from useEffect (if any, though shouldn't happen if value is loaded)
    setItemSpy.mockClear();

    act(() => {
      result.current.toggleColorScheme();
    });

    expect(result.current.colorScheme).toBe('light');
    expect(setItemSpy).toHaveBeenCalledWith('mantine-color-scheme', 'light');
  });

  it('should set theme to a specific value (e.g., "light") and update localStorage', () => {
    localStorageMock.setItem('mantine-color-scheme', 'dark');
    const { result } = renderHook(() => useTheme()); // Starts dark
    expect(result.current.colorScheme).toBe('dark');

    setItemSpy.mockClear();

    act(() => {
      result.current.toggleColorScheme('light'); // Explicitly set to light
    });

    expect(result.current.colorScheme).toBe('light');
    expect(setItemSpy).toHaveBeenCalledWith('mantine-color-scheme', 'light');
  });
  
  it('should set theme to a specific value (e.g., "dark") and update localStorage', () => {
    const { result } = renderHook(() => useTheme()); // Starts light
    expect(result.current.colorScheme).toBe('light');

    setItemSpy.mockClear();

    act(() => {
      result.current.toggleColorScheme('dark'); // Explicitly set to dark
    });

    expect(result.current.colorScheme).toBe('dark');
    expect(setItemSpy).toHaveBeenCalledWith('mantine-color-scheme', 'dark');
  });
});
