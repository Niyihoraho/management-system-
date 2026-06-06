"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { signOut } from "next-auth/react";

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms
const WARNING_BEFORE = 2 * 60 * 1000; // Show warning 2 minutes before logout
const CHECK_INTERVAL = 5 * 1000; // Check every 5 seconds to be precise

interface UseIdleTimeoutOptions {
    onIdle?: () => void;
    onWarning?: () => void;
    enabled?: boolean;
}

export function useIdleTimeout(options: UseIdleTimeoutOptions = {}) {
    const { onIdle, onWarning, enabled = true } = options;
    const msystem_lastActivityRef = useRef<number>(Date.now());
    const warningShownRef = useRef(false);
    const isLoggingOutRef = useRef(false);
    const [showWarning, setShowWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(IDLE_TIMEOUT);

    const resetTimer = useCallback(() => {
        const now = Date.now();
        msystem_lastActivityRef.current = now;
        localStorage.setItem("msystem_lastActivity", now.toString());
        warningShownRef.current = false;
        isLoggingOutRef.current = false;
        setShowWarning(false);
        setRemainingTime(IDLE_TIMEOUT);
    }, []);

    const handleActivity = useCallback(() => {
        // Any real user activity resets the timer, even if warning is showing
        const now = Date.now();
        msystem_lastActivityRef.current = now;
        localStorage.setItem("msystem_lastActivity", now.toString());
        // If warning is showing, dismiss it since the user is active
        if (warningShownRef.current) {
            warningShownRef.current = false;
            isLoggingOutRef.current = false;
            setShowWarning(false);
            setRemainingTime(IDLE_TIMEOUT);
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

        // Initialize from localStorage if available
        const storedActivity = localStorage.getItem("msystem_lastActivity");
        if (storedActivity) {
            msystem_lastActivityRef.current = parseInt(storedActivity, 10);
        } else {
            localStorage.setItem("msystem_lastActivity", msystem_lastActivityRef.current.toString());
        }

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

        // Listen for storage events from other tabs
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === "msystem_lastActivity" && e.newValue) {
                msystem_lastActivityRef.current = parseInt(e.newValue, 10);
                
                // If warning is showing, but another tab updated activity, hide it!
                if (warningShownRef.current) {
                    const elapsed = Date.now() - msystem_lastActivityRef.current;
                    const remaining = Math.max(0, IDLE_TIMEOUT - elapsed);
                    if (remaining > WARNING_BEFORE) {
                        warningShownRef.current = false;
                        setShowWarning(false);
                        setRemainingTime(remaining);
                    }
                }
            }
        };
        window.addEventListener("storage", handleStorageChange);

        const checkTimeout = () => {
            // Always double check localStorage to ensure we have the absolute latest from any tab
            const storedActivity = localStorage.getItem("msystem_lastActivity");
            if (storedActivity) {
                msystem_lastActivityRef.current = Math.max(msystem_lastActivityRef.current, parseInt(storedActivity, 10));
            }

            const elapsed = Date.now() - msystem_lastActivityRef.current;
            const remaining = Math.max(0, IDLE_TIMEOUT - elapsed);
            setRemainingTime(remaining);

            // Show warning when approaching timeout
            if (remaining <= WARNING_BEFORE && remaining > 0 && !warningShownRef.current) {
                warningShownRef.current = true;
                setShowWarning(true);
                onWarning?.();
            }

            // Auto logout when timeout reached
            if (remaining <= 0 && !isLoggingOutRef.current) {
                isLoggingOutRef.current = true;
                onIdle?.();
                handleLogout();
            }
        };

        // Check idle status periodically
        const intervalId = setInterval(checkTimeout, CHECK_INTERVAL);

        // Also update remaining time more frequently when warning is shown
        const warningIntervalId = setInterval(() => {
            if (warningShownRef.current) {
                checkTimeout();
            }
        }, 1000);

        return () => {
            events.forEach((event) => {
                document.removeEventListener(event, throttledActivity);
            });
            window.removeEventListener("storage", handleStorageChange);
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
