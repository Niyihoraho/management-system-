import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';
import { buildQueryConditions } from '../count/route';

export async function POST(request: NextRequest) {
  try {
    const userScope = await getUserScope();
    if (!userScope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Restrict bulk emailing to region-admin and above
    const allowedScopes = ['superadmin', 'national', 'region', 'university'];
    if (!allowedScopes.includes(userScope.scope)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const filters = await request.json();
    const targetGroup = filters.targetGroup || 'all';
    const excludeCampaignId = filters.excludeCampaignId;

    if (targetGroup === 'custom') {
      return NextResponse.json({ contacts: [] });
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

    let students: any[] = [];
    if (targetGroup === 'all' || targetGroup === 'students' || targetGroup === 'migrating') {
      students = await db.student.findMany({
        where: studentWhere,
        select: { id: true, fullName: true, email: true, status: true },
        orderBy: { fullName: 'asc' },
      });
    }

    let graduates: any[] = [];
    if (targetGroup === 'all' || targetGroup === 'graduates') {
      graduates = await db.graduate.findMany({
        where: graduateWhere,
        select: { id: true, fullName: true, email: true, status: true },
        orderBy: { fullName: 'asc' },
      });
    }

    const contacts = [
      ...students.map((s) => ({ id: s.id, name: s.fullName, email: s.email, type: 'student', status: s.status })),
      ...graduates.map((g) => ({ id: g.id, name: g.fullName, email: g.email, type: 'graduate', status: g.status })),
    ];

    // Sort alphabetically by name
    contacts.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Error fetching emailing contacts list:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts list' }, { status: 500 });
  }
}
