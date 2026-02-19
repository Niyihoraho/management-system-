"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type UserRole = 'superadmin' | 'national' | 'region' | 'university' | 'smallGroup' | 'graduateSmallGroup';

interface RoleAccessContextType {
    userRole: UserRole | null;
    userScope: any | null; // Detailed role object
    isLoading: boolean;
}

const RoleAccessContext = createContext<RoleAccessContextType>({
    userRole: null,
    userScope: null,
    isLoading: true,
});

export function RoleAccessProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userScope, setUserScope] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated" || !session?.user?.roles) {
            setUserRole(null);
            setUserScope(null);
            setIsLoading(false);
            return;
        }

        // Determine the most restrictive/highest priority role
        const roles = session.user.roles;
        if (roles && roles.length > 0) {
            // Priority map: Superadmin > National > Region > University > SmallGroup > GraduateGroup
            const priorityMap: Record<string, number> = {
                'superadmin': 100,
                'national': 90,
                'region': 80,
                'university': 70,
                'graduateSmallGroup': 60,
                'smallGroup': 50
            };

            const sortedRoles = [...roles].sort((a, b) => {
                const pA = priorityMap[a.scope] || 0;
                const pB = priorityMap[b.scope] || 0;
                return pB - pA; // Descending priority // Wait, higher number should be higher priority?
                // Logic says: pB - pA for descending.
                // 100 - 90 = 10 (positive), so a comes first. Correct.
            });

            const primary = sortedRoles[0];
            setUserRole(primary.scope as UserRole);
            setUserScope(primary);
        } else {
            setUserRole(null);
            setUserScope(null);
        }

        setIsLoading(false);
    }, [session, status]);

    return (
        <RoleAccessContext.Provider value={{ userRole, userScope, isLoading }}>
            {children}
        </RoleAccessContext.Provider>
    );
}

export const useRoleAccess = () => useContext(RoleAccessContext);
