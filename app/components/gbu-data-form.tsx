'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2 } from 'lucide-react';

interface GBUFormData {
    universityId: string;
    year: string;
    activeMembers: string;
    cells: string;
    discipleshipGroups: string;
    studentsInDiscipleship: string;
    savedStudents: string;
}

interface GBUDataFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: Partial<GBUFormData>;
    title?: string;
    universities: { id: number; name: string }[];
}

const initialFormData: GBUFormData = {
    universityId: '',
    year: new Date().getFullYear().toString(),
    activeMembers: '0',
    cells: '0',
    discipleshipGroups: '0',
    studentsInDiscipleship: '0',
    savedStudents: '0',
};

export default function GBUDataForm({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title = 'Add GBU Data',
    universities,
}: GBUDataFormProps) {
    const [formData, setFormData] = useState<GBUFormData>(initialFormData);
    const [errors, setErrors] = useState<Partial<Record<keyof GBUFormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New state for calculated count
    const [joinedCount, setJoinedCount] = useState<number | null>(null);
    const [loadingCount, setLoadingCount] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialFormData,
                    ...initialData,
                    universityId: initialData.universityId?.toString() || '',
                    year: initialData.year?.toString() || new Date().getFullYear().toString(),
                    activeMembers: initialData.activeMembers?.toString() || '0',
                    cells: initialData.cells?.toString() || '0',
                    discipleshipGroups: initialData.discipleshipGroups?.toString() || '0',
                    studentsInDiscipleship: initialData.studentsInDiscipleship?.toString() || '0',
                    savedStudents: initialData.savedStudents?.toString() || '0',
                });
            } else {
                setFormData(initialFormData);
            }
            setErrors({});
            setJoinedCount(null); // Reset count on open
        }
    }, [isOpen, initialData]);

    // Fetch student count when university or year changes
    useEffect(() => {
        const fetchCount = async () => {
            if (formData.universityId && formData.year && isOpen) {
                setLoadingCount(true);
                try {
                    const res = await fetch(`/api/gbu-data/student-count?universityId=${formData.universityId}&year=${formData.year}`);
                    if (res.ok) {
                        const data = await res.json();
                        setJoinedCount(data.count);
                    } else {
                        console.error("Failed to fetch student count");
                        setJoinedCount(null);
                    }
                } catch (error) {
                    console.error("Error fetching student count:", error);
                    setJoinedCount(null);
                } finally {
                    setLoadingCount(false);
                }
            } else {
                setJoinedCount(null);
            }
        };

        // Debounce slightly or just call
        const timeoutId = setTimeout(fetchCount, 300);
        return () => clearTimeout(timeoutId);
    }, [formData.universityId, formData.year, isOpen]);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof GBUFormData, string>> = {};

        if (!formData.universityId) {
            newErrors.universityId = 'University is required';
        }
        if (!formData.year) {
            newErrors.year = 'Year is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Convert string values to numbers for submission
            const payload = {
                universityId: Number(formData.universityId),
                year: Number(formData.year),
                activeMembers: Number(formData.activeMembers),
                cells: Number(formData.cells),
                discipleshipGroups: Number(formData.discipleshipGroups),
                studentsInDiscipleship: Number(formData.studentsInDiscipleship),
                savedStudents: Number(formData.savedStudents),
            };

            await onSubmit(payload);
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof GBUFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="top" className="h-full w-full max-w-none overflow-y-auto bg-muted/40 p-0">
                <div className="container mx-auto max-w-3xl py-8">
                    <SheetHeader className="pb-8 text-center">
                        <SheetTitle className="flex items-center justify-center gap-3 text-2xl">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <Building2 className="h-6 w-6 text-primary" />
                            </div>
                            {title}
                        </SheetTitle>
                        <SheetDescription className="text-lg text-muted-foreground text-center">
                            Fill in the statistics below. Required fields are marked with an asterisk (*).
                        </SheetDescription>
                    </SheetHeader>

                    <Card className="shadow-lg">
                        <CardHeader className="pb-6 border-b mb-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">General Information</h3>
                                <p className="text-sm text-muted-foreground">Enter GBU statistics</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="universityId">
                                            University <span className="text-destructive">*</span>
                                        </Label>
                                        <Select
                                            value={formData.universityId}
                                            onValueChange={(value) => handleChange('universityId', value)}
                                            disabled={!!initialData?.universityId || !!initialData?.year}
                                        >
                                            <SelectTrigger className={`h-11 ${errors.universityId ? 'border-destructive' : ''}`}>
                                                <SelectValue placeholder="Select University" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {universities.map((uni) => (
                                                    <SelectItem key={uni.id} value={uni.id.toString()}>
                                                        {uni.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.universityId && (
                                            <p className="text-sm text-destructive">{errors.universityId}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="year">
                                                Year <span className="text-destructive">*</span>
                                            </Label>
                                            <Select
                                                value={formData.year}
                                                onValueChange={(value) => handleChange('year', value)}
                                            >
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select Year" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {years.map((y) => (
                                                        <SelectItem key={y} value={y.toString()}>
                                                            {y}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="activeMembers">Active Members</Label>
                                            <Input
                                                id="activeMembers"
                                                type="number"
                                                min="0"
                                                value={formData.activeMembers}
                                                onChange={(e) => handleChange('activeMembers', e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cells">Number of Cells</Label>
                                            <Input
                                                id="cells"
                                                type="number"
                                                min="0"
                                                value={formData.cells}
                                                onChange={(e) => handleChange('cells', e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="discipleshipGroups">Discipleship Groups</Label>
                                            <Input
                                                id="discipleshipGroups"
                                                type="number"
                                                min="0"
                                                value={formData.discipleshipGroups}
                                                onChange={(e) => handleChange('discipleshipGroups', e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="studentsInDiscipleship">Students in Discipleship</Label>
                                            <Input
                                                id="studentsInDiscipleship"
                                                type="number"
                                                min="0"
                                                value={formData.studentsInDiscipleship}
                                                onChange={(e) => handleChange('studentsInDiscipleship', e.target.value)}
                                                className="h-11"
                                            />
                                        </div>

                                        {/* Joined This Year (Calculated) */}
                                        <div className="space-y-2">
                                            <Label>Joined This Year</Label>
                                            <div className="h-11 bg-muted/50 border rounded-md flex items-center justify-center shadow-sm">
                                                {loadingCount ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                ) : (
                                                    <span className="text-xl font-bold text-foreground">
                                                        {joinedCount !== null ? joinedCount : '-'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground text-center">Auto-calculated</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="savedStudents">Saved Students</Label>
                                            <Input
                                                id="savedStudents"
                                                type="number"
                                                min="0"
                                                value={formData.savedStudents}
                                                onChange={(e) => handleChange('savedStudents', e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t">
                                    <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose} disabled={isSubmitting}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Data'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </SheetContent>
        </Sheet>
    );
}
