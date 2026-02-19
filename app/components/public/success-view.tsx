'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Check, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface SuccessViewProps {
    onReset?: () => void;
    title?: string;
    message?: string;
}

export function SuccessView({
    onReset,
    title = "Submission Received!",
    message = "Thank you for completing the registration. Your details have been securely submitted for review."
}: SuccessViewProps) {
    useEffect(() => {
        // Trigger confetti
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            // multiple origins
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full text-center p-8 bg-[#ecf4fd] rounded-xl border border-blue-100 shadow-sm">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm"
            >
                <Check className="w-10 h-10 text-green-600 stroke-[3]" />
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-slate-800 mb-3"
            >
                {title}
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-slate-600 text-lg max-w-md mb-8 leading-relaxed mx-auto"
            >
                {message}
            </motion.p>

            {onReset && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Button
                        onClick={onReset}
                        size="lg"
                        className="rounded-lg px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                    >
                        Submit Another
                        <RefreshCw className="ml-2 w-4 h-4" />
                    </Button>
                </motion.div>
            )}
        </div>
    );
}
