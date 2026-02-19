'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface JoinPageLayoutProps {
    children: ReactNode;
    invitation: any; // Using any for now to avoid complex Prisma type imports on client
}

export function JoinPageLayout({
    children,
    invitation,
}: JoinPageLayoutProps) {

    // Animation variants
    const staggeredContainer = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    } as const; // Added as const here

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 50 } as const
        }
    } as const; // Added as const here

    const creatorName = invitation.user?.name || 'Admin';
    const expirationDate = new Date(invitation.expiration);
    const isStudent = invitation.type === 'student';

    return (
        <div className="min-h-screen w-full bg-[#0b1121] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0b1121] to-[#0b1121] overflow-y-auto py-12 px-4 font-sans text-slate-900">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-[640px] mx-auto space-y-6"
            >
                {/* Context Card (Replaces the Left Panel) */}
                <div className="bg-[#ecf4fd] rounded-2xl shadow-2xl border-t-[8px] border-t-blue-600 p-8 sm:p-10 relative overflow-hidden ring-1 ring-white/10">
                    {/* Decorative top-right curve similar to some Google forms or nice paper effect */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full pointer-events-none" />

                    <div className="mb-8 flex flex-col items-start gap-5">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-auto flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/logo-r.png" alt="Logo" className="h-14 w-auto object-contain drop-shadow-sm" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-[#0b1121] tracking-tight leading-tight">Ministry System</h1>
                                <p className="text-sm text-slate-500 font-medium tracking-wide uppercase mt-0.5">Official Portal</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900">{isStudent ? 'Student Registration' : 'Graduate Registration'}</h2>
                            <p className="text-slate-600 mt-1">Please fill out the form below to complete your registration.</p>
                        </div>

                        <div className="h-px w-full bg-blue-200/50" />

                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">

                            <div className="flex items-center gap-2 bg-blue-100/50 px-3 py-1.5 rounded-full">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span>Due: <span className="font-semibold text-slate-800">{expirationDate.toLocaleDateString()}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Form Content */}
                {children}

                {/* Simple Footer */}
                <div className="text-center space-y-2 py-6">
                    <p className="text-slate-500 text-xs">Secured by Ministry System • v1.0</p>
                </div>

            </motion.div>
        </div>
    );
}
