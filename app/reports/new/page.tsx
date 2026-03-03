"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ActivityRow } from "@/components/reporting/activity-row";
import { Plus, Save, Loader2, ArrowLeft } from "lucide-react";
import { ReportSuccessModal } from "@/app/components/reporting/report-success-modal";

type ConfigData = {
    id: number;
    name: string;
    categories: {
        id: number;
        name: string;
        templates: { id: number; name: string }[];
    }[];
    questions: { id: number; statement: string }[];
};

type ActivityLog = {
    tempId: string;
    categoryId: string;
    activityName: string;
    beneficiaries: string;
    participantCount: string;
    dateOccurred: string;
    facilitators: string;
    followUpPractice: string;
    impactSummary: string;
    imageUrl: string;
    imageUrlSecondary: string;
    isCustom?: boolean;
};

function ReportingWizardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pillarId = searchParams.get("pillarId");
    const { toast } = useToast();

    const [loadingConfig, setLoadingConfig] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [pillar, setPillar] = useState<ConfigData | null>(null);

    // Form State
    const [activities, setActivities] = useState<ActivityLog[]>([]);

    useEffect(() => {
        if (!pillarId) {
            toast({ title: "No Pillar Selected", variant: "destructive" });
            router.push("/reports");
            return;
        }

        const loadPillar = async () => {
            try {
                const res = await fetch("/api/reporting/config");
                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    console.error("[page] API error response:", errBody);
                    throw new Error("Failed to fetch configuration");
                }

                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("Invalid configuration data");

                const found = data.find((p: ConfigData) => p.id === parseInt(pillarId));
                if (found) {
                    setPillar(found);
                    setActivities([{
                        tempId: crypto.randomUUID(),
                        categoryId: "",
                        activityName: "",
                        beneficiaries: "",
                        participantCount: "",
                        dateOccurred: new Date().toISOString().split('T')[0],
                        facilitators: "",
                        followUpPractice: "",
                        impactSummary: "",
                        imageUrl: "",
                        imageUrlSecondary: "",
                        isCustom: false
                    }]);
                } else {
                    toast({ title: "Pillar Not Found", variant: "destructive" });
                    router.push("/reports");
                }
            } catch (e) {
                console.error(e);
                toast({ title: "Error loading configuration", description: "Please check your connection and try again.", variant: "destructive" });
            } finally {
                setLoadingConfig(false);
            }
        };
        loadPillar();
    }, [pillarId, router, toast]);

    const addActivityRow = () => {
        setActivities([...activities, {
            tempId: crypto.randomUUID(),
            categoryId: "",
            activityName: "",
            beneficiaries: "",
            participantCount: "",
            dateOccurred: new Date().toISOString().split('T')[0],
            facilitators: "",
            followUpPractice: "",
            impactSummary: "",
            imageUrl: "",
            imageUrlSecondary: "",
            isCustom: false
        }]);
    };

    const removeActivityRow = (tempId: string) => {
        if (activities.length === 1) return;
        setActivities(activities.filter(a => a.tempId !== tempId));
    };

    const updateActivity = (tempId: string, updates: Partial<ActivityLog>) => {
        setActivities(prev => prev.map(a => a.tempId === tempId ? { ...a, ...updates } : a));
    };

    const handleSubmit = async () => {
        if (!pillar) return;

        const invalid = activities.some(a => !a.categoryId || !a.activityName || !a.participantCount);
        const missingImages = activities.some(a => !a.imageUrl || !a.imageUrlSecondary);
        if (invalid) {
            toast({ title: "Please fill required fields in all activity rows", variant: "destructive" });
            return;
        }
        if (missingImages) {
            toast({ title: "Please upload two evidence photos for every activity", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                priorityId: pillar.id,
                regionId: null,
                activities: activities.map(a => ({
                    ...a,
                    participantCount: parseInt(a.participantCount)
                })),
                evaluations: []
            };

            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Submission failed");

            setSubmitted(true);
            toast({ title: "Report Submitted Successfully!" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error submitting report", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingConfig) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!pillar) return null;

    if (submitted) {
        return (
            <div className="container mx-auto py-24 max-w-2xl px-4">
                <Card className="rounded-2xl shadow-2xl border-border p-6 sm:p-10 bg-card">
                    <ReportSuccessModal
                        title="Report Submitted!"
                        message={`Your strategic report for "${pillar.name}" has been successfully received. The administration will review your activities and evaluation shortly.`}
                        buttonText="Return to Reports"
                        onButtonClick={() => router.push("/reports")}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">New Report: {pillar.name}</h1>
                    <p className="text-muted-foreground">Fill in activities and evaluation for this pillar.</p>
                </div>
            </div>

            <section className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">1. Activity Logs</h2>
                    <Button onClick={addActivityRow} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Another Activity
                    </Button>
                </div>

                <div className="space-y-6">
                    {activities.map((activity, index) => (
                        <ActivityRow
                            key={activity.tempId}
                            index={index}
                            activity={activity}
                            config={pillar}
                            onUpdate={(updates) => updateActivity(activity.tempId, updates)}
                            onRemove={() => removeActivityRow(activity.tempId)}
                            showRemove={activities.length > 1}
                        />
                    ))}
                </div>
            </section>

            <div className="flex justify-end gap-4 py-8">
                <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Submit Report
                </Button>
            </div>
        </div>
    );
}

export default function ReportingWizard() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <ReportingWizardContent />
        </Suspense>
    );
}
