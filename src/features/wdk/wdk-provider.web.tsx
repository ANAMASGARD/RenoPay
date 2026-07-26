import type { ReactNode } from 'react';

/** Web shell only — WDK wallet runs in the native dev client. */
export function RenoPayWdkProvider({ children }: { children: ReactNode }) {
  return children;
}
