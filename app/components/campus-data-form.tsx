'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, X } from 'lucide-react';

interface CampusFormData {
    universityId: string;
    year: string;
    studentsCount: string;
    faculties: string;
    associations: string;
    cults: string;
}

interface CampusDataFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: Partial<CampusFormData>;
    title?: string;
    universities: { id: number; name: string }[];
}

const initialFormData: CampusFormData = {
    universityId: '',
    year: new Date().getFullYear().toString(),
    studentsCount: '0',
    faculties: '',
    associations: '',
    cults: '',
};

export default function CampusDataForm({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title = 'Add Campus Data',
    universities,
}: CampusDataFormProps) {
    const [formData, setFormData] = useState<CampusFormData>(initialFormData);
    const [errors, setErrors] = useState<Partial<Record<keyof CampusFormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [facultyInput, setFacultyInput] = useState('');
    const [associationInput, setAssociationInput] = useState('');
    const [cultsInput, setCultsInput] = useState('');

    const handleAddItem = (field: 'faculties' | 'associations' | 'cults', item: string, setInput: (v: string) => void) => {
        if (!item.trim()) return;
        const currentItems = formData[field] ? formData[field].split(',').map(s => s.trim()).filter(Boolean) : [];
        if (!currentItems.includes(item.trim())) {
            currentItems.push(item.trim());
            handleChange(field, currentItems.join(', '));
        }
        setInput('');
    };

    const handleRemoveItem = (field: 'faculties' | 'associations' | 'cults', item: string) => {
        const currentItems = formData[field] ? formData[field].split(',').map(s => s.trim()).filter(Boolean) : [];
        const newItems = currentItems.filter(i => i !== item);
        handleChange(field, newItems.join(', '));
    };

    const renderListInput = (
        field: 'faculties' | 'associations' | 'cults',
        label: string,
        placeholder: string,
        inputValue: string,
        setInputValue: (val: string) => void
    ) => {
        const items = formData[field] ? formData[field].split(',').map(s => s.trim()).filter(Boolean) : [];
        return (
            <div className="space-y-2">
                <Label htmlFor={`${field}-input`}>{label}</Label>
                <div className="flex gap-2">
                    <Input
                        id={`${field}-input`}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddItem(field, inputValue, setInputValue);
                            }
                        }}
                        placeholder={placeholder}
                    />
                    <Button type="button" variant="secondary" onClick={() => handleAddItem(field, inputValue, setInputValue)}>
                        Add
                    </Button>
                </div>
                {items.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {items.map((item, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1 font-normal bg-muted">
                                {item}
                                <button
                                    type="button"
                                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemoveItem(field, item);
                                    }}
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialFormData,
                    ...initialData,
                    universityId: initialData.universityId?.toString() || '',
                    year: initialData.year?.toString() || new Date().getFullYear().toString(),
                    studentsCount: initialData.studentsCount?.toString() || '0',
                    faculties: initialData.faculties || '',
                    associations: initialData.associations || '',
                    cults: initialData.cults || '',
                });
            } else {
                setFormData(initialFormData);
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof CampusFormData, string>> = {};

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
            const payload = {
                universityId: Number(formData.universityId),
                year: Number(formData.year),
                studentsCount: Number(formData.studentsCount),
                faculties: formData.faculties,
                associations: formData.associations,
                cults: formData.cults,
            };

            await onSubmit(payload);
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof CampusFormData, value: string) => {
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
                        <SheetDescription className="text-base">
                            Fill in the general information about the campus for the selected academic year.
                        </SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card>
                            <CardHeader className="border-b bg-muted/20 pb-4">
                                <h3 className="font-semibold text-foreground">Basic Information</h3>
                                <p className="text-sm text-muted-foreground">Select the university and academic year.</p>
                            </CardHeader>
                            <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="university">University <span className="text-destructive">*</span></Label>
                                    <Select
                                        value={formData.universityId}
                                        onValueChange={(val) => handleChange('universityId', val)}
                                        disabled={!!initialData?.universityId}
                                    >
                                        <SelectTrigger id="university" className={errors.universityId ? 'border-destructive ring-destructive' : ''}>
                                            <SelectValue placeholder="Select University" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {universities.map(u => (
                                                <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.universityId && <p className="text-sm font-medium text-destructive">{errors.universityId}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="year">Academic Year <span className="text-destructive">*</span></Label>
                                    <Select
                                        value={formData.year}
                                        onValueChange={(val) => handleChange('year', val)}
                                        disabled={!!initialData?.year}
                                    >
                                        <SelectTrigger id="year" className={errors.year ? 'border-destructive ring-destructive' : ''}>
                                            <SelectValue placeholder="Select Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map(y => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.year && <p className="text-sm font-medium text-destructive">{errors.year}</p>}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="border-b bg-muted/20 pb-4">
                                <h3 className="font-semibold text-foreground">Campus Details</h3>
                                <p className="text-sm text-muted-foreground">Information about faculties, associations, and student counts.</p>
                            </CardHeader>
                            <CardContent className="grid gap-6 pt-6">
                                <div className="space-y-2">
                                    <Label htmlFor="studentsCount">Number of all students in campus</Label>
                                    <Input
                                        id="studentsCount"
                                        type="number"
                                        min="0"
                                        value={formData.studentsCount}
                                        onChange={(e) => handleChange('studentsCount', e.target.value)}
                                        placeholder="e.g., 5000"
                                    />
                                </div>

                                {renderListInput("faculties", "Names of Faculties we have in campus", "Type a faculty name and press Add...", facultyInput, setFacultyInput)}
                                {renderListInput("associations", "Names of associations", "Type an association name and press Add...", associationInput, setAssociationInput)}
                                {renderListInput("cults", "Cults", "Type a known cult or disruptive group...", cultsInput, setCultsInput)}
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-4 pb-12">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Record'}
                            </Button>
                        </div>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
