'use client';

import { useState } from 'react';
import { JoinPageLayout } from '@/components/public/join-page-layout';
import { SuccessView } from '@/components/public/success-view';
import { StudentRegistrationForm } from '@/components/public/student-registration-form';
import { GraduateRegistrationForm } from '@/components/public/graduate-registration-form';

interface JoinContentProps {
    invitation: any; // Type strictly if possible, or infer from usage
    universities: { id: number; name: string }[];
    creator: {
        name: string | null;
        email: string | null;
        image: string | null;
    } | null;
}

export function JoinContent({ invitation, universities, creator }: JoinContentProps) {
    const [success, setSuccess] = useState(false);

    return (
        <JoinPageLayout invitation={invitation}>
            {success ? (
                <SuccessView
                    title="Registration Successful!"
                    message="Your details have been securely submitted to the ministry database. We will review your application shortly."
                    onReset={invitation.allowMultiple ? () => setSuccess(false) : undefined}
                />
            ) : (
                invitation.type === 'student' ? (
                    <StudentRegistrationForm
                        invitationId={invitation.id}
                        universities={universities}
                        onSuccess={() => setSuccess(true)}
                    />
                ) : (
                    <GraduateRegistrationForm
                        invitationId={invitation.id}
                        onSuccess={() => setSuccess(true)}
                    />
                )
            )}
        </JoinPageLayout>
    );
}
