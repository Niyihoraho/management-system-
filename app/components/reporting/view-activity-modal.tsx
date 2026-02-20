"use client";

import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";
import {
    Activity,
    LayoutDashboard,
    Users,
    User,
    Camera,
    Calendar,
    FileText,
    Pencil,
    Trash2,
    Check,
    X,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ActivityData {
    id: number;
    reportId: number;
    categoryName: string | null;
    activityName: string;
    beneficiaries: string;
    participantCount: number;
    dateOccurred: string | null;
    facilitators: string;
    followUpPractice: string;
    impactSummary: string;
    imageUrl: string;
    user: { name: string | null; email: string | null };
    reportCreatedAt: string;
}

interface ViewActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    activity: ActivityData | null;
    onUpdated?: () => void;
    onDeleted?: () => void;
}

const mapActivityToForm = (activity: ActivityData | null) => ({
    activityName: activity?.activityName || "",
    participants: activity?.participantCount?.toString() || "0",
    dateOccurred: activity?.dateOccurred ? activity.dateOccurred.split("T")[0] : "",
    facilitators: activity?.facilitators || "",
    beneficiaries: activity?.beneficiaries || "",
    impactSummary: activity?.impactSummary || "",
    followUpPractice: activity?.followUpPractice || "",
    imageUrl: activity?.imageUrl || "",
});

export function ViewActivityModal({ isOpen, onClose, activity, onUpdated, onDeleted }: ViewActivityModalProps) {
    const { toast } = useToast();
    const [localActivity, setLocalActivity] = useState<ActivityData | null>(activity);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formState, setFormState] = useState(mapActivityToForm(activity));
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    useEffect(() => {
        setLocalActivity(activity);
        setFormState(mapActivityToForm(activity));
        setIsEditing(false);
        setSaving(false);
        setDeleting(false);
        setConfirmDeleteOpen(false);
    }, [activity, isOpen]);

    const handleFieldChange = (field: keyof typeof formState, value: string) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!localActivity) return;
        setSaving(true);
        try {
            const payload = {
                activityName: formState.activityName,
                participantCount: Number(formState.participants) || 0,
                dateOccurred: formState.dateOccurred ? new Date(formState.dateOccurred).toISOString() : null,
                facilitators: formState.facilitators,
                beneficiaries: formState.beneficiaries,
                impactSummary: formState.impactSummary,
                followUpPractice: formState.followUpPractice,
                imageUrl: formState.imageUrl,
            };

            const res = await fetch(`/api/activities/${localActivity.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.error || "Failed to save changes");
            }

            const updated = await res.json();
            setLocalActivity(updated);
            setFormState(mapActivityToForm(updated));
            setIsEditing(false);
            toast({ title: "Activity updated" });
            onUpdated?.();
        } catch (error) {
            console.error(error);
            toast({
                title: "Unable to save",
                description: error instanceof Error ? error.message : "Unexpected error",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!localActivity) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/activities/${localActivity.id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.error || "Failed to delete activity");
            }
            toast({ title: "Activity deleted" });
            onDeleted?.();
            onClose();
        } catch (error) {
            console.error(error);
            toast({
                title: "Unable to delete",
                description: error instanceof Error ? error.message : "Unexpected error",
                variant: "destructive",
            });
        } finally {
            setDeleting(false);
            setConfirmDeleteOpen(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFormState(mapActivityToForm(localActivity));
    };

    if (!localActivity) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
                <SheetHeader className="sticky top-0 bg-background z-10 pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <SheetTitle className="flex items-center gap-2 text-xl">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Activity className="h-5 w-5 text-primary" />
                                </div>
                                Activity Details
                            </SheetTitle>
                            <SheetDescription>
                                Submitted by {localActivity.user.name || localActivity.user.email || "Unknown"} on{" "}
                                {format(new Date(localActivity.reportCreatedAt), "PPP")}
                            </SheetDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <Button variant="ghost" size="icon" onClick={handleCancelEdit} disabled={saving}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button variant="default" size="icon" onClick={handleSave} disabled={saving}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Removing this activity will also remove it from exports. If it was the last
                                                    activity for its category, that category (and pillar grouping) will no longer
                                                    appear in reports until new data is submitted.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction asChild>
                                                    <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                                                        {deleting ? "Deleting..." : "Delete"}
                                                    </Button>
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    <Card className="shadow-md">
                        <CardHeader className="pb-4 border-b">
                            <div className="flex items-center gap-2">
                                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                                {isEditing ? (
                                    <Input
                                        value={formState.activityName}
                                        onChange={(e) => handleFieldChange("activityName", e.target.value)}
                                        placeholder="Activity name"
                                    />
                                ) : (
                                    <h3 className="font-semibold text-lg">{localActivity.activityName}</h3>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground pl-6">
                                Category: <span className="font-medium text-foreground">{localActivity.categoryName || "N/A"}</span>
                            </p>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">

                            {/* Date Occurred */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Calendar className="h-4 w-4" /> Date Occurred
                                </div>
                                {isEditing ? (
                                    <Input
                                        type="date"
                                        value={formState.dateOccurred}
                                        onChange={(e) => handleFieldChange("dateOccurred", e.target.value)}
                                        className="pl-6"
                                    />
                                ) : (
                                    <div className="text-sm font-medium pl-6">
                                        {localActivity.dateOccurred ? format(new Date(localActivity.dateOccurred), "PPP") : "N/A"}
                                    </div>
                                )}
                            </div>

                            {/* Total Participants */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Users className="h-4 w-4" /> Total Participants
                                </div>
                                {isEditing ? (
                                    <Input
                                        type="number"
                                        min={0}
                                        value={formState.participants}
                                        onChange={(e) => handleFieldChange("participants", e.target.value)}
                                        className="pl-6"
                                    />
                                ) : (
                                    <div className="text-sm font-medium pl-6">
                                        {localActivity.participantCount?.toLocaleString() || "0"}
                                    </div>
                                )}
                            </div>

                            {/* Facilitators */}
                            <div className="space-y-1 sm:col-span-2 border-t pt-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <User className="h-4 w-4" /> Facilitators
                                </div>
                                {isEditing ? (
                                    <Textarea
                                        value={formState.facilitators}
                                        onChange={(e) => handleFieldChange("facilitators", e.target.value)}
                                        className="pl-6"
                                    />
                                ) : (
                                    <div className="text-sm font-medium pl-6 mt-1 whitespace-pre-wrap">
                                        {localActivity.facilitators || "None recorded"}
                                    </div>
                                )}
                            </div>

                            {/* Beneficiaries */}
                            <div className="space-y-1 sm:col-span-2 border-t pt-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Users className="h-4 w-4" /> Beneficiaries
                                </div>
                                {isEditing ? (
                                    <Textarea
                                        value={formState.beneficiaries}
                                        onChange={(e) => handleFieldChange("beneficiaries", e.target.value)}
                                        className="pl-6"
                                    />
                                ) : (
                                    <div className="text-sm font-medium pl-6 mt-1 whitespace-pre-wrap">
                                        {localActivity.beneficiaries || "None recorded"}
                                    </div>
                                )}
                            </div>

                            {/* Impact Summary */}
                            <div className="space-y-1 sm:col-span-2 border-t pt-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <FileText className="h-4 w-4" /> Impact Summary
                                </div>
                                {isEditing ? (
                                    <Textarea
                                        value={formState.impactSummary}
                                        onChange={(e) => handleFieldChange("impactSummary", e.target.value)}
                                        className="pl-6"
                                    />
                                ) : (
                                    <div className="text-sm font-medium pl-6 mt-1 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                                        {localActivity.impactSummary || "No summary provided."}
                                    </div>
                                )}
                            </div>

                            {/* Follow-up / Practice */}
                            <div className="space-y-1 sm:col-span-2 border-t pt-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <FileText className="h-4 w-4" /> Follow-up Action / Practice
                                </div>
                                {isEditing ? (
                                    <Textarea
                                        value={formState.followUpPractice}
                                        onChange={(e) => handleFieldChange("followUpPractice", e.target.value)}
                                        className="pl-6"
                                    />
                                ) : (
                                    <div className="text-sm font-medium pl-6 mt-1 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                                        {localActivity.followUpPractice || "No follow-up actions logged."}
                                    </div>
                                )}
                            </div>

                            {/* Image Evidence */}
                            <div className="space-y-3 sm:col-span-2 border-t pt-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Camera className="h-4 w-4" /> Activity Evidence
                                </div>
                                {isEditing && (
                                    <Input
                                        value={formState.imageUrl}
                                        onChange={(e) => handleFieldChange("imageUrl", e.target.value)}
                                        placeholder="Image URL"
                                        className="pl-6"
                                    />
                                )}
                                {localActivity.imageUrl?.trim() ? (
                                    <div className="pl-6">
                                        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted border">
                                            <Image
                                                src={localActivity.imageUrl}
                                                alt="Activity Evidence"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                ) : !isEditing ? (
                                    <p className="pl-6 text-sm text-muted-foreground">No evidence uploaded.</p>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </SheetContent>
        </Sheet>
    );
}
