'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Loader2, CheckCircle, Heart, Clock, Calendar, DollarSign, FileText, ShieldCheck, Send, ArrowRight, Megaphone, GraduationCap, Network, HeartHandshake, HandHeart, Database, Users, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const graduateSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number required"),
    graduationYear: z.string().min(4, "Year required"),
    university: z.string().min(1, "University required"),
    course: z.string().min(1, "Course/Degree required"),
    profession: z.string().optional(),
    isDiaspora: z.boolean().default(false),
    residenceProvince: z.string().optional(),
    residenceDistrict: z.string().optional(),
    residenceSector: z.string().optional(),
    servingPillars: z.array(z.string()).default([]),
    financialSupport: z.boolean().default(false),
    // New financial support fields
    supportStatus: z.enum(["want_to_support", "already_supporting", "later"]).optional(),
    supportFrequency: z.enum(["monthly", "half_year", "full_year"]).optional(),
    supportAmount: z.string().optional(),
    enableReminder: z.boolean().default(false),
    agreement: z.boolean().default(false).refine(val => val === true, "You must agree to the terms to proceed"),
    // Honeypot
    role_description: z.string().max(0).optional(),
    // Graduate Cell details
    attendGraduateCell: z.boolean().default(false),
    graduateGroupId: z.string().optional(),
    noCellAvailable: z.boolean().default(false),
}).refine(data => {
    // If not diaspora, district is required
    if (!data.isDiaspora && (!data.residenceDistrict || data.residenceDistrict.length < 1)) {
        return false;
    }
    return true;
}, {
    message: "District is required",
    path: ["residenceDistrict"]
});

type GraduateFormValues = z.infer<typeof graduateSchema>;

interface GraduateRegistrationFormProps {
    invitationId: string;
    onSuccess?: () => void;
}

const MINISTRY_PILLARS = [
    {
        id: "mobilization_integration",
        title: "Mobilization & Integration",
        icon: Megaphone,
        purpose: "Mobilizing new and usual graduates and integrate them in cells and support student ministry according to their skills and gifts",
        activities: "Recruitment, Orientation, Mentorship, Onboarding",
        color: "bg-blue-600"
    },
    {
        id: "capacity_building",
        title: "Capacity Building",
        icon: GraduationCap,
        purpose: "Developing skills, competencies, and leadership development, training and membership",
        activities: "Training, Workshops, Personal Development Plans, Feedback Loops",
        color: "bg-indigo-600"
    },
    {
        id: "event_planning_management",
        title: "Event Planning & Management",
        icon: Calendar,
        purpose: "Organizing impactful events that promote engagement and community building of GBUR graduates",
        activities: "Scheduling, Budgeting, Logistics, Evaluation",
        color: "bg-sky-600"
    },
    {
        id: "graduate_cell_management",
        title: "Graduate Cell Management",
        icon: Network,
        purpose: "Supporting graduates and maintaining long-term connections, developing materials in context, and setting up reporting systems",
        activities: "Graduate Engagement, Networking, Career Support",
        color: "bg-teal-600"
    },
    {
        id: "social_cohesion_promotion",
        title: "Social Cohesion Promotion",
        icon: HeartHandshake,
        purpose: "Encouraging graduates to work together, promoting well-being and mutual encouragement",
        activities: "Social Media Strategy, Public Relations, Content Creation",
        color: "bg-rose-600"
    },
    {
        id: "prayer_promotion",
        title: "Prayer Promotion",
        icon: HandHeart,
        purpose: "Promoting a spiritual culture and encouraging prayer practices among GBUR's members",
        activities: "Prayer Meetings, Spiritual Resources, Devotional Groups",
        color: "bg-violet-600"
    },
    {
        id: "database_management",
        title: "Database Management",
        icon: Database,
        purpose: "Maintaining accurate, accessible records for better planning, reporting, and communication",
        activities: "Data Entry, Data Analysis, Privacy Management",
        color: "bg-slate-600"
    }
];

export function GraduateRegistrationForm({ invitationId, onSuccess }: GraduateRegistrationFormProps) {
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [step, setStep] = useState(1);

    // Removed generic <GraduateFormValues> to let inference handle the resolver types
    const form = useForm({
        resolver: zodResolver(graduateSchema),
        defaultValues: {
            isDiaspora: false,
            fullName: "",
            phone: "",
            email: "",
            university: "",
            course: "",
            graduationYear: "",
            profession: "",
            residenceProvince: "",
            residenceDistrict: "",
            residenceSector: "",
            servingPillars: [],
            financialSupport: false,
            supportStatus: undefined,
            supportFrequency: undefined,
            supportAmount: "",
            enableReminder: false,
            role_description: "",
            agreement: false,
            attendGraduateCell: false,
            graduateGroupId: "",
            noCellAvailable: false,
        }
    });

    // Dynamic Location State
    const [provinces, setProvinces] = useState<{ id: string, name: string }[]>([]);
    const [districts, setDistricts] = useState<{ id: string, name: string }[]>([]);
    const [sectors, setSectors] = useState<{ id: string, name: string }[]>([]);
    const [graduateCells, setGraduateCells] = useState<{ id: number, name: string }[]>([]);

    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const response = await axios.get('/api/locations?type=provinces');
                setProvinces(response.data);
            } catch (error) {
                console.error("Failed to fetch provinces", error);
                toast.error("Failed to load provinces");
            }
        };
        fetchProvinces();
    }, []);

    // Handle Province Change
    const handleProvinceChange = async (provinceName: string) => {
        form.setValue("residenceProvince", provinceName);
        form.setValue("residenceDistrict", ""); // Reset child
        form.setValue("residenceSector", "");   // Reset child
        setDistricts([]);
        setSectors([]);

        const province = provinces.find(p => p.name === provinceName);
        if (province) {
            try {
                const response = await axios.get(`/api/locations?type=districts&parentId=${province.id}`);
                setDistricts(response.data);

                // Fetch Graduate Cells for this province
                const cellsResponse = await axios.get(`/api/graduate-small-groups?provinceId=${province.id}`);
                setGraduateCells(cellsResponse.data);
            } catch (error) {
                console.error("Failed to fetch districts or cells", error);
            }
        }
    };

    // Handle District Change
    const handleDistrictChange = async (districtName: string) => {
        form.setValue("residenceDistrict", districtName);
        form.setValue("residenceSector", ""); // Reset child
        setSectors([]);

        const district = districts.find(d => d.name === districtName);
        if (district) {
            try {
                const response = await axios.get(`/api/locations?type=sectors&parentId=${district.id}`);
                setSectors(response.data);
            } catch (error) {
                console.error("Failed to fetch sectors", error);
            }
        }
    };

    // Duplicate Modal State
    const [duplicateModal, setDuplicateModal] = useState<{
        isOpen: boolean;
        message: string;
    }>({ isOpen: false, message: '' });

    const handleDuplicateReset = () => {
        setDuplicateModal({ isOpen: false, message: '' });
        form.reset();
        setStep(1);
    };

    const nextStep = async () => {
        let fieldsToValidate: any[] = [];
        if (step === 1) fieldsToValidate = ["fullName", "phone", "email"];
        if (step === 2) fieldsToValidate = ["university", "course", "graduationYear", "profession"];
        if (step === 3) fieldsToValidate = ["isDiaspora", "residenceProvince", "residenceDistrict", "residenceSector"];
        if (step === 4) fieldsToValidate = ["servingPillars"];
        if (step === 5) fieldsToValidate = ["supportStatus"];

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

    const onSubmit = async (data: GraduateFormValues) => {
        if (data.role_description) return; // Silent fail for bots

        setSubmitting(true);
        try {
            const isSupporting = ['want_to_support', 'already_supporting'].includes(data.supportStatus || '');
            await axios.post('/api/public/registration', {
                ...data,
                financialSupport: isSupporting,
                type: 'graduate',
                invitationLinkId: invitationId,
                // Ensure number string is handled if needed, though schema allows string
                graduateGroupId: data.graduateGroupId || undefined
            });

            if (onSuccess) {
                onSuccess();
            } else {
                setSuccess(true);
            }
        } catch (error: any) {
            // Check if this is a duplicate or pending registration
            if (error.response?.status === 409) {
                // Determine error type for UI
                const errorType = error.response?.data?.error;
                const errorMessage = error.response?.data?.message || "Registration failed.";

                // Log as info instead of error
                console.info(`Registration duplicate detected: ${errorType}`);

                if (errorType === 'PENDING_REGISTRATION_EXISTS') {
                    // Show modal for pending
                    setDuplicateModal({
                        isOpen: true,
                        message: errorMessage
                    });
                } else if (errorType === 'USER_ALREADY_EXISTS' || errorType === 'MEMBER_ALREADY_EXISTS') {
                    // Show modal for existing member
                    setDuplicateModal({
                        isOpen: true,
                        message: errorMessage
                    });
                } else {
                    toast.error(errorMessage);
                }
            } else {
                // Log actual errors
                console.error(error);
                toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (duplicateModal.isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-300 text-center max-w-md w-full animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                            <AlertCircle className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Registration Status</h2>
                        <p className="text-slate-600 leading-relaxed">
                            {duplicateModal.message}
                        </p>
                        <Button
                            onClick={handleDuplicateReset}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl mt-4"
                        >
                            OK, I Understand
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-300 text-center">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Registration Complete!</h2>
                    <p className="text-slate-600 max-w-md">Thank you for registering. We will be in touch shortly.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-300">
            <div className="mb-6 pb-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Graduate Details</h2>
                    <p className="text-sm text-slate-600 mt-1">Step {step} of 6</p>
                </div>
                {/* Simple Step Indicator */}
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map(s => (
                        <div key={s} className={`h-2 w-8 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-blue-200'}`} />
                    ))}
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <input type="text" {...form.register("role_description")} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                {/* STEP 1: PERSONAL DETAILS */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-900 font-semibold text-sm">Full Name</Label>
                                <Input {...form.register("fullName")} className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                                {form.formState.errors.fullName && <p className="text-xs text-red-600 font-medium">{form.formState.errors.fullName.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-900 font-semibold text-sm">Phone Number</Label>
                                <Input {...form.register("phone")} className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                                {form.formState.errors.phone && <p className="text-xs text-red-600 font-medium">{form.formState.errors.phone.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Email Address</Label>
                            <Input {...form.register("email")} type="email" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.email && <p className="text-xs text-red-600 font-medium">{form.formState.errors.email.message}</p>}
                        </div>
                    </div>
                )}

                {/* STEP 2: EDUCATION & PROFESSION */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">University Graduated From</Label>
                            <Input {...form.register("university")} placeholder="e.g. UR - CST" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.university && <p className="text-xs text-red-600 font-medium">{form.formState.errors.university.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-slate-900 font-semibold text-sm">Course / Option</Label>
                                <Input {...form.register("course")} placeholder="e.g. Computer Science" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                                {form.formState.errors.course && <p className="text-xs text-red-600 font-medium">{form.formState.errors.course.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-900 font-semibold text-sm">Graduation Year</Label>
                                <Select
                                    onValueChange={(value) => form.setValue("graduationYear", value)}
                                    value={form.watch("graduationYear") || ""}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600 transition-all duration-200 hover:border-slate-400">
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {Array.from({ length: 61 }, (_, i) => new Date().getFullYear() + 5 - i).map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.graduationYear && <p className="text-xs text-red-600 font-medium">{form.formState.errors.graduationYear.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Current Profession/Job</Label>
                            <Input {...form.register("profession")} placeholder="e.g. Software Engineer" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                        </div>
                    </div>
                )}

                {/* STEP 3: MINISTRY & LOCATION */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4 pt-2">
                            <div className="flex items-start space-x-3 bg-blue-50 p-4 rounded-xl border border-blue-200 hover:bg-blue-100/50 transition-colors shadow-sm">
                                <Checkbox
                                    id="diaspora"
                                    checked={form.watch("isDiaspora") || false}
                                    onCheckedChange={(c) => form.setValue("isDiaspora", c as boolean)}
                                    className="mt-1 h-5 w-5 border-blue-400 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700"
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="diaspora" className="font-bold text-base text-slate-900 cursor-pointer">
                                        I currently reside outside Rwanda (Diaspora)
                                    </Label>
                                    <p className="text-xs text-slate-600">
                                        Select this if you live abroad. You will not need to provide local residence details.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!form.watch("isDiaspora") && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-900 font-semibold text-sm">Residence Province</Label>
                                    <Select
                                        onValueChange={handleProvinceChange}
                                        value={form.watch("residenceProvince") || ""}
                                    >
                                        <SelectTrigger className="bg-slate-100 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600">
                                            <SelectValue placeholder="Select Province" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {provinces.map((province) => (
                                                <SelectItem key={province.id} value={province.name}>
                                                    {province.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-slate-900 font-semibold text-sm">Residence District</Label>
                                        <Select
                                            onValueChange={handleDistrictChange}
                                            value={form.watch("residenceDistrict") || ""}
                                            disabled={!form.watch("residenceProvince")}
                                        >
                                            <SelectTrigger className="bg-slate-100 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600">
                                                <SelectValue placeholder="Select District" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {districts.map((district) => (
                                                    <SelectItem key={district.id} value={district.name}>
                                                        {district.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {form.formState.errors.residenceDistrict && <p className="text-xs text-red-600 font-medium">{form.formState.errors.residenceDistrict.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-900 font-semibold text-sm">Residence Sector</Label>
                                        <Select
                                            onValueChange={(value) => form.setValue("residenceSector", value)}
                                            value={form.watch("residenceSector") || ""}
                                            disabled={!form.watch("residenceDistrict")}
                                        >
                                            <SelectTrigger className="bg-slate-100 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600">
                                                <SelectValue placeholder="Select Sector" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sectors.map((sector) => (
                                                    <SelectItem key={sector.id} value={sector.name}>
                                                        {sector.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Graduate Cell Selection Section (Moved from Step 4) */}
                        {!form.watch("isDiaspora") && form.watch("residenceProvince") && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 mt-8">
                                <div className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm space-y-5">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <Label className="text-slate-900 font-bold text-lg block">
                                                Graduate Cell
                                            </Label>
                                            <p className="text-slate-500 text-xs">Connect with a small group near you</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="attendGraduateCell"
                                                checked={form.watch("attendGraduateCell")}
                                                onCheckedChange={(checked) => {
                                                    form.setValue("attendGraduateCell", checked as boolean);
                                                }}
                                                className="border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <Label htmlFor="attendGraduateCell" className="text-slate-700 cursor-pointer font-medium">
                                                Do you currently attend a Graduate Cell?
                                            </Label>
                                        </div>

                                        <div className="pl-6 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-slate-900 font-semibold text-sm mb-2 block">
                                                {form.watch("attendGraduateCell")
                                                    ? "Select your current Graduate Cell"
                                                    : "Search for a nearby Graduate Cell to join"}
                                            </Label>
                                            <Select
                                                onValueChange={(value) => {
                                                    if (value === "no_cell_nearby") {
                                                        form.setValue("graduateGroupId", "");
                                                        form.setValue("noCellAvailable", true);
                                                    } else {
                                                        form.setValue("graduateGroupId", value);
                                                        form.setValue("noCellAvailable", false);
                                                    }
                                                }}
                                                value={form.watch("noCellAvailable") ? "no_cell_nearby" : (form.watch("graduateGroupId") || "")}
                                            >
                                                <SelectTrigger className="bg-white border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600">
                                                    <SelectValue placeholder="Select Graduate Cell" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {graduateCells.length > 0 ? (
                                                        <>
                                                            {graduateCells.map((cell) => (
                                                                <SelectItem key={cell.id} value={cell.id.toString()}>
                                                                    {cell.name}
                                                                </SelectItem>
                                                            ))}
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <SelectItem value="no_cell_nearby" className="text-amber-600 font-medium">
                                                                I can't find a cell near me
                                                            </SelectItem>
                                                        </>
                                                    ) : (
                                                        <div className="p-2 text-sm text-slate-500 text-center">
                                                            No cells found in this province
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>

                                            {form.watch("noCellAvailable") && (
                                                <div className="mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-2 animate-in fade-in slide-in-from-top-2">
                                                    <div className="w-1 h-full bg-amber-400 rounded-full" />
                                                    <p>
                                                        We have recorded that there is no cell near you in <strong>{form.watch("residenceDistrict")}</strong>. We will contact you to help you get connected or start one!
                                                    </p>
                                                </div>
                                            )}

                                            {!form.watch("attendGraduateCell") && !form.watch("noCellAvailable") && (
                                                <div className="mt-3 text-sm text-slate-600 bg-white/60 p-3 rounded-lg border border-slate-100 flex gap-2">
                                                    <div className="w-1 h-full bg-blue-400 rounded-full" />
                                                    <p>
                                                        Even if you don't attend one yet, we encourage you to select a cell near you for fellowship and growth!
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* STEP 4: MINISTRY ENGAGEMENT */}
                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                        <div className="text-center space-y-2 mb-8">
                            <h3 className="text-xl font-bold text-slate-900">Ministry Engagement</h3>
                            <p className="text-slate-600">Discover where you can serve and make an impact.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1">
                                <Label className="text-slate-900 font-bold text-xl flex items-center gap-2">
                                    <Megaphone className="w-6 h-6 text-blue-600" />
                                    Select Your Pillar
                                </Label>
                                <p className="text-sm text-slate-600">
                                    Select the pillar you are most interested in serving. Click a card to select it.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {MINISTRY_PILLARS.map((pillar) => {
                                    const isSelected = form.watch("servingPillars")?.includes(pillar.id);
                                    // Derive text color from bg color class (e.g. bg-blue-600 -> text-blue-600)
                                    const textColorClass = pillar.color.replace('bg-', 'text-');
                                    // Use lighter backgrounds for unselected state to match Financial Support look
                                    const bgOpacityClass = pillar.color.replace('bg-', 'bg-').replace('600', '100');

                                    return (
                                        <div
                                            key={pillar.id}
                                            onClick={() => {
                                                // Single select logic: Replace array with just this one
                                                form.setValue("servingPillars", [pillar.id]);
                                            }}
                                            className={`relative group p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${isSelected
                                                ? `border-blue-600 bg-blue-50/50 shadow-blue-100` // Selected style akin to "I want to support"
                                                : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className={`p-3 rounded-xl transition-colors ${isSelected
                                                    ? `${pillar.color} text-white` // Solid color when selected
                                                    : `${bgOpacityClass} ${textColorClass} group-hover:bg-opacity-20` // Lighter bg when not selected
                                                    }`}>
                                                    <pillar.icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label className={`font-bold text-lg cursor-pointer ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                                            {pillar.title}
                                                        </Label>
                                                        {isSelected && (
                                                            <div className="h-4 w-4 rounded-full bg-blue-600 shadow-sm animate-in zoom-in" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                                        {pillar.purpose}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Validation Message / Helper */}
                            {(!form.watch("servingPillars") || (form.watch("servingPillars")?.length || 0) === 0) && (
                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-sm animate-in fade-in">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Please select a ministry pillar to proceed to the next step.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 5: FINANCIAL SUPPORT */}
                {step === 5 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center space-y-2 mb-8">
                            <h3 className="text-xl font-bold text-slate-900">Partner With Us</h3>
                            <p className="text-slate-600">Your support helps us continue our mission and reach more lives.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Option 1: Want to Support */}
                            <div
                                onClick={() => form.setValue("supportStatus", "want_to_support")}
                                className={`relative group p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${form.watch("supportStatus") === "want_to_support"
                                    ? 'border-blue-600 bg-blue-50 shadow-blue-100'
                                    : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-xl transition-colors ${form.watch("supportStatus") === "want_to_support"
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'
                                        }`}>
                                        <Heart className={`w-6 h-6 ${form.watch("supportStatus") === "want_to_support" ? 'fill-current' : ''}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-lg text-slate-900 cursor-pointer">
                                                I want to support
                                            </Label>
                                            {form.watch("supportStatus") === "want_to_support" && (
                                                <div className="h-4 w-4 rounded-full bg-blue-600 shadow-sm animate-in zoom-in" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">Start a new commitment to support the ministry's vision.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Option 2: Already Supporting */}
                            <div
                                onClick={() => form.setValue("supportStatus", "already_supporting")}
                                className={`relative group p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${form.watch("supportStatus") === "already_supporting"
                                    ? 'border-green-600 bg-green-50 shadow-green-100'
                                    : 'border-slate-300 bg-white hover:border-green-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-xl transition-colors ${form.watch("supportStatus") === "already_supporting"
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-100 text-green-600 group-hover:bg-green-200'
                                        }`}>
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-lg text-slate-900 cursor-pointer">
                                                I'm already supporting
                                            </Label>
                                            {form.watch("supportStatus") === "already_supporting" && (
                                                <div className="h-4 w-4 rounded-full bg-green-600 shadow-sm animate-in zoom-in" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">Continue your existing partnership with us.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Option 3: Do it Later */}
                            <div
                                onClick={() => form.setValue("supportStatus", "later")}
                                className={`relative group p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${form.watch("supportStatus") === "later"
                                    ? 'border-slate-600 bg-slate-100 shadow-slate-100'
                                    : 'border-slate-300 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-xl transition-colors ${form.watch("supportStatus") === "later"
                                        ? 'bg-slate-700 text-white'
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                        }`}>
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-lg text-slate-900 cursor-pointer">
                                                I'll decide later
                                            </Label>
                                            {form.watch("supportStatus") === "later" && (
                                                <div className="h-4 w-4 rounded-full bg-slate-600 shadow-sm animate-in zoom-in" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">Skip for now, you can always update this later.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Show frequency and amount fields if want_to_support or already_supporting */}
                        {(form.watch("supportStatus") === "want_to_support" || form.watch("supportStatus") === "already_supporting") && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                Support Frequency
                                            </Label>
                                            <Select
                                                onValueChange={(value) => form.setValue("supportFrequency", value as any)}
                                                value={form.watch("supportFrequency") || ""}
                                            >
                                                <SelectTrigger className="bg-slate-100 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600 h-11">
                                                    <SelectValue placeholder="Select frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">📅 Monthly</SelectItem>
                                                    <SelectItem value="half_year">📆 Half Year (Every 6 months)</SelectItem>
                                                    <SelectItem value="full_year">🗓️ Full Year (Annually)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3">
                                            <Label className="text-slate-900 font-semibold text-sm flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-green-600" />
                                                Amount (RWF)
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    {...form.register("supportAmount")}
                                                    type="number"
                                                    placeholder="e.g. 10,000"
                                                    className="pl-4 bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400 h-11"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reminder Option */}
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-100 flex items-start gap-4 transition-colors hover:border-amber-200">
                                        <Checkbox
                                            id="enableReminder"
                                            checked={form.watch("enableReminder")}
                                            onCheckedChange={(c) => form.setValue("enableReminder", c as boolean)}
                                            className="mt-1 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 h-5 w-5 rounded-md"
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="enableReminder" className="font-bold text-slate-900 cursor-pointer flex items-center gap-2">
                                                <span>💌 Send me friendly reminders</span>
                                            </Label>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                We'll send you gentle, caring reminders about your support commitment. Your partnership means the world to us! 🤗💖
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 6: AGREEMENT & SUBMIT */}
                {step === 6 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center space-y-2 mb-6">
                            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Final Review</h3>
                            <p className="text-slate-600 max-w-md mx-auto">Please review your information carefully before submitting. This ensures we can stay connected effectively.</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50" />

                            <div className="relative">
                                <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-green-600" />
                                    Declaration & Privacy
                                </h4>

                                <div className="space-y-4">
                                    <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        By submitting this form, you confirm that the information provided is accurate and current. This data will be treated with strict confidentiality and used solely for Ministry purposes and communication.
                                    </p>

                                    <div className="flex items-start space-x-4 p-4 rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                                        <Checkbox
                                            id="agreement"
                                            checked={form.watch("agreement")}
                                            onCheckedChange={(c) => form.setValue("agreement", c as boolean)}
                                            className="mt-1 border-slate-400 data-[state=checked]:bg-blue-600 w-5 h-5 rounded-md"
                                        />
                                        <div className="space-y-1 flex-1">
                                            <Label htmlFor="agreement" className="font-bold text-slate-900 cursor-pointer text-base">
                                                I Confirm & Agree
                                            </Label>
                                            <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors">
                                                I hereby declare that the details furnished above are true and correct to the best of my knowledge.
                                            </p>
                                            {form.formState.errors.agreement && <p className="text-xs text-red-600 font-medium animate-in fade-in slide-in-from-left-1">{form.formState.errors.agreement.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 gap-4 border-t border-slate-100 mt-8">
                    {step > 1 && (
                        <Button type="button" onClick={prevStep} variant="outline" className="px-8 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl py-6 font-medium transition-all hover:shadow-sm">
                            Back
                        </Button>
                    )}
                    {step < 6 && (
                        <Button type="button" onClick={nextStep} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 shadow-lg shadow-blue-600/20 font-bold tracking-wide text-base transition-all hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98] group">
                            Next Step
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    )}
                    {step === 6 && (
                        <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold tracking-wide py-6 rounded-xl shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 transition-all transform active:scale-[0.98] text-lg group" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Submitting Application...
                                </>
                            ) : (
                                <>
                                    Submit Graduate Registration
                                    <Send className="ml-2 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
