import React, { createContext, useContext, ReactNode } from 'react';
import { useAppData } from '../hooks/useAppData';

type AppDataContextType = ReturnType<typeof useAppData>;

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const appData = useAppData();
  return (
    <AppDataContext.Provider value={appData}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useData must be used within an AppDataProvider');
  }
  return context;
}
