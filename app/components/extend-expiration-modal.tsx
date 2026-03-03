'use client';

import { useState } from 'react';
import axios from 'axios';
import { CalendarPlus, Loader2, Clock } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ExtendExpirationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    linkId: string;
    linkSlug: string;
    currentExpiration: string;
}

export function ExtendExpirationModal({
    isOpen,
    onClose,
    onUpdated,
    linkId,
    linkSlug,
    currentExpiration,
}: ExtendExpirationModalProps) {
    const [loading, setLoading] = useState(false);
    const [newExpiration, setNewExpiration] = useState('');

    const currentDate = new Date(currentExpiration);
    const isExpired = currentDate < new Date();

    const presetOptions = [
        { label: '+7 days', days: 7 },
        { label: '+14 days', days: 14 },
        { label: '+30 days', days: 30 },
        { label: '+90 days', days: 90 },
    ];

    const applyPreset = (days: number) => {
        // Always extend from now (not from past expired date)
        const baseDate = isExpired ? new Date() : currentDate;
        const extended = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
        // Format to datetime-local compatible string
        const formatted = extended.toISOString().slice(0, 16);
        setNewExpiration(formatted);
    };

    const handleSubmit = async () => {
        if (!newExpiration) {
            toast.error("Please select a new expiration date");
            return;
        }

        const newDate = new Date(newExpiration);
        if (newDate <= new Date()) {
            toast.error("New expiration must be in the future");
            return;
        }

        setLoading(true);
        try {
            await axios.patch('/api/invitations', {
                id: linkId,
                expiration: newDate.toISOString(),
            });
            toast.success("Expiration date updated successfully");
            onUpdated();
            onClose();
            setNewExpiration('');
        } catch (error: any) {
            console.error('Error extending expiration:', error);
            toast.error(error.response?.data || "Failed to update expiration");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarPlus className="h-5 w-5 text-blue-600" />
                        Extend Expiration
                    </DialogTitle>
                    <DialogDescription>
                        Update the expiration date for <strong>/join/{linkSlug}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Current expiration info */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${isExpired
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-green-50 border-green-200 text-green-700'
                        }`}>
                        <Clock className="h-4 w-4 shrink-0" />
                        <div className="text-sm">
                            <span className="font-medium">
                                {isExpired ? 'Expired' : 'Current expiration'}:
                            </span>{' '}
                            {currentDate.toLocaleDateString()} at {currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {/* Quick extend presets */}
                    <div className="space-y-2">
                        <Label>Quick extend</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {presetOptions.map(({ label, days }) => (
                                <Button
                                    key={days}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => applyPreset(days)}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {isExpired
                                ? 'Extends from now since the link has expired.'
                                : 'Extends from the current expiration date.'}
                        </p>
                    </div>

                    {/* Custom date picker */}
                    <div className="space-y-2">
                        <Label htmlFor="new-expiration">Or pick a specific date</Label>
                        <Input
                            id="new-expiration"
                            type="datetime-local"
                            value={newExpiration}
                            onChange={(e) => setNewExpiration(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                        />
                    </div>

                    {/* Preview */}
                    {newExpiration && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800 animate-in fade-in slide-in-from-top-1">
                            <span className="font-medium">New expiration:</span>{' '}
                            {new Date(newExpiration).toLocaleDateString()} at{' '}
                            {new Date(newExpiration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !newExpiration}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Expiration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
