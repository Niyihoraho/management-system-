import nodemailer from 'nodemailer';
import path from 'path';

type SendEmailPayload = {
    to: string;
    subject: string;
    text: string;
    html?: string;
};

type RegistrationSubmittedEmailPayload = {
    to: string;
    fullName: string;
    registrationType: 'student' | 'graduate';
    selectedPillars?: string[];
    graduateGroupName?: string;
    noCellAvailable?: boolean;
    isMigration?: boolean;
    migrationFromUniversity?: string;
};

const PILLAR_LABELS: Record<string, string> = {
    mobilization_integration: 'Mobilization & Integration',
    capacity_building: 'Capacity Building',
    event_planning_management: 'Event Planning & Management',
    graduate_cell_management: 'Graduate Cell Management',
    social_cohesion_promotion: 'Social Cohesion Promotion',
    prayer_promotion: 'Prayer Promotion',
    database_management: 'Database Management',
};

const toPillarLabel = (value: string) => PILLAR_LABELS[value] || value;

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const getEmailTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f4f4f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #ffffff; border-bottom: 3px solid #0284c7;">
                           <img src="cid:gburlogo" alt="GBUR Logo" width="120" style="display: block; margin: 0 auto; max-width: 100%; height: auto; border: 0;" />
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin-top: 0; margin-bottom: 24px; color: #111827; font-size: 20px; font-weight: 700;">${title}</h2>
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
                            <h3 style="margin-top: 0; margin-bottom: 12px; color: #334155; font-size: 14px; font-weight: 600;">Groupe Biblique Universitaire du Rwanda (GBUR)</h3>
                            <p style="margin: 4px 0;"><strong>Head Office:</strong> Kigali, Rwanda | Gasabo District, Kacyiru | Cell: Kamutwa</p>
                            <p style="margin: 4px 0;"><strong>P.O Box:</strong> 1116 Kigali</p>
                            <div style="height: 12px;"></div>
                            <p style="margin: 4px 0;"><strong>Tel:</strong> +250 786 030 841</p>
                            <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:ugbroffice@gmail.com" style="color: #2563eb; text-decoration: none;">ugbroffice@gmail.com</a></p>
                            <p style="margin: 4px 0;"><strong>Website:</strong> <a href="http://www.gburwanda.com" style="color: #2563eb; text-decoration: none;">www.gburwanda.com</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const signatureText = `
---
Head Office
KIGALI/RWANDA
GASABO DISTRICT/KACYIRU
Cell: KAMUTWA
P.O Box: 1116 Kigali

T + (250) 786030841
Office e-mail: ugbroffice@gmail.com

Website: www.gburwanda.com
`;

export async function sendEmail(payload: SendEmailPayload): Promise<void> {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        console.info('[email] Skipped send: missing GMAIL_USER or GMAIL_APP_PASSWORD');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user,
            pass,
        },
    });

    const logoPath = path.join(process.cwd(), 'public', 'logo-r.png');

    try {
        await transporter.sendMail({
            from: `GBUR Head Office <${user}>`,
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
            attachments: [
                {
                    filename: 'logo-r.png',
                    path: logoPath,
                    cid: 'gburlogo'
                }
            ]
        });
    } catch (error) {
        console.error('Nodemailer send failed:', error);
        throw error;
    }
}

export async function sendRegistrationSubmittedEmail(payload: RegistrationSubmittedEmailPayload): Promise<void> {
    const safeName = payload.fullName?.trim() || 'Member';
    const safeHtmlName = escapeHtml(safeName);
    const selectedPillars = Array.isArray(payload.selectedPillars)
        ? payload.selectedPillars.map(toPillarLabel).filter(Boolean)
        : [];
    const selectedPillarText = selectedPillars.length > 0 ? selectedPillars.join(', ') : 'Not specified';
    const selectedPillarHtml = escapeHtml(selectedPillarText);

    const graduateGroupText = payload.graduateGroupName && payload.graduateGroupName.trim().length > 0
        ? payload.graduateGroupName.trim()
        : 'Not selected';
    const graduateGroupHtml = escapeHtml(graduateGroupText);

    const followUpText = payload.noCellAvailable
        ? 'You indicated that you did not find a graduate small group near you. Please keep in touch with us so we can help you connect.'
        : 'Please keep in touch with us so we can help you connect.';
    const followUpHtml = escapeHtml(followUpText);

    if (payload.registrationType === 'student') {
        const title = 'Welcome to the GBUR Family';
        const content = `
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px;">Hi <strong>${safeHtmlName}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px;">We are grateful to have you join us.</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px; line-height: 1.7;">You are now beginning a meaningful journey of fellowship, growth, and service together with other members as we grow together in fellowship with our Lord Jesus Christ.</p>
            <p style="margin-top: 32px; margin-bottom: 4px; font-size: 16px;">With love,</p>
            <p style="margin-top: 0; margin-bottom: 0; font-size: 16px; font-weight: 600; color: #2563eb;">GBUR Team</p>
        `;

        await sendEmail({
            to: payload.to,
            subject: title,
            text: `Hi ${safeName},\n\nWelcome to the GBUR family! We are grateful to have you join us.\n\nYou are now beginning a meaningful journey of fellowship, growth, and service together with other members as we grow together in fellowship with our Lord Jesus Christ.\n\nWith love,\nGBUR Team\n${signatureText}`,
            html: getEmailTemplate(title, content),
        });
        return;
    }

    const title = 'Thank You for Staying Connected';
    const migrationNote = payload.isMigration
        ? `You have successfully completed your migration from ${payload.migrationFromUniversity || 'your university'} to now graduate status in GBUR.`
        : null;
    const safeMigrationNoteHtml = migrationNote ? escapeHtml(migrationNote) : null;
    const content = `
        <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px;">Hi <strong>${safeHtmlName}</strong>,</p>
        <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px;">Thank you for your continued connection with GBUR.</p>
        ${safeMigrationNoteHtml ? `<p style="margin-top: 0; margin-bottom: 16px; font-size: 16px; line-height: 1.7;">${safeMigrationNoteHtml}</p>` : ''}
        <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px; line-height: 1.7;">Your commitment and support as a graduate are a real blessing to the GBUR family. Let us continue growing together in fellowship with our Lord Jesus Christ to impact our communities.</p>
        <p style="margin-top: 0; margin-bottom: 10px; font-size: 16px;"><strong>Selected Ministry Pillar:</strong> ${selectedPillarHtml}</p>
        <p style="margin-top: 0; margin-bottom: 10px; font-size: 16px;"><strong>Graduate Small Group:</strong> ${graduateGroupHtml}</p>
        <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #475569;">${followUpHtml}</p>
        <p style="margin-top: 0; margin-bottom: 16px; font-size: 16px;">We appreciate you and look forward to achieving great things together.</p>
        <p style="margin-top: 32px; margin-bottom: 4px; font-size: 16px;">With gratitude,</p>
        <p style="margin-top: 0; margin-bottom: 0; font-size: 16px; font-weight: 600; color: #2563eb;">GBUR Team</p>
    `;

    const migrationText = migrationNote ? `${migrationNote}\n\n` : '';

    await sendEmail({
        to: payload.to,
        subject: 'Thank You for Staying Connected with GBUR',
        text: `Hi ${safeName},\n\nThank you for your continued connection with GBUR.\n\n${migrationText}Your commitment and support as a graduate are a real blessing to the GBUR family. Let us continue growing together in fellowship with our Lord Jesus Christ to impact our communities.\n\nSelected Serving Pillar: ${selectedPillarText}\nGraduate Small Group: ${graduateGroupText}\n${followUpText}\n\nWe appreciate you and look forward to achieving great things together.\n\nWith gratitude,\nGBUR Team\n${signatureText}`,
        html: getEmailTemplate(title, content),
    });
}
