import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type PaySwipeLockContextValue = {
  locked: boolean;
  setLocked: (locked: boolean) => void;
};

const PaySwipeLockContext = createContext<PaySwipeLockContextValue | null>(null);

export function PaySwipeLockProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const value = useMemo(() => ({ locked, setLocked }), [locked]);
  return <PaySwipeLockContext.Provider value={value}>{children}</PaySwipeLockContext.Provider>;
}

export function usePaySwipeLock(): PaySwipeLockContextValue {
  const context = useContext(PaySwipeLockContext);
  if (!context) {
    throw new Error('usePaySwipeLock must be used within PaySwipeLockProvider');
  }
  return context;
}
