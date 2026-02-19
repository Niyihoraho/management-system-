"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FinancialDetails {
    supportStatus?: "want_to_support" | "already_supporting" | "later" | null;
    supportFrequency?: "monthly" | "half_year" | "full_year" | null;
    supportAmount?: string | null;
    enableReminder?: boolean;
}

interface Graduate {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
    financialSupport: boolean;
    supportStatus?: string | null;
    supportFrequency?: string | null;
    supportAmount?: string | null;
    enableReminder?: boolean;
}

interface FinancialDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    graduate: Graduate | null;
    onUpdate: (graduateId: number, details: FinancialDetails) => Promise<void>;
}

const supportStatusLabels = {
    want_to_support: "🌟 Want to Support",
    already_supporting: "🙏 Already Supporting",
    later: "⏰ Later"
};

const supportFrequencyLabels = {
    monthly: "📅 Monthly",
    half_year: "📆 Half Year",
    full_year: "🗓️ Full Year"
};

export function FinancialDetailsModal({
    isOpen,
    onClose,
    graduate,
    onUpdate,
}: FinancialDetailsModalProps) {
    const [loading, setLoading] = useState(false);
    const [supportStatus, setSupportStatus] = useState<string | null>(null);
    const [supportFrequency, setSupportFrequency] = useState<string | null>(null);
    const [supportAmount, setSupportAmount] = useState<string>("");
    const [enableReminder, setEnableReminder] = useState<boolean>(false);

    useEffect(() => {
        if (graduate && isOpen) {
            setSupportStatus(graduate.supportStatus || null);
            setSupportFrequency(graduate.supportFrequency || null);
            setSupportAmount(graduate.supportAmount || "");
            setEnableReminder(graduate.enableReminder || false);
        }
    }, [graduate, isOpen]);

    const handleUpdate = async () => {
        if (!graduate) return;

        setLoading(true);
        try {
            await onUpdate(graduate.id, {
                supportStatus: supportStatus as any,
                supportFrequency: supportFrequency as any,
                supportAmount: supportAmount || null,
                enableReminder,
            });
            onClose();
        } catch (error) {
            console.error("Failed to update financial details", error);
        } finally {
            setLoading(false);
        }
    };

    if (!graduate) return null;

    const showFrequencyAndAmount = supportStatus === "want_to_support" || supportStatus === "already_supporting";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Financial Support Details
                    </DialogTitle>
                    <DialogDescription>
                        View and update financial support information for <strong>{graduate.fullName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Member Info */}
                    <div className="bg-muted/30 p-4 rounded-lg border border-border/20">
                        <h4 className="font-semibold text-sm mb-2">Member Information</h4>
                        <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">Name:</span> <span className="font-medium">{graduate.fullName}</span></p>
                            {graduate.email && <p><span className="text-muted-foreground">Email:</span> {graduate.email}</p>}
                            {graduate.phone && <p><span className="text-muted-foreground">Phone:</span> {graduate.phone}</p>}
                        </div>
                    </div>

                    {/* Support Status */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Support Status</Label>
                        <Select
                            value={supportStatus || "none"}
                            onValueChange={(val) => setSupportStatus(val === "none" ? null : val)}
                        >
                            <SelectTrigger className="bg-muted/30">
                                <SelectValue placeholder="Select support status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Not Set</SelectItem>
                                <SelectItem value="want_to_support">🌟 Want to Support</SelectItem>
                                <SelectItem value="already_supporting">🙏 Already Supporting</SelectItem>
                                <SelectItem value="later">⏰ Do it Later</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Frequency and Amount (conditional) */}
                    {showFrequencyAndAmount && (
                        <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-200/50 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold">Support Frequency</Label>
                                <Select
                                    value={supportFrequency || "none"}
                                    onValueChange={(val) => setSupportFrequency(val === "none" ? null : val)}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Select frequency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Not Set</SelectItem>
                                        <SelectItem value="monthly">📅 Monthly</SelectItem>
                                        <SelectItem value="half_year">📆 Half Year (Every 6 months)</SelectItem>
                                        <SelectItem value="full_year">🗓️ Full Year (Annually)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold">Support Amount (RWF)</Label>
                                <Input
                                    type="number"
                                    value={supportAmount}
                                    onChange={(e) => setSupportAmount(e.target.value)}
                                    placeholder="e.g. 10000"
                                    className="bg-white"
                                />
                            </div>

                            {/* Reminder Checkbox */}
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-amber-200">
                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="enableReminder"
                                        checked={enableReminder}
                                        onCheckedChange={(c) => setEnableReminder(c as boolean)}
                                        className="mt-1 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="enableReminder" className="font-medium text-sm cursor-pointer flex items-center gap-2">
                                            <span>💌 Send friendly reminders</span>
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            We'll send gentle, caring reminders about their support commitment 🤗💖
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Status Badge */}
                    {supportStatus && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Current Status:</span>
                            <Badge variant="secondary" className={
                                supportStatus === "already_supporting" ? "bg-green-100 text-green-800" :
                                    supportStatus === "want_to_support" ? "bg-blue-100 text-blue-800" :
                                        "bg-gray-100 text-gray-800"
                            }>
                                {supportStatusLabels[supportStatus as keyof typeof supportStatusLabels] || supportStatus}
                            </Badge>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpdate} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
