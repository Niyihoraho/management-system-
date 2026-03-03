'use client';

import { CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ReportSuccessModalProps {
    title: string;
    message: string;
    buttonText?: string;
    onButtonClick: () => void;
}

export function ReportSuccessModal({
    title,
    message,
    buttonText = "OK, I Understand",
    onButtonClick
}: ReportSuccessModalProps) {
    return (
        <div className="flex flex-col items-center justify-center space-y-6 py-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{title}</h2>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {message}
                </p>
            </div>
            <Button
                onClick={onButtonClick}
                className="w-full max-w-xs bg-green-600 hover:bg-green-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-green-900/20 transition-all active:scale-[0.98]"
            >
                {buttonText}
            </Button>
        </div>
    );

}
