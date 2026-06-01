import { NextRequest, NextResponse } from 'next/server';
import { prisma, getPrismaClient } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';
import { buildQueryConditions } from '../count/route';
import { getSentCountInLast24Hours, sendCampaignEmail } from '@/lib/email-sender';

// Process email campaign in the background
async function processEmailCampaign(campaignId: number, attachments?: any[]) {
  try {
    // 1. Fetch campaign subject/body upfront
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      console.error(`Campaign ${campaignId} not found`);
      return;
    }

    // 2. Update campaign status to SENDING
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    // 3. Fetch all pending recipients for this campaign
    const pendingLogs = await prisma.emailRecipientLog.findMany({
      where: {
        campaignId,
        status: 'PENDING',
      },
    });

    for (const log of pendingLogs) {
      // Check Gmail SMTP Daily Limit protection
      const sentLast24Hours = await getSentCountInLast24Hours();
      if (sentLast24Hours >= 450) {
        console.warn(`Gmail SMTP Daily Limit Approaching (${sentLast24Hours}/500). Pausing campaign ${campaignId}.`);
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { status: 'PAUSED' },
        });
        return;
      }

      try {
        // Send the email
        await sendCampaignEmail(log.recipientEmail, campaign.subject, campaign.body, attachments);

        // Update recipient log to SENT
        await prisma.emailRecipientLog.update({
          where: { id: log.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        // Increment campaign sent count
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            sentCount: { increment: 1 },
          },
        });
      } catch (sendError: any) {
        console.error(`Failed to send email to ${log.recipientEmail}:`, sendError);
        
        // Update recipient log to FAILED
        await prisma.emailRecipientLog.update({
          where: { id: log.id },
          data: {
            status: 'FAILED',
            errorMessage: sendError.message || 'Unknown SMTP error',
          },
        });

        // Increment campaign failed count
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: {
            failedCount: { increment: 1 },
          },
        });
      }

      // Small throttling delay to not spam SMTP
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // 4. Mark campaign as COMPLETED once all logs processed
    const remainingPending = await prisma.emailRecipientLog.count({
      where: { campaignId, status: 'PENDING' },
    });

    if (remainingPending === 0) {
      const updated = await prisma.emailCampaign.findUnique({
        where: { id: campaignId },
      });
      const finalStatus = (updated?.sentCount || 0) > 0 ? 'COMPLETED' : 'FAILED';
      
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: finalStatus },
      });
    }
  } catch (error) {
    console.error(`Background campaign execution error on ID ${campaignId}:`, error);
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' },
    });
  }
}

// Keep a reference of campaign runner to call asynchronously
export { processEmailCampaign };

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

    const { subject, body, filters, customRecipients, attachments } = await request.json();

    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and Body are required' }, { status: 400 });
    }

    let recipients: { name: string; email: string; type: string; id?: number }[] = [];

    const targetGroup = filters?.targetGroup || 'all';
    const excludeCampaignId = filters?.excludeCampaignId;

    if (targetGroup === 'custom') {
      recipients = customRecipients || [];
    } else {
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

      // Fetch students if selected
      let students: any[] = [];
      if (targetGroup === 'all' || targetGroup === 'students' || targetGroup === 'migrating') {
        students = await db.student.findMany({
          where: studentWhere,
          select: { id: true, fullName: true, email: true },
        });
      }

      // Fetch graduates if selected
      let graduates: any[] = [];
      if (targetGroup === 'all' || targetGroup === 'graduates') {
        graduates = await db.graduate.findMany({
          where: graduateWhere,
          select: { id: true, fullName: true, email: true },
        });
      }

      // Merge and map
      recipients = [
        ...students.map((s) => ({ name: s.fullName, email: s.email, type: 'student', id: s.id })),
        ...graduates.map((g) => ({ name: g.fullName, email: g.email, type: 'graduate', id: g.id })),
      ];

      // Filter out explicitly excluded emails
      if (filters?.excludedEmails && Array.isArray(filters.excludedEmails) && filters.excludedEmails.length > 0) {
        const excludedSet = new Set(filters.excludedEmails.map((e: string) => e.toLowerCase().trim()));
        recipients = recipients.filter(r => r.email && !excludedSet.has(r.email.toLowerCase().trim()));
      }
    }

    // Filter out invalid/duplicate emails
    const uniqueRecipientsMap = new Map<string, typeof recipients[0]>();
    for (const rec of recipients) {
      if (rec.email && rec.email.includes('@')) {
        const cleanedEmail = rec.email.trim().toLowerCase();
        if (!uniqueRecipientsMap.has(cleanedEmail)) {
          uniqueRecipientsMap.set(cleanedEmail, rec);
        }
      }
    }
    const finalRecipients = Array.from(uniqueRecipientsMap.values());

    if (finalRecipients.length === 0) {
      return NextResponse.json({ error: 'No matching recipients with valid email addresses found' }, { status: 400 });
    }

    // Create the EmailCampaign record
    const campaign = await prisma.emailCampaign.create({
      data: {
        subject,
        body,
        status: 'PENDING',
        totalCount: finalRecipients.length,
        sentCount: 0,
        failedCount: 0,
      },
    });

    // Bulk create EmailRecipientLog records
    await prisma.emailRecipientLog.createMany({
      data: finalRecipients.map((rec) => ({
        campaignId: campaign.id,
        recipientEmail: rec.email.trim().toLowerCase(),
        recipientName: rec.name,
        recipientType: rec.type,
        recipientId: rec.id || null,
        status: 'PENDING',
      })),
    });

    // Trigger the background task without blocking the HTTP response
    processEmailCampaign(campaign.id, attachments).catch((err) => {
      console.error('Unhandled campaign runner promise error:', err);
    });

    // Log this action to AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_CAMPAIGN_CREATED',
        userId: userScope.userId,
        details: `Created campaign ID ${campaign.id}: "${subject}" to ${finalRecipients.length} recipients.`,
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      totalCount: finalRecipients.length,
    });
  } catch (error) {
    console.error('Error starting emailing campaign:', error);
    return NextResponse.json({ error: 'Failed to start emailing campaign' }, { status: 500 });
  }
}
