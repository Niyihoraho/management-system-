"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useIdleTimeout } from "@/hooks/use-idle-timeout";
import { AlertCircle, Clock, LogOut, RefreshCw } from "lucide-react";

export function SessionTimeoutWarning() {
    const { status } = useSession();
    const pathname = usePathname();
    const isPublicRegistrationPath =
        pathname?.startsWith("/join") || pathname?.startsWith("/register");

    const { showWarning, remainingTime, extendSession, handleLogout } =
        useIdleTimeout({
            enabled: status === "authenticated" && !isPublicRegistrationPath,
        });

    if (!showWarning || status !== "authenticated" || isPublicRegistrationPath) return null;

    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Warning header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">
                                Session Expiring Soon
                            </h3>
                            <p className="text-sm text-white/80">
                                Your session will expire due to inactivity
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            You will be automatically logged out in{" "}
                            <span className="font-bold text-amber-900 dark:text-amber-100">
                                {minutes}:{seconds.toString().padStart(2, "0")}
                            </span>
                        </p>
                    </div>

                    <p className="text-sm text-muted-foreground mb-5">
                        For your security, sessions expire after 40 minutes of inactivity.
                        Click &quot;Continue Session&quot; to stay logged in.
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={extendSession}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Continue Session
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-lg font-medium text-sm hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-muted/50"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
