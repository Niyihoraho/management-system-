import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
    try {
        const cloudinaryUrl = process.env.CLOUDINARY_URL;
        if (!cloudinaryUrl) {
            return NextResponse.json({ error: 'Missing Cloudinary config' }, { status: 500 });
        }

        // Parse cloudinary://key:secret@cloud_name
        const matches = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
        if (!matches) {
            return NextResponse.json({ error: 'Invalid Cloudinary URL format' }, { status: 500 });
        }

        const [, apiKey, apiSecret, cloudName] = matches;

        const timestamp = Math.round((new Date()).getTime() / 1000);

        // For a basic signed upload, we sign "timestamp=..." plus the secret
        const paramsToSign = `timestamp=${timestamp}`;
        const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

        return NextResponse.json({
            signature,
            timestamp,
            apiKey,
            cloudName
        });
    } catch (error) {
        console.error("Signing error:", error);
        return NextResponse.json({ error: 'Signing failed' }, { status: 500 });
    }
}
