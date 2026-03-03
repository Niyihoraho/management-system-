import { useMemo, useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowRightLeft } from "lucide-react";

interface Student {
    id: number;
    fullName: string;
    universityId: number;
    university: { name: string };
}

interface Region {
    id: number;
    name: string;
}

interface University {
    id: number;
    name: string;
    regionId: number;
}

interface MigrateCampusStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    regions: Region[];
    universities: University[];
    onSubmit: (data: {
        studentId: number;
        destinationRegionId: number;
        destinationUniversityId: number;
    }) => Promise<void>;
}

export function MigrateCampusStudentModal({
    isOpen,
    onClose,
    student,
    regions,
    universities,
    onSubmit,
}: MigrateCampusStudentModalProps) {
    const [destinationRegionId, setDestinationRegionId] = useState<string>("");
    const [destinationUniversityId, setDestinationUniversityId] = useState<string>("");
    const [submitting, setSubmitting] = useState(false);

    const regionUniversities = useMemo(() => {
        if (!destinationRegionId) return [];
        return universities
            .filter((university) => String(university.regionId) === destinationRegionId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [destinationRegionId, universities]);

    const handleClose = () => {
        if (submitting) return;
        setDestinationRegionId("");
        setDestinationUniversityId("");
        onClose();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!student || !destinationRegionId || !destinationUniversityId) return;

        setSubmitting(true);
        try {
            await onSubmit({
                studentId: student.id,
                destinationRegionId: Number(destinationRegionId),
                destinationUniversityId: Number(destinationUniversityId),
            });
            handleClose();
        } finally {
            setSubmitting(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100">
                            <ArrowRightLeft className="h-4 w-4 text-sky-700" />
                        </div>
                        <DialogTitle>Migrate Campus to Campus</DialogTitle>
                    </div>
                    <DialogDescription>
                        Move <strong>{student.fullName}</strong> to another campus for destination approval.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                        <p>
                            <span className="text-muted-foreground">Current Campus:</span>{" "}
                            <strong>{student.university?.name || "N/A"}</strong>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Destination Region</Label>
                        <Select
                            value={destinationRegionId}
                            onValueChange={(value) => {
                                setDestinationRegionId(value);
                                setDestinationUniversityId("");
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select destination region" />
                            </SelectTrigger>
                            <SelectContent>
                                {regions.map((region) => (
                                    <SelectItem key={region.id} value={String(region.id)}>
                                        {region.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Destination University</Label>
                        <Select
                            value={destinationUniversityId}
                            disabled={!destinationRegionId}
                            onValueChange={setDestinationUniversityId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select destination university" />
                            </SelectTrigger>
                            <SelectContent>
                                {regionUniversities.map((university) => (
                                    <SelectItem key={university.id} value={String(university.id)}>
                                        {university.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting || !destinationRegionId || !destinationUniversityId}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit for Destination Approval"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
