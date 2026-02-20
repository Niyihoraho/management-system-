import { auth } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma";

// User scope interface
export interface UserScope {
  userId: string;
  scope: 'superadmin' | 'national' | 'region' | 'university' | 'smallgroup' | 'graduatesmallgroup';
  regionId?: number | null;
  universityId?: number | null;
  smallGroupId?: number | null;
  graduateGroupId?: number | null;
}


// RLS conditions interface
export interface RLSConditions {
  regionId?: number;
  universityId?: number;
  smallGroupId?: number;
  graduateGroupId?: number;
}

/**
 * Get the current user's scope from the session
 * Returns the most restrictive scope if user has multiple roles
 */
export async function getUserScope(): Promise<UserScope | null> {
  try {
    const session = await auth();

    if (!session?.user?.roles || session.user.roles.length === 0) {
      return null;
    }

    // Get the most restrictive scope (highest priority)
    const roles = session.user.roles;

    // Priority order: superadmin > national > region > university > smallGroup > graduateSmallGroup
    const scopePriority = {
      'superadmin': 1,
      'national': 2,
      'region': 3,
      'university': 4,
      'smallgroup': 5,
      'graduatesmallgroup': 6
    };

    // Find the role with the highest priority (most restrictive)
    const primaryRole = roles.reduce((prev, current) => {
      const prevScope = prev.scope as keyof typeof scopePriority;
      const currentScope = current.scope as keyof typeof scopePriority;
      const prevPriority = scopePriority[prevScope] || 999;
      const currentPriority = scopePriority[currentScope] || 999;
      return currentPriority < prevPriority ? current : prev;
    });

    return {
      userId: session.user.id,
      scope: primaryRole.scope as UserScope['scope'],
      regionId: primaryRole.regionId,
      universityId: primaryRole.universityId,
      smallGroupId: primaryRole.smallGroupId,
      graduateGroupId: primaryRole.graduateGroupId
    };
  } catch (error) {
    console.error('Error getting user scope:', error);
    return null;
  }
}

/**
 * Generate RLS conditions based on user scope
 * Returns an object with the appropriate WHERE conditions for database queries
 */
export function generateRLSConditions(userScope: UserScope): RLSConditions {
  const conditions: RLSConditions = {};

  // Superadmin has access to everything - no conditions needed
  if (userScope.scope === 'superadmin') {
    return conditions;
  }

  // National scope - access to all regions (no filtering needed for now)
  if (userScope.scope === 'national') {
    return conditions;
  }

  // Region scope - access to specific region and all its children
  if (userScope.scope === 'region' && userScope.regionId) {
    conditions.regionId = userScope.regionId;
    return conditions;
  }

  // University scope - access to specific university and its small groups
  if (userScope.scope === 'university' && userScope.universityId) {
    conditions.universityId = userScope.universityId;
    // Also include regionId for consistency
    if (userScope.regionId) {
      conditions.regionId = userScope.regionId;
    }
    return conditions;
  }

  // Small group scope - access to specific small group only
  if (userScope.scope === 'smallgroup' && userScope.smallGroupId) {
    conditions.smallGroupId = userScope.smallGroupId;
    // Include parent IDs for consistency
    if (userScope.universityId) {
      conditions.universityId = userScope.universityId;
    }
    if (userScope.regionId) {
      conditions.regionId = userScope.regionId;
    }
    return conditions;
  }

  // Graduate small group scope - access to specific graduate group only
  if (userScope.scope === 'graduatesmallgroup' && userScope.graduateGroupId) {
    conditions.graduateGroupId = userScope.graduateGroupId;
    // Include regionId for consistency
    if (userScope.regionId) {
      conditions.regionId = userScope.regionId;
    }
    return conditions;
  }

  // If no valid scope found, return empty conditions (no access)
  return conditions;
}

/**
 * Check if user has permission to access a specific reason
 */
export function hasPermission(
  userScope: UserScope,
  resourceType: 'region' | 'university' | 'smallgroup' | 'graduatesmallgroup',
  resourceId: number
): boolean {
  // Superadmin has access to everything
  if (userScope.scope === 'superadmin') {
    return true;
  }

  // National scope has access to everything
  if (userScope.scope === 'national') {
    return true;
  }

  switch (resourceType) {
    case 'region':
      return userScope.scope === 'region' && userScope.regionId === resourceId;

    case 'university':
      return (userScope.scope === 'university' && userScope.universityId === resourceId) ||
        (userScope.scope === 'region' && userScope.regionId !== null);

    case 'smallgroup':
      return (userScope.scope === 'smallgroup' && userScope.smallGroupId === resourceId) ||
        (userScope.scope === 'university' && userScope.universityId !== null) ||
        (userScope.scope === 'region' && userScope.regionId !== null);

    case 'graduatesmallgroup':
      return (userScope.scope === 'graduatesmallgroup' && userScope.graduateGroupId === resourceId) ||
        (userScope.scope === 'region' && userScope.regionId !== null);

    default:
      return false;
  }
}

/**
 * Get RLS conditions for specific tables
 * Some tables don't have all the foreign key columns, so we need to map appropriately
 */
export function getTableRLSConditions(userScope: UserScope, tableName: string): Record<string, unknown> {
  const rlsConditions = generateRLSConditions(userScope);

  switch (tableName) {
    case 'member':
    case 'Member':
    case 'trainings':
    case 'Training':
    case 'permanentministryevent':
    case 'PermanentMinistryEvent':
    case 'budget':
    case 'Budget':
    case 'document':
    case 'Document':
      // case 'contributiondesignation': // Removed as it might not be a valid table
      // These tables have regionId, universityId, smallGroupId, graduateGroupId
      return rlsConditions as Record<string, unknown>;

    case 'university':
    case 'University':
      // Universities only have regionId
      return rlsConditions.regionId ? { regionId: rlsConditions.regionId } : {};

    case 'smallGroup':
    case 'SmallGroup':
      // Small groups have regionId and universityId
      return {
        ...(rlsConditions.regionId && { regionId: rlsConditions.regionId }),
        ...(rlsConditions.universityId && { universityId: rlsConditions.universityId })
      };

    case 'graduateSmallGroup':
    case 'GraduateSmallGroup':
      // Graduate groups don't have regionId anymore
      return {};

    case 'region':
    case 'Region':
      // Regions don't have foreign keys, so we need to check if user has access to specific regions
      if (userScope.scope === 'region' && userScope.regionId) {
        return { id: userScope.regionId };
      }
      return {};

    case 'student':
    case 'Student':
      return {
        ...(rlsConditions.regionId && { regionId: rlsConditions.regionId }),
        ...(rlsConditions.universityId && { universityId: rlsConditions.universityId }),
        ...(rlsConditions.smallGroupId && { smallGroupId: rlsConditions.smallGroupId })
      };



    default:
      return rlsConditions as Record<string, unknown>;
  }
}

/**
 * Get RLS conditions for Report Submissions (Explicit Restriction)
 * BLOCKS: University, SmallGroup, GraduateSmallGroup
 * ALLOWS: Superadmin, National, Region (filtered)
 */
export function getReportRLSConditions(userScope: UserScope): Prisma.report_submissionWhereInput | { id: number } {
  if (!userScope) return { id: -1 }; // Block if no scope

  // Superadmin & National: See all
  if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
    return {};
  }

  // Region: See reports in their region plus their own submissions
  if (userScope.scope === 'region' && userScope.regionId) {
    return {
      OR: [
        { regionId: userScope.regionId },
        { userId: userScope.userId }
      ]
    };
  }

  // Other scopes (university/smallgroup/graduatesmallgroup) only see their own submissions
  return { userId: userScope.userId };
}

