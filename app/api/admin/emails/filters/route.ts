import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';

export async function GET(request: NextRequest) {
  try {
    const userScope = await getUserScope();
    if (!userScope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Restrict bulk emailing filters to roles of scope region and above
    const allowedScopes = ['superadmin', 'national', 'region', 'university'];
    if (!allowedScopes.includes(userScope.scope)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const db = getPrismaClient('read');

    // Fetch regions, universities, small groups
    const regions = await db.region.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const universities = await db.university.findMany({
      select: { id: true, name: true, regionId: true },
      orderBy: { name: 'asc' },
    });

    const smallGroups = await db.smallGroup.findMany({
      select: { id: true, name: true, universityId: true },
      orderBy: { name: 'asc' },
    });

    // Fetch provinces and convert BigInt ids
    const rawProvinces = await db.province.findMany({
      orderBy: { name: 'asc' },
    });
    const provinces = rawProvinces.map((p) => ({
      id: Number(p.id),
      name: p.name,
    }));

    // Fetch graduate small groups and convert BigInt ids
    const rawGraduateGroups = await db.graduatesmallgroup.findMany({
      orderBy: { name: 'asc' },
    });
    const graduateSmallGroups = rawGraduateGroups.map((g) => ({
      id: g.id,
      name: g.name,
      provinceId: g.provinceId ? Number(g.provinceId) : null,
    }));

    return NextResponse.json({
      regions,
      universities,
      smallGroups,
      provinces,
      graduateSmallGroups,
    });
  } catch (error) {
    console.error('Error fetching emailing filters:', error);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}
