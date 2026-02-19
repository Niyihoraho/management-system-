"use client";

import { createContext, useContext, useCallback, ReactNode } from "react";

interface SidebarCacheManagerContextType {
  invalidateCache: () => void;
  refreshCache: () => void;
  isUsingCache: boolean;
}

const SidebarCacheManagerContext = createContext<SidebarCacheManagerContextType | null>(null);

export function SidebarCacheManagerProvider({ children }: { children: ReactNode }) {
  const invalidateCache = useCallback(() => {
    // This will be set by the useSidebarCache hook
    if (typeof window !== 'undefined') {
      // Dispatch a custom event to invalidate cache
      window.dispatchEvent(new CustomEvent('sidebar-cache-invalidate'));
    }
  }, []);

  const refreshCache = useCallback(() => {
    // This will be set by the useSidebarCache hook
    if (typeof window !== 'undefined') {
      // Dispatch a custom event to refresh cache
      window.dispatchEvent(new CustomEvent('sidebar-cache-refresh'));
    }
  }, []);

  const value = {
    invalidateCache,
    refreshCache,
    isUsingCache: false, // This will be updated by the hook
  };

  return (
    <SidebarCacheManagerContext.Provider value={value}>
      {children}
    </SidebarCacheManagerContext.Provider>
  );
}

export function useSidebarCacheManager() {
  const context = useContext(SidebarCacheManagerContext);
  if (!context) {
    throw new Error('useSidebarCacheManager must be used within a SidebarCacheManagerProvider');
  }
  return context;
}
