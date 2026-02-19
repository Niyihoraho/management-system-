import { NextRequest, NextResponse } from "next/server";
import { getUserScope, generateRLSConditions, UserScope } from "./rls";

/**
 * Middleware to automatically apply RLS to API routes
 * This can be used to wrap API route handlers
 */
export function withRLS<T extends unknown[]>(
  handler: (request: NextRequest, userScope: UserScope, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const userScope = await getUserScope();
      
      if (!userScope) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return await handler(request, userScope, ...args);
    } catch (error) {
      console.error('RLS middleware error:', error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Helper function to create RLS-aware Prisma queries
 */
export function createRLSQuery(userScope: UserScope, baseWhere: Record<string, unknown> = {}) {
  const rlsConditions = generateRLSConditions(userScope);
  
  return {
    where: {
      ...baseWhere,
      ...rlsConditions
    }
  };
}

/**
 * Helper function to check if user can access a specific resource
 */
export async function checkResourceAccess(
  userScope: UserScope,
  resourceType: 'region' | 'university' | 'smallgroup' | 'alumnismallgroup',
  resourceId: number
): Promise<boolean> {
  // Superadmin and national have access to everything
  if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
    return true;
  }

  // Import the hasPermission function dynamically to avoid circular imports
  const { hasPermission } = await import('./rls');
  return hasPermission(userScope, resourceType, resourceId);
}

/**
 * Helper function to get RLS conditions for specific tables
 */
export function getTableRLSConditions(userScope: UserScope, tableName: string): Record<string, unknown> {
  const rlsConditions = generateRLSConditions(userScope);
  
  // For tables that don't have all the foreign key columns,
  // we need to map the conditions appropriately
  switch (tableName) {
    case 'member':
    case 'trainings':
    case 'permanentministryevent':
    case 'budget':
    case 'document':
    case 'contributiondesignation':
      // These tables have regionId, universityId, smallGroupId, alumniGroupId
      return rlsConditions;
    
    case 'university':
      // Universities only have regionId
      return rlsConditions.regionId ? { regionId: rlsConditions.regionId } : {};
    
    case 'smallgroup':
      // Small groups have regionId and universityId
      return {
        ...(rlsConditions.regionId && { regionId: rlsConditions.regionId }),
        ...(rlsConditions.universityId && { universityId: rlsConditions.universityId })
      };
    
    case 'alumnismallgroup':
      // Alumni groups have regionId
      return rlsConditions.regionId ? { regionId: rlsConditions.regionId } : {};
    
    case 'region':
      // Regions don't have foreign keys, so we need to check if user has access to specific regions
      if (userScope.scope === 'region' && userScope.regionId) {
        return { id: userScope.regionId };
      }
      return {};
    
    default:
      return rlsConditions;
  }
}

