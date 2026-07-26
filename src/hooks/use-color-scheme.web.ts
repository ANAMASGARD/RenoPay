import { useSyncExternalStore } from 'react';

type ColorScheme = 'light' | 'dark';

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.matchMedia('(prefers-color-scheme: dark)');
}

function subscribe(onStoreChange: () => void): () => void {
  const mediaQuery = getMediaQuery();
  if (!mediaQuery) {
    return () => {};
  }

  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getSnapshot(): ColorScheme {
  const mediaQuery = getMediaQuery();
  if (!mediaQuery) {
    return 'light';
  }

  return mediaQuery.matches ? 'dark' : 'light';
}

function getServerSnapshot(): ColorScheme {
  return 'light';
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
