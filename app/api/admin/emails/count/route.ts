import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';

export function buildQueryConditions(filters: any, userScope: any) {
  const targetGroup = filters.targetGroup || 'all';
  const studentWhere: any = {
    email: { not: null, notIn: ['', 'none'] },
  };
  const graduateWhere: any = {
    email: { not: null, notIn: ['', 'none'] },
  };

  // Apply migrating filter
  if (targetGroup === 'migrating') {
    studentWhere.status = 'migrating';
  }

  // Apply Role Scope boundaries
  if (userScope.scope === 'region') {
    studentWhere.regionId = userScope.regionId;
    if (targetGroup === 'graduates' || targetGroup === 'all') {
      graduateWhere.id = -1; // Exclude graduates
    }
  } else if (userScope.scope === 'university') {
    studentWhere.universityId = userScope.universityId;
    if (targetGroup === 'graduates' || targetGroup === 'all') {
      graduateWhere.id = -1; // Exclude graduates
    }
  } else if (userScope.scope === 'smallgroup') {
    studentWhere.smallGroupId = userScope.smallGroupId;
    if (targetGroup === 'graduates' || targetGroup === 'all') {
      graduateWhere.id = -1; // Exclude graduates
    }
  } else if (userScope.scope === 'graduatesmallgroup') {
    studentWhere.id = -1; // Exclude students
    graduateWhere.graduateGroupId = userScope.graduateGroupId;
  }

  // Student filters
  const sf = filters.studentFilters || {};
  if (sf.regionId && userScope.scope !== 'region' && userScope.scope !== 'university' && userScope.scope !== 'smallgroup') {
    studentWhere.regionId = Number(sf.regionId);
  }
  if (sf.universityId && userScope.scope !== 'university' && userScope.scope !== 'smallgroup') {
    studentWhere.universityId = Number(sf.universityId);
  }
  if (sf.smallGroupId && userScope.scope !== 'smallgroup') {
    studentWhere.smallGroupId = Number(sf.smallGroupId);
  }
  if (sf.yearOfStudy && sf.yearOfStudy.length > 0) {
    studentWhere.yearOfStudy = { in: sf.yearOfStudy.map(Number) };
  }
  if (sf.sex) {
    studentWhere.sex = sf.sex;
  }
  if (sf.status && targetGroup !== 'migrating') {
    studentWhere.status = sf.status;
  }
  if (sf.intakeYear) {
    const year = Number(sf.intakeYear);
    if (!isNaN(year)) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
      studentWhere.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }
  }

  // Graduate filters
  const gf = filters.graduateFilters || {};
  if (userScope.scope === 'superadmin' || userScope.scope === 'national') {
    if (gf.provinceId) {
      graduateWhere.provinceId = BigInt(gf.provinceId);
    }
    if (gf.graduateGroupId) {
      graduateWhere.graduateGroupId = Number(gf.graduateGroupId);
    }
    if (gf.servingPillars && gf.servingPillars.length > 0) {
      graduateWhere.servingPillars = { hasSome: gf.servingPillars };
    }
    if (gf.sex) {
      graduateWhere.sex = gf.sex;
    }
    if (gf.status) {
      graduateWhere.status = gf.status;
    }
    if (gf.financialSupport !== undefined && gf.financialSupport !== null) {
      graduateWhere.financialSupport = gf.financialSupport === 'true' || gf.financialSupport === true;
    }
    if (gf.isDiaspora !== undefined && gf.isDiaspora !== null) {
      graduateWhere.isDiaspora = gf.isDiaspora === 'true' || gf.isDiaspora === true;
    }
  }

  return { studentWhere, graduateWhere };
}

export async function POST(request: NextRequest) {
  try {
    const userScope = await getUserScope();
    if (!userScope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filters = await request.json();
    const targetGroup = filters.targetGroup || 'all';
    const excludeCampaignId = filters.excludeCampaignId;

    if (targetGroup === 'custom') {
      const customRecipients = filters.customRecipients || [];
      return NextResponse.json({ count: customRecipients.length });
    }

    const db = getPrismaClient('read');
    const { studentWhere, graduateWhere } = buildQueryConditions(filters, userScope);

    // Apply exclusion list if excludeCampaignId is provided
    if (excludeCampaignId) {
      const sentRecipients = await db.emailRecipientLog.findMany({
        where: {
          campaignId: Number(excludeCampaignId),
          status: 'SENT',
        },
        select: { recipientEmail: true },
      });
      const sentEmails = sentRecipients
        .map((r) => r.recipientEmail.trim().toLowerCase())
        .filter(Boolean);

      if (sentEmails.length > 0) {
        const existingStudentNotIn = Array.isArray(studentWhere.email?.notIn)
          ? studentWhere.email.notIn
          : [];
        studentWhere.email = {
          not: studentWhere.email?.not,
          notIn: Array.from(new Set([...existingStudentNotIn, ...sentEmails])),
        };

        const existingGraduateNotIn = Array.isArray(graduateWhere.email?.notIn)
          ? graduateWhere.email.notIn
          : [];
        graduateWhere.email = {
          not: graduateWhere.email?.not,
          notIn: Array.from(new Set([...existingGraduateNotIn, ...sentEmails])),
        };
      }
    }

    let studentCount = 0;
    let graduateCount = 0;

    if (targetGroup === 'all' || targetGroup === 'students' || targetGroup === 'migrating') {
      studentCount = await db.student.count({ where: studentWhere });
    }

    if (targetGroup === 'all' || targetGroup === 'graduates') {
      // BigInt in graduateWhere handles provinceId safely
      graduateCount = await db.graduate.count({ where: graduateWhere });
    }

    return NextResponse.json({ count: studentCount + graduateCount });
  } catch (error) {
    console.error('Error counting emailing recipients:', error);
    return NextResponse.json({ error: 'Failed to count recipients' }, { status: 500 });
  }
}
