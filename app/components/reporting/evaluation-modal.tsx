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
import { ReportSuccessModal } from "@/app/components/reporting/report-success-modal";

type ConfigData = {
    id: number;
    name: string;
    questions: { id: number; statement: string }[];
};

type EvaluationReport = {
    id: number;
    priority: { name: string } | null;
    priorityId?: number | null;
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
    const [submitted, setSubmitted] = useState(false);
    const [evaluations, setEvaluations] = useState<Record<number, string>>({});

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setEvaluations({});
            setSubmitted(false);
        }
    }, [isOpen, report]);

    if (!report || !config || !report.priority) return null;

    const handleSubmit = async () => {
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

            setSubmitted(true);
            toast({ title: "Evaluation Saved Successfully" });
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to save evaluation", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl border-border shadow-2xl scrollbar-thin">
                {submitted ? (
                    <ReportSuccessModal
                        title="Evaluation Complete!"
                        message={`The impact evaluation for "${report.priority.name}" has been recorded successfully. These results will be reflected in the final consolidated report.`}
                        buttonText="Close"
                        onButtonClick={onClose}
                    />
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-foreground">
                                Evaluate Impact: {report.priority.name}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Based on the reported activities, please evaluate the maturity level for each area below.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6 space-y-6">
                            {config.questions.length === 0 ? (
                                <p className="text-center py-12 text-muted-foreground/60">
                                    No evaluation questions available for this priority.
                                </p>
                            ) : (
                                <div className="space-y-2">
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

                        <DialogFooter className="border-t pt-6 mt-2 border-border">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                disabled={submitting}
                                className="text-muted-foreground hover:bg-accent/10"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || config.questions.length === 0}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 rounded-xl h-12 shadow-lg shadow-background/20 font-semibold"
                            >
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save & Finish Evaluation
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
