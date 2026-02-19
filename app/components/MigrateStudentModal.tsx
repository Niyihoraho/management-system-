import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Student {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
    university: { name: string };
    course: string | null;
    placeOfBirthProvince: string | null;
    placeOfBirthDistrict: string | null;
    placeOfBirthSector: string | null;
}

interface MigrateStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    onMigrate: (data: any) => Promise<void>;
}

export function MigrateStudentModal({
    isOpen,
    onClose,
    student,
    onMigrate,
}: MigrateStudentModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        graduationYear: new Date().getFullYear().toString(),
        profession: "",
        phone: "",
        email: "",
        residenceProvince: "",
        residenceDistrict: "",
        residenceSector: "",
    });

    // Load student data when modal opens
    useState(() => {
        if (student) {
            setFormData({
                graduationYear: new Date().getFullYear().toString(),
                profession: "",
                phone: student.phone || "",
                email: student.email || "",
                residenceProvince: student.placeOfBirthProvince || "",
                residenceDistrict: student.placeOfBirthDistrict || "",
                residenceSector: student.placeOfBirthSector || "",
            });
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        setLoading(true);
        try {
            await onMigrate({
                studentId: student.id,
                ...formData,
            });
            onClose();
        } catch (error) {
            console.error("Migration failed", error);
        } finally {
            setLoading(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Migrate to Graduate</DialogTitle>
                    <DialogDescription>
                        Migrate <strong>{student.fullName}</strong> to the Graduates list. This will archive their student record.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="graduationYear">Graduation Year</Label>
                            <Input
                                id="graduationYear"
                                value={formData.graduationYear}
                                onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="profession">Profession (Optional)</Label>
                            <Input
                                id="profession"
                                value={formData.profession}
                                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                placeholder="e.g. Software Engineer"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>



                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="col-span-3">
                            <Label className="text-sm font-semibold">Current Residence</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="residenceProvince">Province</Label>
                            <Input
                                id="residenceProvince"
                                value={formData.residenceProvince}
                                onChange={(e) => setFormData({ ...formData, residenceProvince: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="residenceDistrict">District</Label>
                            <Input
                                id="residenceDistrict"
                                value={formData.residenceDistrict}
                                onChange={(e) => setFormData({ ...formData, residenceDistrict: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="residenceSector">Sector</Label>
                            <Input
                                id="residenceSector"
                                value={formData.residenceSector}
                                onChange={(e) => setFormData({ ...formData, residenceSector: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Migrating...
                                </>
                            ) : (
                                "Confirm Migration"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
