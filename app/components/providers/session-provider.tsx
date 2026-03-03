"use client";

import { SessionProvider } from "next-auth/react";
import { SessionTimeoutWarning } from "@/app/components/providers/session-timeout-warning";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Re-check session every 5 minutes
      refetchOnWindowFocus={true} // Re-check when user returns to tab
    >
      {children}
      <SessionTimeoutWarning />
    </SessionProvider>
  );
}
