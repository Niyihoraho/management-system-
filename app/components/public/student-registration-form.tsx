'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";



const studentSchema = z.object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number required"),
    universityId: z.string().min(1, "University is required"),
    yearOfStudy: z.string().min(1, "Year of study is required"),
    course: z.string().min(2, "Course is required"),
    province: z.string().min(1, "Province is required"),
    district: z.string().min(1, "District is required"),
    sector: z.string().min(1, "Sector is required"),

    agreement: z.boolean().refine((val) => val === true, {
        message: "You must agree to the terms",
    }),
    // Honeypot
    role_description: z.string().max(0).optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentRegistrationFormProps {
    invitationId: string;
    universities?: { id: number; name: string }[]; // Passed from server
    onSuccess?: () => void;
}

export function StudentRegistrationForm({ invitationId, universities = [], onSuccess }: StudentRegistrationFormProps) {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const form = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
        defaultValues: {
            yearOfStudy: '1',
            course: '',
            agreement: false
        }
    });


    // Duplicate Modal State
    const [duplicateModal, setDuplicateModal] = useState<{
        isOpen: boolean;
        message: string;
    }>({ isOpen: false, message: '' });

    // Validations to check before moving to next step
    const nextStep = async () => {
        let fieldsToValidate: (keyof StudentFormValues)[] = [];
        if (step === 1) fieldsToValidate = ["fullName", "email", "phone"];
        if (step === 2) fieldsToValidate = ["universityId", "yearOfStudy", "course"];
        if (step === 3) fieldsToValidate = ["province", "district", "sector"];

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) setStep((s) => s + 1);
    };

    const prevStep = () => setStep((s) => s - 1);

    const handleDuplicateReset = () => {
        setDuplicateModal({ isOpen: false, message: '' });
        form.reset();
        setStep(1);
    };

    const onSubmit = async (data: StudentFormValues) => {
        // Honeypot check
        if (data.role_description) {
            console.log("Bot detected");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post('/api/public/registration', {
                ...data,
                type: 'student',
                invitationLinkId: invitationId,
            });
            setSuccess(true);
            toast.success("Registration submitted successfully!");
            if (onSuccess) onSuccess();
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
                toast.error(error.response?.data?.message || "Submission failed. Please try again.");
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
                    <h2 className="text-2xl font-bold text-slate-900">Registration Received!</h2>
                    <p className="text-slate-600 max-w-md">
                        Thank you for registering. Your details have been submitted for verification.
                        We will contact you shortly once your application is approved.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-300">
            {/* Form Header */}
            <div className="mb-8 pb-6 border-b border-slate-100">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Student Registration</h2>
                        <p className="text-sm text-slate-500 mt-2 font-medium">Step {step} of 4</p>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                    <div
                        className="bg-blue-600 h-full transition-all duration-500 ease-out"
                        style={{ width: `${(step / 4) * 100}%` }}
                    />
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                {/* Honeypot Field - Hidden */}
                <input
                    type="text"
                    {...form.register("role_description")}
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    autoComplete="off"
                />

                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Full Name</Label>
                            <Input {...form.register("fullName")} placeholder="e.g. Jean Kevin" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.fullName && <p className="text-xs text-red-600 font-medium">{form.formState.errors.fullName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Phone Number</Label>
                            <Input {...form.register("phone")} placeholder="078..." className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.phone && <p className="text-xs text-red-600 font-medium">{form.formState.errors.phone.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Email Address</Label>
                            <Input {...form.register("email")} type="email" placeholder="name@example.com" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.email && <p className="text-xs text-red-600 font-medium">{form.formState.errors.email.message}</p>}
                        </div>
                    </div>
                )}

                {/* STEP 2: EDUCATION */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">University</Label>
                            <Select onValueChange={(val) => form.setValue("universityId", val)} value={form.watch("universityId")}>
                                <SelectTrigger className="bg-slate-100 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600">
                                    <SelectValue placeholder="Select University" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-300 text-slate-900 shadow-lg rounded-xl">
                                    {universities.map((uni) => (
                                        <SelectItem key={uni.id} value={uni.id.toString()}>{uni.name}</SelectItem>
                                    ))}
                                    <SelectItem value="other" className="text-blue-600 font-medium">Other / Not Listed</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.universityId && <p className="text-xs text-red-600 font-medium">{form.formState.errors.universityId.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Course of Study</Label>
                            <Input {...form.register("course")} placeholder="e.g. Computer Science" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.course && <p className="text-xs text-red-600 font-medium">{form.formState.errors.course.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Year of Study</Label>
                            <Select onValueChange={(val) => form.setValue("yearOfStudy", val)} value={form.watch("yearOfStudy")}>
                                <SelectTrigger className="bg-slate-100 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600">
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-300 text-slate-900 shadow-lg rounded-xl">
                                    <SelectItem value="1">Year 1</SelectItem>
                                    <SelectItem value="2">Year 2</SelectItem>
                                    <SelectItem value="3">Year 3</SelectItem>
                                    <SelectItem value="4">Year 4</SelectItem>
                                    <SelectItem value="5">Year 5</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.yearOfStudy && <p className="text-xs text-red-600 font-medium">{form.formState.errors.yearOfStudy.message}</p>}
                        </div>
                    </div>
                )}

                {/* STEP 3: ORIGIN & MINISTRY */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Place of Birth (Province)</Label>
                            <Select onValueChange={(val) => form.setValue("province", val)} value={form.watch("province")}>
                                <SelectTrigger className="bg-slate-100 border-slate-400 text-slate-900 focus:ring-blue-600/20 focus:border-blue-600">
                                    <SelectValue placeholder="Select Province" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-300 text-slate-900 shadow-lg rounded-xl">
                                    <SelectItem value="Kigali">Kigali City</SelectItem>
                                    <SelectItem value="North">Northern Province</SelectItem>
                                    <SelectItem value="South">Southern Province</SelectItem>
                                    <SelectItem value="East">Eastern Province</SelectItem>
                                    <SelectItem value="West">Western Province</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.province && <p className="text-xs text-red-600 font-medium">{form.formState.errors.province.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">District</Label>
                            <Input {...form.register("district")} placeholder="District name" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.district && <p className="text-xs text-red-600 font-medium">{form.formState.errors.district.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-semibold text-sm">Sector</Label>
                            <Input {...form.register("sector")} placeholder="Sector name" className="bg-slate-50 border-slate-400 text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-blue-600/20 focus-visible:border-blue-600 transition-all duration-200 hover:border-slate-400" />
                            {form.formState.errors.sector && <p className="text-xs text-red-600 font-medium">{form.formState.errors.sector.message}</p>}
                        </div>
                    </div>
                )}

                {/* STEP 4: AGREEMENT & SUBMIT */}
                {step === 4 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-300 space-y-4 text-center">
                            <h3 className="text-lg font-bold text-slate-900">Review & Submit</h3>
                            <p className="text-slate-700 text-sm leading-relaxed">
                                Please confirm that the information provided is accurate. This data will be treated with confidentiality.
                            </p>

                            <div className="flex items-start space-x-3 text-left bg-white p-4 rounded-lg border border-slate-300 shadow-sm">
                                <Checkbox
                                    id="agreement"
                                    checked={form.watch("agreement")}
                                    onCheckedChange={(c) => form.setValue("agreement", c as boolean)}
                                    className="mt-1 border-slate-400 data-[state=checked]:bg-blue-600"
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="agreement" className="font-medium text-slate-900 cursor-pointer">I Agree to the Terms</Label>
                                    <p className="text-xs text-slate-600">I hereby declare that the details furnished above are true and correct.</p>
                                    {form.formState.errors.agreement && <p className="text-xs text-red-600 font-medium">{form.formState.errors.agreement.message}</p>}
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide py-4 rounded-xl shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 transition-all transform active:scale-[0.99] text-base" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Submitting Application...
                                </>
                            ) : (
                                "Submit Student Registration"
                            )}
                        </Button>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 gap-4">
                    {step > 1 && (
                        <Button type="button" onClick={prevStep} variant="outline" className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl py-6 font-medium">
                            Back
                        </Button>
                    )}
                    {step < 4 && (
                        <Button type="button" onClick={nextStep} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-6 shadow-lg shadow-blue-600/10 font-medium">
                            Next Step
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
