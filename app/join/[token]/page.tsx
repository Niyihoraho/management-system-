import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AlertCircle } from 'lucide-react';
import { JoinContent } from './join-content';

interface JoinPageProps {
    params: {
        token: string;
    };
}

// Disable caching for this page to ensure expiration checks are real-time
export const dynamic = 'force-dynamic';

export default async function JoinPage({ params }: JoinPageProps) {
    const { token } = await params;

    if (!token) return notFound();

    // Fetch invitation with creator details
    const invitationRecord = await prisma.invitationlink.findUnique({
        where: { slug: token },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    image: true,
                }
            },
            university: {
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            }
        }
    });

    // Check if valid
    if (!invitationRecord || !invitationRecord.isActive) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center border border-red-100">
                    <div className="mx-auto h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
                    <p className="text-gray-600">
                        This invitation link is not valid. Please contact your ministry leader for a new link.
                    </p>
                </div>
            </div>
        );
    }

    const invitation = {
        ...invitationRecord,
        universities: invitationRecord.university,
    };

    // Check expiration
    if (new Date(invitation.expiration) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm text-center border border-orange-100">
                    <div className="mx-auto h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Invitation Expired</h1>
                    <p className="text-gray-600">
                        This registration link has expired on {new Date(invitation.expiration).toLocaleDateString()}.
                    </p>
                </div>
            </div>
        );
    }

    // Fetch universities if student
    let universities: { id: number; name: string }[] = [];
    if (invitation.type === 'student') {
        if (invitation.universities && invitation.universities.length > 0) {
            universities = invitation.universities;
        } else if (invitation.regionId) {
            universities = await prisma.university.findMany({
                where: { regionId: invitation.regionId },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            });
        } else {
            universities = await prisma.university.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            });
        }
    }

    return (
        <JoinContent
            invitation={invitation}
            universities={universities}
            creator={invitation.user}
        />
    );
}
