"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { signOut } from "next-auth/react";

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes in ms
const WARNING_BEFORE = 1 * 60 * 1000; // Show warning 1 minute before logout
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

interface UseIdleTimeoutOptions {
    onIdle?: () => void;
    onWarning?: () => void;
    enabled?: boolean;
}

export function useIdleTimeout(options: UseIdleTimeoutOptions = {}) {
    const { onIdle, onWarning, enabled = true } = options;
    const lastActivityRef = useRef<number>(Date.now());
    const warningShownRef = useRef(false);
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(IDLE_TIMEOUT);

    const resetTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        warningShownRef.current = false;
        setShowWarning(false);
        setRemainingTime(IDLE_TIMEOUT);
    }, []);

    const handleActivity = useCallback(() => {
        // Only reset if warning is not showing (user must explicitly dismiss warning)
        if (!warningShownRef.current) {
            lastActivityRef.current = Date.now();
        }
    }, []);

    const handleLogout = useCallback(async () => {
        await signOut({ callbackUrl: window.location.origin + "/" });
    }, []);

    const extendSession = useCallback(() => {
        resetTimer();
        // Touch the session to refresh the JWT
        fetch("/api/auth/session").catch(() => { });
    }, [resetTimer]);

    useEffect(() => {
        if (!enabled) return;

        // Track user activity events
        const events = [
            "mousedown",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "click",
            "wheel",
        ];

        // Throttle activity tracking to avoid excessive updates
        let throttleTimer: NodeJS.Timeout | null = null;
        const throttledActivity = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                throttleTimer = null;
                handleActivity();
            }, 1000);
        };

        events.forEach((event) => {
            document.addEventListener(event, throttledActivity, { passive: true });
        });

        // Check idle status periodically
        const intervalId = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            const remaining = Math.max(0, IDLE_TIMEOUT - elapsed);
            setRemainingTime(remaining);

            // Show warning when approaching timeout
            if (remaining <= WARNING_BEFORE && remaining > 0 && !warningShownRef.current) {
                warningShownRef.current = true;
                setShowWarning(true);
                onWarning?.();
            }

            // Auto logout when timeout reached
            if (remaining <= 0) {
                onIdle?.();
                handleLogout();
            }
        }, CHECK_INTERVAL);

        // Also update remaining time more frequently when warning is shown
        const warningIntervalId = setInterval(() => {
            if (warningShownRef.current) {
                const elapsed = Date.now() - lastActivityRef.current;
                const remaining = Math.max(0, IDLE_TIMEOUT - elapsed);
                setRemainingTime(remaining);

                if (remaining <= 0) {
                    onIdle?.();
                    handleLogout();
                }
            }
        }, 1000);

        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, throttledActivity);
            });
            clearInterval(intervalId);
            clearInterval(warningIntervalId);
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [enabled, handleActivity, handleLogout, onIdle, onWarning]);

    return {
        showWarning,
        remainingTime,
        extendSession,
        handleLogout,
        resetTimer,
    };
}
