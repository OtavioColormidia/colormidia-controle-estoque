import { createContext, useContext, ReactNode } from 'react';
import { useSupabaseData } from '@/hooks/useSupabaseData';

type SupabaseDataValue = ReturnType<typeof useSupabaseData>;

const SupabaseDataContext = createContext<SupabaseDataValue | null>(null);

export function SupabaseDataProvider({ children }: { children: ReactNode }) {
  const value = useSupabaseData();
  return <SupabaseDataContext.Provider value={value}>{children}</SupabaseDataContext.Provider>;
}

export function useSupabaseDataContext() {
  const ctx = useContext(SupabaseDataContext);
  if (!ctx) throw new Error('useSupabaseDataContext must be used inside SupabaseDataProvider');
  return ctx;
}
