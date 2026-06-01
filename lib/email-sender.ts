import nodemailer from 'nodemailer';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getEmailTemplate, signatureText } from './email';

type Attachment = {
  filename: string;
  content: string; // Base64 encoded string
  contentType?: string;
};

export async function getSentCountInLast24Hours(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const count = await prisma.emailRecipientLog.count({
      where: {
        status: 'SENT',
        sentAt: {
          gte: oneDayAgo,
        },
      },
    });
    return count;
  } catch (error) {
    console.error('Error fetching sent count in last 24h:', error);
    return 0;
  }
}

export async function sendCampaignEmail(
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: Attachment[]
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are missing in environment variables.');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  const logoPath = path.join(process.cwd(), 'public', 'logo-r.png');
  const fullHtml = getEmailTemplate(subject, htmlBody);
  const plainText = `${subject}\n\n${htmlBody.replace(/<[^>]*>/g, '')}\n\n${signatureText}`;

  // Format attachments for Nodemailer
  const mailAttachments = [
    {
      filename: 'logo-r.png',
      path: logoPath,
      cid: 'gburlogo',
    },
    ...(attachments?.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64'),
      contentType: att.contentType,
    })) || []),
  ];

  await transporter.sendMail({
    from: `GBUR Head Office <${user}>`,
    to,
    subject,
    text: plainText,
    html: fullHtml,
    attachments: mailAttachments,
  });
}
