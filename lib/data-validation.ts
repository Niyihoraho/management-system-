"use client";

import { prisma } from '@/lib/prisma';

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    missingData: number;
  };
}

export interface ValidationOptions {
  checkDataIntegrity?: boolean;
  checkRLS?: boolean;
  checkPerformance?: boolean;
  checkConsistency?: boolean;
}

/**
 * Validates engagement data consistency across all levels
 */
export async function validateEngagementData(options: ValidationOptions = {}): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalRecords = 0;
  let validRecords = 0;
  let invalidRecords = 0;
  let missingData = 0;

  try {
    // 1. Validate Member Data
    console.log('🔍 Validating member data...');
    const memberValidation = await validateMemberData();
    errors.push(...memberValidation.errors);
    warnings.push(...memberValidation.warnings);
    totalRecords += memberValidation.summary.totalRecords;
    validRecords += memberValidation.summary.validRecords;
    invalidRecords += memberValidation.summary.invalidRecords;
    missingData += memberValidation.summary.missingData;

    // 2. Validate Attendance Data
    console.log('🔍 Validating attendance data...');
    const attendanceValidation = await validateAttendanceData();
    errors.push(...attendanceValidation.errors);
    warnings.push(...attendanceValidation.warnings);
    totalRecords += attendanceValidation.summary.totalRecords;
    validRecords += attendanceValidation.summary.validRecords;
    invalidRecords += attendanceValidation.summary.invalidRecords;
    missingData += attendanceValidation.summary.missingData;

    // 3. Validate Contribution Data
    console.log('🔍 Validating contribution data...');
    const contributionValidation = await validateContributionData();
    errors.push(...contributionValidation.errors);
    warnings.push(...contributionValidation.warnings);
    totalRecords += contributionValidation.summary.totalRecords;
    validRecords += contributionValidation.summary.validRecords;
    invalidRecords += contributionValidation.summary.invalidRecords;
    missingData += contributionValidation.summary.missingData;

    // 4. Validate Organizational Hierarchy
    console.log('🔍 Validating organizational hierarchy...');
    const hierarchyValidation = await validateOrganizationalHierarchy();
    errors.push(...hierarchyValidation.errors);
    warnings.push(...hierarchyValidation.warnings);

    // 5. Validate Data Consistency
    if (options.checkConsistency) {
      console.log('🔍 Validating data consistency...');
      const consistencyValidation = await validateDataConsistency();
      errors.push(...consistencyValidation.errors);
      warnings.push(...consistencyValidation.warnings);
    }

    // 6. Validate RLS (Row Level Security)
    if (options.checkRLS) {
      console.log('🔍 Validating RLS policies...');
      const rlsValidation = await validateRLSPolicies();
      errors.push(...rlsValidation.errors);
      warnings.push(...rlsValidation.warnings);
    }

    // 7. Performance Check
    if (options.checkPerformance) {
      console.log('🔍 Validating performance...');
      const performanceValidation = await validatePerformance();
      warnings.push(...performanceValidation.warnings);
    }

  } catch (error) {
    errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRecords,
      validRecords,
      invalidRecords,
      missingData
    }
  };
}

/**
 * Validates member data integrity
 */
async function validateMemberData(): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalRecords = 0;
  let validRecords = 0;
  let invalidRecords = 0;
  let missingData = 0;

  try {
    // Check for members without required fields
    const membersWithoutNames = await prisma.member.count({
      where: {
        OR: [
          { firstname: null },
          { firstname: '' },
          { secondname: null },
          { secondname: '' }
        ]
      }
    });

    if (membersWithoutNames > 0) {
      errors.push(`${membersWithoutNames} members missing required name fields`);
      missingData += membersWithoutNames;
    }

    // Check for members without organizational assignments
    const membersWithoutRegion = await prisma.member.count({
      where: { regionId: null }
    });

    if (membersWithoutRegion > 0) {
      errors.push(`${membersWithoutRegion} members not assigned to any region`);
      invalidRecords += membersWithoutRegion;
    }

    const membersWithoutUniversity = await prisma.member.count({
      where: { universityId: null }
    });

    if (membersWithoutUniversity > 0) {
      warnings.push(`${membersWithoutUniversity} members not assigned to any university`);
      missingData += membersWithoutUniversity;
    }

    const membersWithoutSmallGroup = await prisma.member.count({
      where: { smallGroupId: null }
    });

    if (membersWithoutSmallGroup > 0) {
      warnings.push(`${membersWithoutSmallGroup} members not assigned to any small group`);
      missingData += membersWithoutSmallGroup;
    }

    // Get total member count
    totalRecords = await prisma.member.count();
    validRecords = totalRecords - invalidRecords - missingData;

  } catch (error) {
    errors.push(`Member validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: { totalRecords, validRecords, invalidRecords, missingData }
  };
}

/**
 * Validates attendance data integrity
 */
async function validateAttendanceData(): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalRecords = 0;
  let validRecords = 0;
  let invalidRecords = 0;
  let missingData = 0;

  try {
    // Check for attendance records without members
    const attendanceWithoutMembers = await prisma.attendance.count({
      where: { memberId: null }
    });

    if (attendanceWithoutMembers > 0) {
      errors.push(`${attendanceWithoutMembers} attendance records without member reference`);
      invalidRecords += attendanceWithoutMembers;
    }

    // Check for attendance records without events
    const attendanceWithoutEvents = await prisma.attendance.count({
      where: {
        AND: [
          { permanentEventId: null },
          { trainingId: null }
        ]
      }
    });

    if (attendanceWithoutEvents > 0) {
      errors.push(`${attendanceWithoutEvents} attendance records without event reference`);
      invalidRecords += attendanceWithoutEvents;
    }

    // Check for invalid attendance statuses
    const invalidStatuses = await prisma.attendance.count({
      where: {
        status: {
          notIn: ['present', 'absent', 'excuse']
        }
      }
    });

    if (invalidStatuses > 0) {
      errors.push(`${invalidStatuses} attendance records with invalid status`);
      invalidRecords += invalidStatuses;
    }

    // Check for future attendance dates
    const futureAttendance = await prisma.attendance.count({
      where: {
        recordedAt: {
          gt: new Date()
        }
      }
    });

    if (futureAttendance > 0) {
      warnings.push(`${futureAttendance} attendance records with future dates`);
    }

    // Get total attendance count
    totalRecords = await prisma.attendance.count();
    validRecords = totalRecords - invalidRecords;

  } catch (error) {
    errors.push(`Attendance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: { totalRecords, validRecords, invalidRecords, missingData }
  };
}

/**
 * Validates contribution data integrity
 */
async function validateContributionData(): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalRecords = 0;
  let validRecords = 0;
  let invalidRecords = 0;
  let missingData = 0;

  try {
    // Check for contributions without members
    const contributionsWithoutMembers = await prisma.contribution.count({
      where: { memberId: null }
    });

    if (contributionsWithoutMembers > 0) {
      errors.push(`${contributionsWithoutMembers} contributions without member reference`);
      invalidRecords += contributionsWithoutMembers;
    }

    // Check for contributions without designation
    const contributionsWithoutDesignation = await prisma.contribution.count({
      where: { designationId: null }
    });

    if (contributionsWithoutDesignation > 0) {
      errors.push(`${contributionsWithoutDesignation} contributions without designation reference`);
      invalidRecords += contributionsWithoutDesignation;
    }

    // Check for invalid contribution statuses
    const invalidStatuses = await prisma.contribution.count({
      where: {
        status: {
          notIn: ['pending', 'completed', 'cancelled']
        }
      }
    });

    if (invalidStatuses > 0) {
      errors.push(`${invalidStatuses} contributions with invalid status`);
      invalidRecords += invalidStatuses;
    }

    // Get total contribution count
    totalRecords = await prisma.contribution.count();
    validRecords = totalRecords - invalidRecords;

  } catch (error) {
    errors.push(`Contribution validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: { totalRecords, validRecords, invalidRecords, missingData }
  };
}

/**
 * Validates organizational hierarchy integrity
 */
async function validateOrganizationalHierarchy(): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check for universities without regions
    const universitiesWithoutRegions = await prisma.university.count({
      where: { regionId: null }
    });

    if (universitiesWithoutRegions > 0) {
      errors.push(`${universitiesWithoutRegions} universities not assigned to any region`);
    }

    // Check for small groups without universities
    const smallGroupsWithoutUniversities = await prisma.smallGroup.count({
      where: { universityId: null }
    });

    if (smallGroupsWithoutUniversities > 0) {
      errors.push(`${smallGroupsWithoutUniversities} small groups not assigned to any university`);
    }

    // Check for orphaned members (members assigned to non-existent organizations)
    const orphanedMembers = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM member m
      LEFT JOIN region r ON r.id = m.regionId
      LEFT JOIN university u ON u.id = m.universityId
      LEFT JOIN smallgroup sg ON sg.id = m.smallGroupId
      WHERE r.id IS NULL OR u.id IS NULL OR sg.id IS NULL
    `;

    const orphanedCount = (orphanedMembers as any[])[0]?.count || 0;
    if (orphanedCount > 0) {
      errors.push(`${orphanedCount} members assigned to non-existent organizations`);
    }

  } catch (error) {
    errors.push(`Hierarchy validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: { totalRecords: 0, validRecords: 0, invalidRecords: 0, missingData: 0 }
  };
}

/**
 * Validates data consistency across different views
 */
async function validateDataConsistency(): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if attendance counts match between different aggregation levels
    const regionAttendanceCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM attendance a
      JOIN member m ON m.id = a.memberId
      WHERE a.status = 'present'
    `;

    const directAttendanceCount = await prisma.attendance.count({
      where: { status: 'present' }
    });

    const regionCount = (regionAttendanceCount as any[])[0]?.count || 0;
    if (regionCount !== directAttendanceCount) {
      errors.push(`Attendance count mismatch: Region view (${regionCount}) vs Direct count (${directAttendanceCount})`);
    }

    // Check if member counts are consistent
    const totalMembers = await prisma.member.count();
    const activeMembers = await prisma.member.count({
      where: { status: 'active' }
    });

    if (activeMembers > totalMembers) {
      errors.push(`Active members (${activeMembers}) cannot be greater than total members (${totalMembers})`);
    }

  } catch (error) {
    errors.push(`Consistency validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: { totalRecords: 0, validRecords: 0, invalidRecords: 0, missingData: 0 }
  };
}

/**
 * Validates RLS policies
 */
async function validateRLSPolicies(): Promise<DataValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // This would typically check if RLS policies are properly configured
    // For now, we'll just check if users have proper scope assignments

    const usersWithoutScope = await prisma.user.count({
      where: {
        OR: [
          { regionId: null },
          { universityId: null },
          { smallGroupId: null }
        ]
      }
    });

    if (usersWithoutScope > 0) {
      warnings.push(`${usersWithoutScope} users without proper scope assignments`);
    }

  } catch (error) {
    errors.push(`RLS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: { totalRecords: 0, validRecords: 0, invalidRecords: 0, missingData: 0 }
  };
}

/**
 * Validates performance metrics
 */
async function validatePerformance(): Promise<DataValidationResult> {
  const warnings: string[] = [];

  try {
    // Check for large tables that might need indexing
    const memberCount = await prisma.member.count();
    if (memberCount > 10000) {
      warnings.push(`Large member table (${memberCount} records) - consider adding indexes`);
    }

    const attendanceCount = await prisma.attendance.count();
    if (attendanceCount > 100000) {
      warnings.push(`Large attendance table (${attendanceCount} records) - consider partitioning`);
    }

    // Check for slow queries (this would need to be implemented with query timing)
    // For now, we'll just check table sizes

  } catch (error) {
    warnings.push(`Performance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: true,
    errors: [],
    warnings,
    summary: { totalRecords: 0, validRecords: 0, invalidRecords: 0, missingData: 0 }
  };
}

/**
 * Utility function to run validation and return formatted results
 */
export async function runDataValidation(options: ValidationOptions = {}): Promise<{
  isValid: boolean;
  report: string;
  details: DataValidationResult;
}> {
  console.log('🚀 Starting data validation...');

  const result = await validateEngagementData(options);

  let report = '';

  if (result.isValid) {
    report += '✅ Data validation passed!\n';
  } else {
    report += '❌ Data validation failed!\n';
  }

  report += `\n📊 Summary:\n`;
  report += `- Total Records: ${result.summary.totalRecords}\n`;
  report += `- Valid Records: ${result.summary.validRecords}\n`;
  report += `- Invalid Records: ${result.summary.invalidRecords}\n`;
  report += `- Missing Data: ${result.summary.missingData}\n`;

  if (result.errors.length > 0) {
    report += `\n❌ Errors (${result.errors.length}):\n`;
    result.errors.forEach((error, index) => {
      report += `${index + 1}. ${error}\n`;
    });
  }

  if (result.warnings.length > 0) {
    report += `\n⚠️ Warnings (${result.warnings.length}):\n`;
    result.warnings.forEach((warning, index) => {
      report += `${index + 1}. ${warning}\n`;
    });
  }

  console.log('📋 Validation Report:', report);

  return {
    isValid: result.isValid,
    report,
    details: result
  };
}

