import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';
import { processEmailCampaign } from '../../send/route';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userScope = await getUserScope();
    if (!userScope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedScopes = ['superadmin', 'national', 'region', 'university'];
    if (!allowedScopes.includes(userScope.scope)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    const campaignId = Number(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          orderBy: { recipientName: 'asc' },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return NextResponse.json({ error: 'Failed to fetch campaign details' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userScope = await getUserScope();
    if (!userScope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedScopes = ['superadmin', 'national', 'region', 'university'];
    if (!allowedScopes.includes(userScope.scope)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    const campaignId = Number(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: 'Invalid campaign ID' }, { status: 400 });
    }

    const { action, logId } = await request.json();

    if (action === 'retry_single') {
      if (!logId) {
        return NextResponse.json({ error: 'logId is required' }, { status: 400 });
      }

      const log = await prisma.emailRecipientLog.findFirst({
        where: { id: Number(logId), campaignId },
      });

      if (!log) {
        return NextResponse.json({ error: 'Recipient log not found' }, { status: 404 });
      }

      if (log.status !== 'FAILED') {
        return NextResponse.json({ error: 'Only failed logs can be retried' }, { status: 400 });
      }

      // Reset the recipient log to PENDING
      await prisma.emailRecipientLog.update({
        where: { id: log.id },
        data: { status: 'PENDING', errorMessage: null },
      });

      // Update campaign stats
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'PENDING',
          failedCount: { decrement: 1 },
        },
      });

      processEmailCampaign(campaignId).catch((err) => {
        console.error('Retry single email error:', err);
      });

      return NextResponse.json({ success: true, message: 'Retrying recipient email' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in campaign ID action:', error);
    return NextResponse.json({ error: 'Failed to execute campaign action' }, { status: 500 });
  }
}
