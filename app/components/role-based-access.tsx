"use client";
import { useSession } from "next-auth/react";
import { useRoleAccess, UserRole } from "./providers/role-access-provider";

// Export UserRole for consumers who might need it (re-export)
export type { UserRole };

interface UserScope {
  scope: UserRole;
  region?: { id: number; name: string };
  university?: { id: number; name: string; regionId: number };
  smallGroup?: { id: number; name: string; regionId: number; universityId: number };
  graduateSmallGroup?: { id: number; name: string; regionId: number };
}

interface RoleBasedAccessProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  deniedRoles?: UserRole[];
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export default function RoleBasedAccess({
  children,
  allowedRoles,
  deniedRoles,
  fallback = null,
  loading = null
}: RoleBasedAccessProps) {
  const { data: session, status } = useSession();
  const { userScope, isLoading, userRole } = useRoleAccess();

  // Show loading state
  if (status === "loading" || isLoading) {
    return <>{loading}</>;
  }

  // No session - show fallback
  if (!session?.user?.id) {
    return <>{fallback}</>;
  }

  // No user scope found - show fallback
  if (!userScope || !userRole) {
    console.warn('No user scope found, showing fallback');
    return <>{fallback}</>;
  }

  // Debug logging
  console.log('RoleBasedAccess Debug:', {
    userRole,
    allowedRoles,
    deniedRoles,
    willShow: !deniedRoles?.includes(userRole) && (!allowedRoles || allowedRoles.includes(userRole))
  });

  // Check denied roles first (higher priority)
  if (deniedRoles && deniedRoles.includes(userRole)) {
    console.log('Access denied: User role is in denied roles');
    return <>{fallback}</>;
  }

  // Check allowed roles
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.log('Access denied: User role not in allowed roles');
    return <>{fallback}</>;
  }

  // If no restrictions or user passes all checks, show children
  return <>{children}</>;
}

// Flexible scope-based access components
// You can easily allow or deny any combination of scopes

// ALLOW specific scopes only
export function AllowOnly({
  scopes,
  children,
  fallback = null
}: {
  scopes: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowedRoles = Array.isArray(scopes) ? scopes : [scopes];
  return (
    <RoleBasedAccess allowedRoles={allowedRoles} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

// DENY specific scopes
export function DenyOnly({
  scopes,
  children,
  fallback = null
}: {
  scopes: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const deniedRoles = Array.isArray(scopes) ? scopes : [scopes];
  return (
    <RoleBasedAccess deniedRoles={deniedRoles} fallback={fallback}>
      {children}
    </RoleBasedAccess>
  );
}

// Convenience components for common use cases
export function SuperAdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes="superadmin" fallback={fallback}>{children}</AllowOnly>;
}

export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes={['superadmin', 'national']} fallback={fallback}>{children}</AllowOnly>;
}

export function NotSmallGroup({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <DenyOnly scopes={['smallGroup', 'graduateSmallGroup']} fallback={fallback}>{children}</DenyOnly>;
}

export function NotGraduateSmallGroup({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <DenyOnly scopes="graduateSmallGroup" fallback={fallback}>{children}</DenyOnly>;
}

// Additional convenience components for all your scopes
export function RegionOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes="region" fallback={fallback}>{children}</AllowOnly>;
}

export function UniversityOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes="university" fallback={fallback}>{children}</AllowOnly>;
}

export function SmallGroupOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes="smallGroup" fallback={fallback}>{children}</AllowOnly>;
}

export function GraduateSmallGroupOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes="graduateSmallGroup" fallback={fallback}>{children}</AllowOnly>;
}

// Deny specific scopes
export function NotRegion({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <DenyOnly scopes="region" fallback={fallback}>{children}</DenyOnly>;
}

export function NotUniversity({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <DenyOnly scopes="university" fallback={fallback}>{children}</DenyOnly>;
}

export function NotSmallGroupOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <DenyOnly scopes="smallGroup" fallback={fallback}>{children}</DenyOnly>;
}

export function NotGraduateSmallGroupOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <DenyOnly scopes="graduateSmallGroup" fallback={fallback}>{children}</DenyOnly>;
}

// Multi-scope combinations
export function AdminAndRegion({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes={['superadmin', 'national', 'region']} fallback={fallback}>{children}</AllowOnly>;
}

export function AdminAndUniversity({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <AllowOnly scopes={['superadmin', 'national', 'university']} fallback={fallback}>{children}</AllowOnly>;
}

export function NotGroupLevel({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return <DenyOnly scopes={['smallGroup', 'graduateSmallGroup']} fallback={fallback}>{children}</DenyOnly>;
}

// Hook for getting user scope - now uses shared context
export function useUserScope() {
  const { userScope, isLoading, userRole } = useRoleAccess();

  // Determine which fields should be visible based on user scope
  const getVisibleFields = () => {
    if (!userScope) {
      return {
        region: true,
        university: true,
        smallGroup: true,
        graduateSmallGroup: true
      };
    }

    switch (userScope.scope) {
      case 'superadmin':
        return {
          region: true,
          university: true,
          smallGroup: true,
          graduateSmallGroup: true
        };
      case 'national':
        return {
          region: true,
          university: true,
          smallGroup: true,
          graduateSmallGroup: true
        };
      case 'region':
        return {
          region: false, // Region is pre-selected
          university: true,
          smallGroup: true,
          graduateSmallGroup: true
        };
      case 'university':
        return {
          region: false, // Region is pre-selected
          university: false, // University is pre-selected
          smallGroup: true,
          graduateSmallGroup: true
        };
      case 'smallGroup':
        return {
          region: false, // Region is pre-selected
          university: false, // University is pre-selected
          smallGroup: false, // Small group is pre-selected
          graduateSmallGroup: true
        };
      case 'graduateSmallGroup':
        return {
          region: false, // Region is pre-selected
          university: false, // University is pre-selected
          smallGroup: true,
          graduateSmallGroup: false // Graduate group is pre-selected
        };
      default:
        return {
          region: true,
          university: true,
          smallGroup: true,
          graduateSmallGroup: true
        };
    }
  };

  // Get default values based on user scope
  const getDefaultValues = () => {
    if (!userScope) {
      return {
        regionId: null,
        universityId: null,
        smallGroupId: null,
        graduateGroupId: null
      };
    }

    return {
      regionId: userScope.region?.id || null,
      universityId: userScope.university?.id || null,
      smallGroupId: userScope.smallGroup?.id || null,
      graduateGroupId: userScope.graduateSmallGroup?.id || null
    };
  };

  return {
    userScope,
    isLoading,
    userRole,
    getVisibleFields,
    getDefaultValues
  };
}
