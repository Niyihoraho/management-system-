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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SmallGroup {
    id: number;
    name: string;
}

interface AssignGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: number | null;
    currentGroupId: string | null;
    smallGroups: { id: number; name: string }[];
    onAssign: (entityId: number, groupId: string | null) => Promise<void>;
    title?: string;
}

export function AssignGroupModal({
    isOpen,
    onClose,
    entityId,
    currentGroupId,
    smallGroups,
    onAssign,
    title = "Assign Small Group",
}: AssignGroupModalProps) {
    const [loading, setLoading] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(currentGroupId);

    useEffect(() => {
        setSelectedGroup(currentGroupId);
    }, [currentGroupId, isOpen]);

    const handleAssign = async () => {
        if (!entityId) return;

        setLoading(true);
        try {
            await onAssign(entityId, selectedGroup);
            onClose();
        } catch (error) {
            console.error("Failed to assign group", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Select a small group for this student.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="group" className="text-right">
                            Group
                        </Label>
                        <div className="col-span-3">
                            <Select
                                value={selectedGroup || "no-group"}
                                onValueChange={(val) => setSelectedGroup(val === "no-group" ? null : val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-group">No Group</SelectItem>
                                    {smallGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id.toString()}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Assigning...
                            </>
                        ) : (
                            'Assign Group'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
