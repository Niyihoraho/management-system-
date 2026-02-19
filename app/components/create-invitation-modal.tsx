'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Loader2, Link as LinkIcon, Calendar, FileText, User } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface CreateInvitationModalProps {
    onLinkCreated: () => void;
    children: React.ReactNode;
}

export function CreateInvitationModal({ onLinkCreated, children }: CreateInvitationModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [slug, setSlug] = useState('');
    const [useCustomSlug, setUseCustomSlug] = useState(false);
    const [type, setType] = useState<'student' | 'graduate'>('student');
    const [expiration, setExpiration] = useState('');
    const [description, setDescription] = useState('');

    // Region & University State
    const [regions, setRegions] = useState<{ id: number; name: string }[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [universities, setUniversities] = useState<{ id: number; name: string }[]>([]);
    const [selectedUniversityIds, setSelectedUniversityIds] = useState<number[]>([]);

    // Fetch Regions on mount
    useEffect(() => {
        let mounted = true;

        axios
            .get('/api/regions')
            .then(res => {
                if (mounted) {
                    setRegions(res.data);
                }
            })
            .catch(err => {
                console.error('Failed to fetch regions', err);
                toast.error('Failed to load regions');
            });

        return () => {
            mounted = false;
        };
    }, []);

    // Fetch Universities when region changes
    const handleRegionChange = async (regionId: string) => {
        setSelectedRegion(regionId);
        setSelectedUniversityIds([]); // Reset universities
        if (!regionId) {
            setUniversities([]);
            return;
        }
        try {
            const res = await axios.get(`/api/universities?regionId=${regionId}`);
            setUniversities(res.data);
        } catch (error) {
            console.error("Failed to fetch universities", error);
            toast.error("Failed to load universities");
        }
    };

    const toggleUniversity = (id: number) => {
        setSelectedUniversityIds(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    const toggleAllUniversities = () => {
        if (selectedUniversityIds.length === universities.length) {
            setSelectedUniversityIds([]);
        } else {
            setSelectedUniversityIds(universities.map(u => u.id));
        }
    };

    const generateSlug = () => {
        const random = Math.random().toString(36).substring(2, 8);
        return `${type}-${new Date().getFullYear()}-${random}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const finalSlug = useCustomSlug ? slug : generateSlug();

            // Default to 30 days if no expiration provided
            const finalExpiration = expiration
                ? new Date(expiration).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            await axios.post('/api/invitations', {
                slug: finalSlug,
                type,
                expiration: finalExpiration,
                description,
                regionId: selectedRegion ? parseInt(selectedRegion) : undefined,
                universityIds: selectedUniversityIds.length > 0 ? selectedUniversityIds : undefined,
            });

            toast.success("Invitation link created successfully");
            setOpen(false);
            onLinkCreated();

            // Reset form
            setSlug('');
            setUseCustomSlug(false);
            setType('student');
            setExpiration('');
            setDescription('');
            setSelectedRegion('');
            setUniversities([]);
            setSelectedUniversityIds([]);
        } catch (error: any) {
            console.error('Error creating link:', error);
            toast.error(error.response?.data || "Failed to create invitation link");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Invitation Link</DialogTitle>
                    <DialogDescription>
                        Generate a unique link for public registration.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">

                    {/* Link Type */}
                    <div className="space-y-3">
                        <Label>Target Audience</Label>
                        <RadioGroup
                            value={type}
                            onValueChange={(val) => setType(val as 'student' | 'graduate')}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="student" id="student" className="peer sr-only" />
                                <Label
                                    htmlFor="student"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <User className="mb-2 h-6 w-6" />
                                    Student
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="graduate" id="graduate" className="peer sr-only" />
                                <Label
                                    htmlFor="graduate"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <User className="mb-2 h-6 w-6" />
                                    Graduate
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Region & University Selection (Only for Student) */}
                    {type === 'student' && (
                        <div className="space-y-4 border rounded-md p-3 bg-muted/20">
                            <div className="space-y-2">
                                <Label>Region scope (Optional)</Label>
                                <Select value={selectedRegion} onValueChange={handleRegionChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regions.map(region => (
                                            <SelectItem key={region.id} value={region.id.toString()}>
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    Limit this link to a specific region and its universities.
                                </p>
                            </div>

                            {selectedRegion && universities.length > 0 && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between">
                                        <Label>Universities ({selectedUniversityIds.length}/{universities.length})</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto py-0 text-xs text-blue-600"
                                            onClick={toggleAllUniversities}
                                        >
                                            {selectedUniversityIds.length === universities.length ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto border rounded p-2 bg-background">
                                        {universities.map(uni => (
                                            <div key={uni.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`uni-${uni.id}`}
                                                    checked={selectedUniversityIds.includes(uni.id)}
                                                    onCheckedChange={() => toggleUniversity(uni.id)}
                                                />
                                                <label
                                                    htmlFor={`uni-${uni.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {uni.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Slug Configuration */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="slug">Link Slug (URL)</Label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="custom-slug"
                                    checked={useCustomSlug}
                                    onChange={(e) => setUseCustomSlug(e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                />
                                <label htmlFor="custom-slug" className="text-xs text-muted-foreground">Custom Slug</label>
                            </div>
                        </div>
                        {useCustomSlug ? (
                            <div className="flex items-center">
                                <span className="bg-muted px-3 py-2 border border-r-0 border-input rounded-l-md text-muted-foreground text-sm">
                                    /join/
                                </span>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="e.g. kigali-cohort-2026"
                                    className="rounded-l-none"
                                    required
                                />
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded border border-dashed">
                                Auto-generated: <span className="font-mono">/join/{type}-2026-xxxxxx</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Campaign Description</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Q1 Recruitment Drive"
                        />
                    </div>

                    {/* Expiration */}
                    <div className="space-y-2">
                        <Label htmlFor="expiration">Expiration Date</Label>
                        <Input
                            id="expiration"
                            type="datetime-local"
                            value={expiration}
                            onChange={(e) => setExpiration(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Leave empty for 30 days default.</p>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Link
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
