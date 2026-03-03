'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Database,
    GraduationCap,
    HandHeart,
    Heart,
    HeartHandshake,
    Loader2,
    Megaphone,
    Network,
    Pencil,
    Search,
    User,
    Users,
    DollarSign,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface UniversityOption {
    id: number;
    name: string;
    regionId?: number;
    region?: { name?: string | null } | null;
}

interface MigratingStudent {
    id: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    sex: 'Male' | 'Female' | null;
    course: string | null;
    university: {
        id: number;
        name: string;
    };
}

interface MigrateRegistrationFormProps {
    invitationId: string;
    universities: UniversityOption[];
    onSuccess?: () => void;
}

const migrationSchema = z.object({
    regionId: z.string().min(1, 'Region is required'),
    universityId: z.string().min(1, 'University is required'),
    sourceStudentId: z.string().min(1, 'Please select your name'),
    fullName: z.string().min(2, 'Full name is required'),
    sex: z.enum(['Male', 'Female'], { message: 'Sex is required' }),
    email: z.string().email('Invalid email address').or(z.literal('')),
    phone: z.string().min(10, 'Phone number required'),
    course: z.string().optional(),
    graduationYear: z.string().min(4, 'Graduation year is required'),
    profession: z.string().optional(),
    isDiaspora: z.boolean().default(false),
    residenceProvince: z.string().optional(),
    residenceDistrict: z.string().optional(),
    residenceSector: z.string().optional(),
    servingPillars: z.array(z.string()).min(1, 'Select one ministry pillar'),
    supportStatus: z.enum(['want_to_support', 'already_supporting', 'later'], {
        message: 'Choose one option',
    }),
    supportFrequency: z.enum(['monthly', 'half_year', 'full_year']).optional(),
    supportAmount: z.string().optional(),
    enableReminder: z.boolean().default(false),
    attendGraduateCell: z.boolean().default(false),
    graduateGroupId: z.string().optional(),
    noCellAvailable: z.boolean().default(false),
    agreement: z.boolean().refine((value) => value === true, {
        message: 'You must agree to continue',
    }),
    role_description: z.string().max(0).optional(),
}).refine((data) => {
    if (!data.isDiaspora && (!data.residenceDistrict || data.residenceDistrict.length < 1)) {
        return false;
    }
    return true;
}, {
    message: 'District is required',
    path: ['residenceDistrict'],
});

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


export function MigrateRegistrationForm({ invitationId, universities, onSuccess }: MigrateRegistrationFormProps) {
    const [step, setStep] = useState(1);
    const [isMounted, setIsMounted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [students, setStudents] = useState<MigratingStudent[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [allowEmailEdit, setAllowEmailEdit] = useState(false);
    const [allowPhoneEdit, setAllowPhoneEdit] = useState(false);

    const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
    const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
    const [sectors, setSectors] = useState<{ id: string; name: string }[]>([]);
    const [graduateCells, setGraduateCells] = useState<{ id: number; name: string }[]>([]);

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


    useEffect(() => {
        setIsMounted(true);
    }, []);

    const form = useForm({
        resolver: zodResolver(migrationSchema),
        defaultValues: {
            regionId: '',
            universityId: '',
            sourceStudentId: '',
            fullName: '',
            sex: 'Male',
            email: '',
            phone: '',
            course: '',
            graduationYear: '',
            profession: '',
            isDiaspora: false,
            residenceProvince: '',
            residenceDistrict: '',
            residenceSector: '',
            servingPillars: [],
            supportStatus: 'later',
            supportFrequency: undefined,
            supportAmount: '',
            enableReminder: false,
            attendGraduateCell: false,
            graduateGroupId: '',
            noCellAvailable: false,
            agreement: false,
            role_description: '',
        },
    });

    const regionOptions = useMemo(() => {
        const map = new Map<number, string>();
        for (const uni of universities) {
            if (typeof uni.regionId === 'number' && !map.has(uni.regionId)) {
                map.set(uni.regionId, uni.region?.name || `Region ${uni.regionId}`);
            }
        }
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [universities]);

    const selectedRegionId = form.watch('regionId');
    const selectedUniversityId = form.watch('universityId');
    const selectedStudentId = form.watch('sourceStudentId');

    const universityOptions = useMemo(() => {
        if (!selectedRegionId) return [];
        return universities
            .filter((uni) => String(uni.regionId) === selectedRegionId)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [universities, selectedRegionId]);

    const selectedStudent = useMemo(
        () => students.find((student) => String(student.id) === selectedStudentId),
        [students, selectedStudentId],
    );

    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const response = await axios.get('/api/locations?type=provinces');
                setProvinces(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error('Failed to fetch provinces', error);
                toast.error('Failed to load provinces');
            }
        };

        fetchProvinces();
    }, []);

    useEffect(() => {
        if (!selectedUniversityId) {
            setStudents([]);
            form.setValue('sourceStudentId', '');
            return;
        }

        const fetchMigratingStudents = async () => {
            try {
                setLoadingStudents(true);
                const response = await axios.get(`/api/public/migrating-students?universityId=${selectedUniversityId}`);
                setStudents(response.data.students || []);
            } catch (error) {
                console.error('Failed to fetch migrating students', error);
                toast.error('Failed to load migrating students');
                setStudents([]);
            } finally {
                setLoadingStudents(false);
            }
        };

        fetchMigratingStudents();
    }, [form, selectedUniversityId]);

    useEffect(() => {
        if (!selectedStudent) return;

        form.setValue('fullName', selectedStudent.fullName, { shouldValidate: true });
        form.setValue('phone', selectedStudent.phone || '', { shouldValidate: true });
        form.setValue('email', selectedStudent.email || '', { shouldValidate: true });
        form.setValue('sex', selectedStudent.sex || 'Male', { shouldValidate: true });
        form.setValue('course', selectedStudent.course || '');

        setAllowEmailEdit(false);
        setAllowPhoneEdit(false);
    }, [form, selectedStudent]);

    const handleProvinceChange = async (provinceName: string) => {
        form.setValue('residenceProvince', provinceName, { shouldValidate: true });
        form.setValue('residenceDistrict', '');
        form.setValue('residenceSector', '');
        setDistricts([]);
        setSectors([]);
        setGraduateCells([]);

        const province = provinces.find((item) => item.name === provinceName);
        if (!province) return;

        try {
            const response = await axios.get(`/api/locations?type=districts&parentId=${province.id}`);
            setDistricts(Array.isArray(response.data) ? response.data : []);

            const cellsResponse = await axios.get(`/api/graduate-small-groups?provinceId=${province.id}`);
            const cellsData = cellsResponse.data;
            setGraduateCells(Array.isArray(cellsData) ? cellsData : (cellsData?.graduateGroups || []));
        } catch (error) {
            console.error('Failed to fetch districts', error);
            toast.error('Failed to load districts');
        }
    };

    const handleDistrictChange = async (districtName: string) => {
        form.setValue('residenceDistrict', districtName, { shouldValidate: true });
        form.setValue('residenceSector', '');
        setSectors([]);

        const district = districts.find((item) => item.name === districtName);
        if (!district) return;

        try {
            const response = await axios.get(`/api/locations?type=sectors&parentId=${district.id}`);
            setSectors(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch sectors', error);
            toast.error('Failed to load sectors');
        }
    };

    const nextStep = async () => {
        let fieldsToValidate: string[] = [];
        if (step === 1) fieldsToValidate = ['regionId', 'universityId', 'sourceStudentId'];
        if (step === 2) fieldsToValidate = ['fullName', 'sex', 'email', 'phone', 'graduationYear'];
        if (step === 3) fieldsToValidate = ['isDiaspora', 'residenceProvince', 'residenceDistrict', 'residenceSector'];
        if (step === 4) fieldsToValidate = ['servingPillars'];
        if (step === 5) fieldsToValidate = ['supportStatus', 'agreement'];

        const isValid = await form.trigger(fieldsToValidate as any);
        if (isValid) setStep((value) => value + 1);
    };

    const prevStep = () => setStep((value) => value - 1);

    const onSubmit = async (data: any) => {
        if (data.role_description) return;

        const selectedUniversity = universities.find((uni) => String(uni.id) === data.universityId);
        const isSupporting = ['want_to_support', 'already_supporting'].includes(data.supportStatus);

        setSubmitting(true);
        try {
            await axios.post('/api/public/registration', {
                ...data,
                type: 'graduate',
                invitationLinkId: invitationId,
                sourceStudentId: Number(data.sourceStudentId),
                universityId: data.universityId,
                university: selectedUniversity?.name || selectedStudent?.university?.name || '',
                financialSupport: isSupporting,
                graduateGroupId: data.noCellAvailable ? undefined : (data.graduateGroupId || undefined),
            });

            toast.success('Migration completion submitted successfully!');
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            // Check if this is a duplicate or pending registration
            if (error.response?.status === 409) {
                const errorMessage = error.response?.data?.message || "Registration failed.";
                console.info(`Migration duplicate detected: ${error.response?.data?.error}`);

                setDuplicateModal({
                    isOpen: true,
                    message: errorMessage
                });
            } else {
                console.error(error);
                toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }

    };

    if (!isMounted) {
        return null;
    }

    if (duplicateModal.isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-300 text-center max-w-md w-full animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center shadow-sm">
                            <AlertCircle className="h-8 w-8 text-yellow-600" />
                        </div>
                        <h2 className="text-xl font-bold text-black">Migration Status</h2>
                        <p className="text-slate-600 leading-relaxed">
                            {duplicateModal.message}
                        </p>
                        <Button
                            onClick={handleDuplicateReset}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 rounded-xl mt-4"
                        >
                            OK, I Understand
                        </Button>
                    </div>
                </div>
            </div>
        );
    }


    const stepTitles = [
        "Find Your Record",
        "Personal & Education",
        "Ministry & Location",
        "Ministry Engagement",
        "Partner With Us"
    ];

    return (
        <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-300">
            <div className="mb-6 pb-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-black">{stepTitles[step - 1]}</h2>
                    <p className="text-sm text-slate-600 mt-1">Step {step} of 5</p>
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((index) => (
                        <div key={index} className={`h-2 w-8 rounded-full transition-colors ${index <= step ? 'bg-blue-600' : 'bg-blue-200'}`} />
                    ))}
                </div>
            </div>


            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <input type="text" {...form.register('role_description')} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                {/* STEP 1: LOOKUP */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                            <p className="text-sm text-blue-800 leading-relaxed">
                                <strong>Let's find your record.</strong> Select your university to locate your migrating profile and complete your graduation details.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-black font-semibold text-sm flex items-center gap-2">
                                    <Network className="w-4 h-4 text-slate-400" />
                                    Select Region
                                </Label>
                                <Select
                                    value={form.watch('regionId')}
                                    onValueChange={(value) => {
                                        form.setValue('regionId', value, { shouldValidate: true });
                                        form.setValue('universityId', '');
                                        form.setValue('sourceStudentId', '');
                                        setStudents([]);
                                    }}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                        <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {regionOptions.map((region) => (
                                            <SelectItem className="text-black" key={region.id} value={String(region.id)}>
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.regionId && <p className="text-xs text-red-600 font-medium">{form.formState.errors.regionId.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-black font-semibold text-sm flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-slate-400" />
                                    Select University
                                </Label>
                                <Select
                                    value={form.watch('universityId')}
                                    disabled={!form.watch('regionId')}
                                    onValueChange={(value) => {
                                        form.setValue('universityId', value, { shouldValidate: true });
                                        form.setValue('sourceStudentId', '');
                                    }}
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                        <SelectValue placeholder="Select university" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {universityOptions.map((uni) => (
                                            <SelectItem className="text-black" key={uni.id} value={String(uni.id)}>
                                                {uni.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.universityId && <p className="text-xs text-red-600 font-medium">{form.formState.errors.universityId.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-black font-semibold text-sm flex items-center gap-2">
                                <Search className="w-4 h-4 text-slate-400" />
                                Find Your Name
                            </Label>
                            <Select
                                value={form.watch('sourceStudentId')}
                                disabled={!form.watch('universityId') || loadingStudents}
                                onValueChange={(value) => form.setValue('sourceStudentId', value, { shouldValidate: true })}
                            >
                                <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <SelectValue placeholder={loadingStudents ? 'Looking for migrating profiles...' : 'Select your name from the list'} />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {students.map((student) => (
                                        <SelectItem className="text-black" key={student.id} value={String(student.id)}>
                                            {student.fullName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.sourceStudentId && <p className="text-xs text-red-600 font-medium">{form.formState.errors.sourceStudentId.message}</p>}
                            {!loadingStudents && form.watch('universityId') && students.length === 0 && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    No migrating students were found for this university.
                                </p>
                            )}
                        </div>
                    </div>
                )}


                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <Label className="text-black font-semibold text-sm">Full Name</Label>
                            <Input {...form.register('fullName')} readOnly className="bg-slate-100 border-slate-300 text-slate-900" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-black font-semibold text-sm">Sex</Label>
                                <Select value={form.watch('sex')} onValueChange={(value) => form.setValue('sex', value as 'Male' | 'Female', { shouldValidate: true })}>
                                    <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                        <SelectValue placeholder="Select sex" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem className="text-black" value="Male">Male</SelectItem>
                                        <SelectItem className="text-black" value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-black font-semibold text-sm">Graduation Year</Label>
                                <Select value={form.watch('graduationYear')} onValueChange={(value) => form.setValue('graduationYear', value, { shouldValidate: true })}>
                                    <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white max-h-[260px]">
                                        {Array.from({ length: 61 }, (_, index) => new Date().getFullYear() + 5 - index).map((year) => (
                                            <SelectItem className="text-black" key={year} value={String(year)}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.formState.errors.graduationYear && <p className="text-xs text-red-600 font-medium">{form.formState.errors.graduationYear.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-black font-semibold text-sm">Phone</Label>
                                    <button
                                        type="button"
                                        onClick={() => setAllowPhoneEdit((state) => !state)}
                                        className="text-xs text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        {allowPhoneEdit ? 'Lock' : 'Edit'}
                                    </button>
                                </div>
                                <Input
                                    {...form.register('phone')}
                                    disabled={!allowPhoneEdit}
                                    className={`${allowPhoneEdit ? 'bg-slate-50' : 'bg-slate-100'} border-slate-400 text-black`}
                                />
                                {form.formState.errors.phone && <p className="text-xs text-red-600 font-medium">{form.formState.errors.phone.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-black font-semibold text-sm">Email</Label>
                                    <button
                                        type="button"
                                        onClick={() => setAllowEmailEdit((state) => !state)}
                                        className="text-xs text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                        {allowEmailEdit ? 'Lock' : 'Edit'}
                                    </button>
                                </div>
                                <Input
                                    {...form.register('email')}
                                    disabled={!allowEmailEdit}
                                    placeholder="example@mail.com"
                                    className={`${allowEmailEdit ? 'bg-slate-50' : 'bg-slate-100'} border-slate-400 text-black`}
                                />
                                {form.formState.errors.email && <p className="text-xs text-red-600 font-medium">{form.formState.errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-black font-semibold text-sm">Course / Degree</Label>
                            <Input {...form.register('course')} className="bg-slate-50 border-slate-400 text-black" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-black font-semibold text-sm">Current Profession (Optional)</Label>
                            <Input {...form.register('profession')} className="bg-slate-50 border-slate-400 text-black" />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-start space-x-3 bg-blue-50 p-4 rounded-xl border border-blue-200">
                            <Checkbox
                                id="isDiaspora"
                                checked={form.watch('isDiaspora')}
                                onCheckedChange={(checked) => form.setValue('isDiaspora', Boolean(checked))}
                                className="mt-1 h-5 w-5 border-blue-400 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700"
                            />
                            <div className="space-y-1">
                                <Label htmlFor="isDiaspora" className="font-bold text-base text-black cursor-pointer">
                                    I currently reside outside Rwanda (Diaspora)
                                </Label>
                                <p className="text-xs text-slate-600">Select this if you live abroad.</p>
                            </div>
                        </div>

                        {!form.watch('isDiaspora') && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-black font-semibold text-sm">Residence Province</Label>
                                    <Select value={form.watch('residenceProvince') || ''} onValueChange={handleProvinceChange}>
                                        <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                            <SelectValue placeholder="Select province" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white">
                                            {provinces.map((province) => (
                                                <SelectItem className="text-black" key={province.id} value={province.name}>{province.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-black font-semibold text-sm">Residence District</Label>
                                        <Select
                                            value={form.watch('residenceDistrict') || ''}
                                            onValueChange={handleDistrictChange}
                                            disabled={!form.watch('residenceProvince')}
                                        >
                                            <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                                <SelectValue placeholder="Select district" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {districts.map((district) => (
                                                    <SelectItem className="text-black" key={district.id} value={district.name}>{district.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {form.formState.errors.residenceDistrict && <p className="text-xs text-red-600 font-medium">{form.formState.errors.residenceDistrict.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-black font-semibold text-sm">Residence Sector</Label>
                                        <Select
                                            value={form.watch('residenceSector') || ''}
                                            onValueChange={(value) => form.setValue('residenceSector', value, { shouldValidate: true })}
                                            disabled={!form.watch('residenceDistrict')}
                                        >
                                            <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                                <SelectValue placeholder="Select sector" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {sectors.map((sector) => (
                                                    <SelectItem className="text-black" key={sector.id} value={sector.name}>{sector.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {form.watch('residenceProvince') && (
                                    <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
                                                <Users className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <Label className="text-black font-bold text-base block">Graduate Small Group</Label>
                                                <p className="text-xs text-slate-500">Choose your current or nearby graduate cell.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="attendGraduateCell"
                                                checked={form.watch('attendGraduateCell')}
                                                onCheckedChange={(checked) => form.setValue('attendGraduateCell', Boolean(checked))}
                                                className="border-blue-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                            />
                                            <Label htmlFor="attendGraduateCell" className="text-slate-900 cursor-pointer font-medium text-sm">
                                                I currently attend a graduate cell
                                            </Label>
                                        </div>

                                        <div className="space-y-2 pl-1">
                                            <Label className="text-black font-semibold text-sm">
                                                {form.watch('attendGraduateCell')
                                                    ? 'Select your current graduate cell'
                                                    : 'Search for a nearby graduate cell'}
                                            </Label>
                                            <Select
                                                onValueChange={(value) => {
                                                    if (value === 'no_cell_nearby') {
                                                        form.setValue('graduateGroupId', '');
                                                        form.setValue('noCellAvailable', true);
                                                    } else {
                                                        form.setValue('graduateGroupId', value);
                                                        form.setValue('noCellAvailable', false);
                                                    }
                                                }}
                                                value={form.watch('noCellAvailable') ? 'no_cell_nearby' : (form.watch('graduateGroupId') || '')}
                                            >
                                                <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                                    <SelectValue placeholder="Select Graduate Cell" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    {graduateCells.length > 0 ? (
                                                        <>
                                                            {graduateCells.map((cell) => (
                                                                <SelectItem className="text-black" key={cell.id} value={cell.id.toString()}>
                                                                    {cell.name}
                                                                </SelectItem>
                                                            ))}
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <SelectItem value="no_cell_nearby" className="text-black font-bold bg-amber-50">
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

                                            {form.watch('noCellAvailable') && (
                                                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                    We noted there is no nearby cell for you. Please keep in touch with us so we can help you connect.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: MINISTRY ENGAGEMENT */}
                {step === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center space-y-2 mb-8">
                            <h3 className="text-xl font-bold text-black">Ministry Engagement</h3>
                            <p className="text-slate-600">Discover where you can serve and make an impact.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1">
                                <Label className="text-black font-bold text-xl flex items-center gap-2">
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
                                    const textColorClass = pillar.color.replace('bg-', 'text-');
                                    const bgOpacityClass = pillar.color.replace('bg-', 'bg-').replace('600', '100');

                                    return (
                                        <div
                                            key={pillar.id}
                                            onClick={() => {
                                                form.setValue("servingPillars", [pillar.id], { shouldValidate: true });
                                            }}
                                            className={`relative group p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md ${isSelected
                                                ? `border-blue-600 bg-blue-50/50 shadow-blue-100`
                                                : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className={`p-3 rounded-xl transition-colors ${isSelected
                                                    ? `${pillar.color} text-white`
                                                    : `${bgOpacityClass} ${textColorClass} group-hover:bg-opacity-20`
                                                    }`}>
                                                    <pillar.icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label className={`font-bold text-lg cursor-pointer ${isSelected ? 'text-black' : 'text-slate-900'}`}>
                                                            {pillar.title}
                                                        </Label>
                                                        {isSelected && (
                                                            <div className="h-4 w-4 rounded-full bg-blue-600 shadow-sm animate-in zoom-in" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-black font-medium opacity-100">
                                                        {pillar.purpose}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {form.formState.errors.servingPillars && (
                                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {form.formState.errors.servingPillars.message}
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {/* STEP 5: FINANCIAL SUPPORT & AGREEMENT */}
                {step === 5 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center space-y-2 mb-8">
                            <h3 className="text-xl font-bold text-black">Partner With Us</h3>
                            <p className="text-slate-600">Your support helps us continue our mission and reach more lives.</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Option 1: Want to Support */}
                            <div
                                onClick={() => form.setValue("supportStatus", "want_to_support", { shouldValidate: true })}
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
                                            <Label className="font-bold text-lg text-black cursor-pointer">
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
                                onClick={() => form.setValue("supportStatus", "already_supporting", { shouldValidate: true })}
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
                                            <Label className="font-bold text-lg text-black cursor-pointer">
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
                                onClick={() => form.setValue("supportStatus", "later", { shouldValidate: true })}
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
                                            <Label className="font-bold text-lg text-black cursor-pointer">
                                                I'll decide later
                                            </Label>
                                            {form.watch("supportStatus") === "later" && (
                                                <div className="h-4 w-4 rounded-full bg-slate-600 shadow-sm animate-in zoom-in" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">You can always partner with us in the future.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {(form.watch("supportStatus") === "want_to_support" || form.watch("supportStatus") === "already_supporting") && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5 animate-in slide-in-from-top-4 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-black font-semibold text-sm">Frequency</Label>
                                        <Select
                                            onValueChange={(val) => form.setValue("supportFrequency", val as any)}
                                            value={form.watch("supportFrequency")}
                                        >
                                            <SelectTrigger className="bg-slate-50 border-slate-400 text-black data-[placeholder]:text-black">
                                                <SelectValue placeholder="Select Frequency" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem className="text-black" value="monthly">Monthly</SelectItem>
                                                <SelectItem className="text-black" value="half_year">Half Yearly</SelectItem>
                                                <SelectItem className="text-black" value="full_year">Annually</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-black font-semibold text-sm">Commitment Amount</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                {...form.register("supportAmount")}
                                                placeholder="Amount in RWF"
                                                className="pl-9 bg-slate-50 border-slate-400 text-black"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="enableReminder"
                                        checked={form.watch("enableReminder")}
                                        onCheckedChange={(c) => form.setValue("enableReminder", c as boolean)}
                                        className="h-5 w-5 border-blue-400 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700"
                                    />
                                    <Label htmlFor="enableReminder" className="text-sm text-slate-900 cursor-pointer">
                                        Enable reminders based on your frequency
                                    </Label>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start space-x-3 bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-8 transition-colors">
                            <Checkbox
                                id="agreement"
                                checked={form.watch("agreement") || false}
                                onCheckedChange={(c) => form.setValue("agreement", c as boolean, { shouldValidate: true })}
                                className="mt-1 h-5 w-5 border-blue-400 data-[state=checked]:bg-blue-700 data-[state=checked]:border-blue-700"
                            />
                            <div className="space-y-1">
                                <Label htmlFor="agreement" className="font-bold text-base text-black cursor-pointer">
                                    I confirm these details are correct and belong to me.
                                </Label>
                                <p className="text-xs text-slate-600">
                                    I understand that this information will be used to complete my graduate profile.
                                </p>
                            </div>
                        </div>
                        {form.formState.errors.agreement && (
                            <p className="text-xs text-red-600 font-medium">{form.formState.errors.agreement.message}</p>
                        )}
                    </div>
                )}


                <div className="flex justify-between pt-2">
                    {step > 1 ? (
                        <Button type="button" variant="outline" onClick={prevStep} className="bg-black text-white hover:bg-slate-800 border-black transition-colors">
                            Back
                        </Button>
                    ) : (
                        <div />
                    )}

                    {step < 5 ? (
                        <Button type="button" onClick={nextStep}>
                            Continue
                        </Button>
                    ) : (
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <User className="mr-2 h-4 w-4" />
                                    Submit for Approval
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
