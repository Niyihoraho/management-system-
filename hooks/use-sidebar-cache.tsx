"use client";

import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRoleAccess } from "@/components/providers/role-access-provider";
import {
  Grid3x3,
  UserCircle,
  Building2,
  Table,
  Plug,
  type LucideIcon,
} from "lucide-react";

// Define the NavItem type
interface NavItem {
  icon: LucideIcon;
  name: string;
  path?: string;
  subItems?: {
    name: string;
    path: string;
    pro: boolean;
    icon?: LucideIcon;
  }[];
}

interface SidebarCache {
  navItems: NavItem[];
  userRole: string;
  userId: string | null;
  timestamp: number;
  version: number;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_VERSION = 1;

// Global cache store
let globalCache: SidebarCache | null = null;

export function useSidebarCache() {
  const { data: session, status } = useSession();
  const { userRole: userScopedRole, isLoading: roleLoading } = useRoleAccess();
  const cacheRef = useRef<SidebarCache | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleInvalidate = () => {
      globalCache = null;
      cacheRef.current = null;
      setForceRefresh(prev => prev + 1);
    };

    const handleRefresh = () => {
      globalCache = null;
      cacheRef.current = null;
      setForceRefresh(prev => prev + 1);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sidebar-cache-invalidate', handleInvalidate);
      window.addEventListener('sidebar-cache-refresh', handleRefresh);

      return () => {
        window.removeEventListener('sidebar-cache-invalidate', handleInvalidate);
        window.removeEventListener('sidebar-cache-refresh', handleRefresh);
      };
    }
  }, []);

  // Check if cache is valid
  const isCacheValid = useCallback((cache: SidebarCache | null): boolean => {
    if (!cache) return false;

    const now = Date.now();
    const isExpired = now - cache.timestamp > CACHE_DURATION;
    const isVersionMismatch = cache.version !== CACHE_VERSION;
    const isUserMismatch = cache.userId !== session?.user?.id;
    const isRoleMismatch = cache.userRole !== (userScopedRole || "user");

    return !isExpired && !isVersionMismatch && !isUserMismatch && !isRoleMismatch;
  }, [session?.user?.id, userScopedRole]);

  // Generate navigation items based on user role
  const generateNavItems = useCallback((): NavItem[] => {
    const scopedRole = userScopedRole || "user";

    const baseItems: NavItem[] = [
      {
        icon: Grid3x3,
        name: "Home",
        path: "/dashboard",
      },
      {
        icon: UserCircle,
        name: "People Management",
        subItems: (() => {
          const baseItems = [
            {
              name: "Member Directory",
              path: "/links/people/members",
              pro: false,
            },
          ];

          // Only add Member Import for specific roles
          if (
            scopedRole === "superadmin" ||
            scopedRole === "region" ||
            scopedRole === "university"
          ) {
            baseItems.push({
              name: "Member Import",
              path: "/links/people/import",
              pro: false,
            });
          }

          return baseItems;
        })(),
      },
      // Only show Organization for users with specific roles
      ...(scopedRole === "superadmin" ||
        scopedRole === "national"
        ? [
          {
            icon: Building2,
            name: "Organization",
            subItems: (() => {
              const baseItems = [
                {
                  name: "Regions",
                  path: "/links/organization/regions",
                  pro: false,
                },
                {
                  name: "Universities",
                  path: "/links/organization/universities",
                  pro: false,
                },
                {
                  name: "Small Groups",
                  path: "/links/organization/small-groups",
                  pro: false,
                },
                {
                  name: "Alumni Small Groups",
                  path: "/links/organization/alumni-small-groups",
                  pro: false,
                },
              ];
              return baseItems;
            })(),
          },
        ]
        : []),

      // Legacy operational modules are intentionally removed
      ...(scopedRole === "superadmin" ||
        scopedRole === "national" ||
        scopedRole === "region" ||
        scopedRole === "university"
        ? [{
          icon: Table,
          name: "Reports & Analytics",
          subItems: (() => {
            const baseItems = [
              {
                name: "Engagement Reports",
                path: "/links/reports/engagement",
                pro: false,
              },
            ];

            // Only add Membership Reports for specific roles
            if (
              scopedRole === "superadmin" ||
              scopedRole === "region" ||
              scopedRole === "university"
            ) {
              baseItems.push(
                {
                  name: "Membership Reports",
                  path: "/links/reports/membership",
                  pro: false,
                },

              );
            }
            return baseItems;
          })(),
        }]
        : []),
      ...(scopedRole === "superadmin"
        ? [{
          icon: Plug,
          name: "System Administration",
          subItems: (() => {
            const baseItems = [
              {
                name: "User Management",
                path: "/links/admin/user-management",
                pro: false,
              },
            ];
            return baseItems;
          })(),
        }]
        : []),
    ];

    return baseItems;
  }, [userScopedRole]);

  // Get cached or generate new navigation items
  const navItems = useMemo(() => {
    // If still loading session or role, return cached items to prevent flickering
    if (status === "loading" || roleLoading) {
      return globalCache?.navItems || [];
    }

    // Check if we have a valid cache
    if (isCacheValid(globalCache)) {
      return globalCache!.navItems;
    }

    // Generate new navigation items
    const newNavItems = generateNavItems();

    // Update cache
    const newCache: SidebarCache = {
      navItems: newNavItems,
      userRole: userScopedRole || "user",
      userId: session?.user?.id || null,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };

    globalCache = newCache;
    cacheRef.current = newCache;

    return newNavItems;
  }, [status, roleLoading, userScopedRole, session?.user?.id, isCacheValid, generateNavItems, forceRefresh]);

  // Invalidate cache function
  const invalidateCache = useCallback(() => {
    globalCache = null;
    cacheRef.current = null;
  }, []);

  // Force refresh function
  const refreshCache = useCallback(() => {
    invalidateCache();
    // The next render will generate new items
  }, [invalidateCache]);

  // Check if we're using cached data
  const isUsingCache = useMemo(() => {
    return isCacheValid(globalCache) && globalCache !== null;
  }, [isCacheValid]);

  return {
    navItems,
    isLoading: status === "loading" || roleLoading,
    isUsingCache,
    invalidateCache,
    refreshCache,
  };
}
