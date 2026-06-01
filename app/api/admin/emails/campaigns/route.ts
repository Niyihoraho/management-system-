import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserScope } from '@/lib/rls';
import { processEmailCampaign } from '../send/route';

// GET: List all campaigns with pagination
export async function GET(request: NextRequest) {
  try {
    const userScope = await getUserScope();
    if (!userScope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(50, Number(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              recipients: true,
            },
          },
        },
      }),
      prisma.emailCampaign.count(),
    ]);

    // For each campaign, get pending count for resume display
    const campaignsWithPending = await Promise.all(
      campaigns.map(async (c) => {
        const pendingCount = await prisma.emailRecipientLog.count({
          where: { campaignId: c.id, status: 'PENDING' },
        });
        const failedCount = await prisma.emailRecipientLog.count({
          where: { campaignId: c.id, status: 'FAILED' },
        });
        return {
          ...c,
          pendingCount,
          actualFailedCount: failedCount,
        };
      })
    );

    return NextResponse.json({
      campaigns: campaignsWithPending,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

// POST: Resume or retry a campaign
export async function POST(request: NextRequest) {
  try {
    const userScope = await getUserScope();
    if (!userScope) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allowedScopes = ['superadmin', 'national', 'region', 'university'];
    if (!allowedScopes.includes(userScope.scope)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { campaignId, action } = await request.json();

    if (!campaignId || !action) {
      return NextResponse.json({ error: 'campaignId and action are required' }, { status: 400 });
    }

    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (action === 'resume') {
      // Resume: process only PENDING recipients
      if (campaign.status !== 'PAUSED' && campaign.status !== 'FAILED') {
        return NextResponse.json({ error: 'Campaign can only be resumed when PAUSED or FAILED' }, { status: 400 });
      }

      processEmailCampaign(campaignId).catch((err) => {
        console.error('Resume campaign error:', err);
      });

      return NextResponse.json({ success: true, message: 'Campaign resumed' });
    }

    if (action === 'retry_failed') {
      // Reset FAILED recipients back to PENDING, then re-process
      const failedCount = await prisma.emailRecipientLog.count({
        where: { campaignId, status: 'FAILED' },
      });

      if (failedCount === 0) {
        return NextResponse.json({ error: 'No failed recipients to retry' }, { status: 400 });
      }

      await prisma.emailRecipientLog.updateMany({
        where: { campaignId, status: 'FAILED' },
        data: { status: 'PENDING', errorMessage: null },
      });

      // Reset campaign failed count and re-trigger
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { failedCount: 0, status: 'PENDING' },
      });

      processEmailCampaign(campaignId).catch((err) => {
        console.error('Retry failed campaign error:', err);
      });

      return NextResponse.json({ success: true, message: `Retrying ${failedCount} failed recipients` });
    }

    return NextResponse.json({ error: 'Invalid action. Use "resume" or "retry_failed"' }, { status: 400 });
  } catch (error) {
    console.error('Error handling campaign action:', error);
    return NextResponse.json({ error: 'Failed to perform campaign action' }, { status: 500 });
  }
}
