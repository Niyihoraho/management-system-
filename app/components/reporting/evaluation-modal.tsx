"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { EvaluationRow } from "@/components/reporting/evaluation-row";
import { useToast } from "@/components/ui/use-toast";

type ConfigData = {
    id: number;
    name: string;
    questions: { id: number; statement: string }[];
};

type EvaluationReport = {
    id: number;
    priority: { name: string } | null;
    priorityId?: number | null;
    // ... other fields
};

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: EvaluationReport | null;
    config: ConfigData | undefined;
    onSuccess: () => void;
}

export function EvaluationModal({ isOpen, onClose, report, config, onSuccess }: EvaluationModalProps) {
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [evaluations, setEvaluations] = useState<Record<number, string>>({});

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setEvaluations({});
        }
    }, [isOpen, report]);

    if (!report || !config || !report.priority) return null;

    const handleSubmit = async () => {
        // Validation: ensure at least one question is answered? Or all?
        // Let's enforce answering at least one if available.
        if (Object.keys(evaluations).length === 0 && config.questions.length > 0) {
            toast({ title: "Please answer at least one question", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                evaluations: Object.entries(evaluations).map(([qid, rating]) => ({
                    questionId: parseInt(qid),
                    rating
                }))
            };

            const res = await fetch(`/api/reports/${report.id}/evaluate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Submission failed");

            toast({ title: "Evaluation Saved Successfully" });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to save evaluation", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Evaluate Impact: {report.priority.name}</DialogTitle>
                    <DialogDescription>
                        Based on the reported activities, please evaluate the maturity level for each area below.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {config.questions.length === 0 ? (
                        <p className="text-center text-muted-foreground">No evaluation questions available for this priority.</p>
                    ) : (
                        <div className="space-y-1">
                            {config.questions.map(q => (
                                <EvaluationRow
                                    key={q.id}
                                    questionId={q.id}
                                    statement={q.statement}
                                    value={evaluations[q.id] as any}
                                    onChange={(val) => setEvaluations(prev => ({ ...prev, [q.id]: val }))}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting || config.questions.length === 0}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Evaluation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
