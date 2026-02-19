'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, Plus, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface UniversityFormData {
    name: string;
    regionId: string;
    studentPopulation: string;
    cults: string[];
    faculties: string[];
    associations: string[];
}

interface UniversityFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: UniversityFormData) => Promise<void>;
    initialData?: Partial<UniversityFormData>;
    title?: string;
    regions: { id: number; name: string }[];
}

const initialFormData: UniversityFormData = {
    name: '',
    regionId: '',
    studentPopulation: '0',
    cults: [],
    faculties: [],
    associations: [],
};

// Helper component for managing lists of strings
const ListInput = ({
    label,
    items,
    onAdd,
    onRemove,
    placeholder
}: {
    label: string,
    items: string[],
    onAdd: (item: string) => void,
    onRemove: (index: number) => void,
    placeholder: string
}) => {
    const [inputValue, setInputValue] = useState("");

    const handleAdd = () => {
        if (inputValue.trim()) {
            onAdd(inputValue.trim());
            setInputValue("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-3">
            <Label>{label}</Label>
            <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="h-10"
                />
                <Button type="button" onClick={handleAdd} size="icon" variant="secondary">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {items.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">No items added yet</span>
                )}
                {items.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        {item}
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="ml-1 hover:text-destructive focus:outline-none"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
        </div>
    );
};

export default function UniversityForm({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    title = 'Add University',
    regions,
}: UniversityFormProps) {
    const [formData, setFormData] = useState<UniversityFormData>(initialFormData);
    const [errors, setErrors] = useState<Partial<Record<keyof UniversityFormData, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialFormData,
                    ...initialData,
                    regionId: initialData.regionId?.toString() || '',
                    studentPopulation: initialData.studentPopulation?.toString() || '0',
                    cults: initialData.cults || [],
                    faculties: initialData.faculties || [],
                    associations: initialData.associations || [],
                });
            } else {
                setFormData(initialFormData);
            }
            setErrors({});
        }
    }, [isOpen, initialData]);

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof UniversityFormData, string>> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'University name is required';
        }

        if (!formData.regionId) {
            newErrors.regionId = 'Region is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof UniversityFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleListAdd = (field: 'cults' | 'faculties' | 'associations', item: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], item]
        }));
    };

    const handleListRemove = (field: 'cults' | 'faculties' | 'associations', index: number) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

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
                            Fill in the university details below. Required fields are marked with an asterisk (*).
                        </SheetDescription>
                    </SheetHeader>

                    <Card className="shadow-lg">
                        <CardHeader className="pb-6 border-b mb-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">University Information</h3>
                                <p className="text-sm text-muted-foreground">Enter university details</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">
                                                University Name <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => handleChange('name', e.target.value)}
                                                placeholder="Enter university name"
                                                className={`h-11 ${errors.name ? 'border-destructive' : ''}`}
                                            />
                                            {errors.name && (
                                                <p className="text-sm text-destructive">{errors.name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="regionId">
                                                Region <span className="text-destructive">*</span>
                                            </Label>
                                            <Select
                                                value={formData.regionId}
                                                onValueChange={(value) => handleChange('regionId', value)}
                                            >
                                                <SelectTrigger className={`h-11 ${errors.regionId ? 'border-destructive' : ''}`}>
                                                    <SelectValue placeholder="Select region" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {regions.map((region) => (
                                                        <SelectItem key={region.id} value={region.id.toString()}>
                                                            {region.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.regionId && (
                                                <p className="text-sm text-destructive">{errors.regionId}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="studentPopulation">Student Population</Label>
                                            <Input
                                                id="studentPopulation"
                                                type="number"
                                                min="0"
                                                value={formData.studentPopulation}
                                                onChange={(e) => handleChange('studentPopulation', e.target.value)}
                                                placeholder="Enter student population"
                                                className="h-11"
                                            />
                                        </div>
                                    </div>

                                    {/* Additional Lists Section */}
                                    <div className="space-y-4 pt-4 border-t">
                                        <h4 className="font-medium text-foreground">Additional Details</h4>
                                        <div className="grid grid-cols-1 gap-6">
                                            <ListInput
                                                label="Faculties"
                                                items={formData.faculties}
                                                onAdd={(item) => handleListAdd('faculties', item)}
                                                onRemove={(index) => handleListRemove('faculties', index)}
                                                placeholder="Add a faculty (e.g. Science, Arts)"
                                            />
                                            <ListInput
                                                label="Cults"
                                                items={formData.cults}
                                                onAdd={(item) => handleListAdd('cults', item)}
                                                onRemove={(index) => handleListRemove('cults', index)}
                                                placeholder="Add a cult"
                                            />
                                            <ListInput
                                                label="Associations"
                                                items={formData.associations}
                                                onAdd={(item) => handleListAdd('associations', item)}
                                                onRemove={(index) => handleListRemove('associations', index)}
                                                placeholder="Add an association"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-6 border-t mt-4">
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
                                            'Save University'
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
