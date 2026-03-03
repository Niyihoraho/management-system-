import { useEffect, useState } from "react";
import axios from "axios";
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
import { Loader2, CheckCircle2, ArrowRightLeft, Building2, Phone, Mail, User } from "lucide-react";

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
    onMigrate: (data: {
        studentId: number;
        phone: string;
        email: string;
    }) => Promise<void>;
}

export function MigrateStudentModal({
    isOpen,
    onClose,
    student,
    onMigrate,
}: MigrateStudentModalProps) {
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState({
        phone: "",
        email: "",
    });

    useEffect(() => {
        if (!isOpen || !student) return;
        setFormData({
            phone: student.phone || "",
            email: student.email || "",
        });
        setShowSuccess(false);
    }, [isOpen, student]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        setLoading(true);
        try {
            await onMigrate({
                studentId: student.id,
                ...formData,
            });
            setShowSuccess(true);
        } catch (error) {
            console.error("Migration failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShowSuccess(false);
        onClose();
    };

    if (!student) return null;

    // Success Modal
    if (showSuccess) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[420px]">
                    <div className="flex flex-col items-center py-6 space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold">Migration Submitted!</h3>
                            <p className="text-sm text-muted-foreground">
                                <strong>{student.fullName}</strong> is now marked as migrating.
                                The student can complete their migration using the public migration form.
                            </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 w-full space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{student.fullName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{student.university?.name || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{formData.phone || 'N/A'}</span>
                            </div>
                            {formData.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{formData.email}</span>
                                </div>
                            )}
                        </div>
                        <Button onClick={handleClose} className="w-full">
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Migration Confirmation Form
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                            <ArrowRightLeft className="h-4 w-4 text-amber-700" />
                        </div>
                        <DialogTitle>Confirm Migration</DialogTitle>
                    </div>
                    <DialogDescription>
                        Migrate <strong>{student.fullName}</strong> from student to graduate. This will send the request for approval.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Student Info Summary */}
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Details</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground text-xs">Name</span>
                                <p className="font-medium">{student.fullName}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">University</span>
                                <p className="font-medium">{student.university?.name || 'N/A'}</p>
                            </div>
                            {student.course && (
                                <div>
                                    <span className="text-muted-foreground text-xs">Course</span>
                                    <p className="font-medium">{student.course}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Editable Contact Info */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact Information</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs">Phone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="Phone number"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="Email address"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Migrating...
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                                    Confirm Migration
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
