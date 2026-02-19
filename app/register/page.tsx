"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  graduateDetailsSchema,
  graduateResidenceSchema,
  identitySchema,
  registrationSchema,
  studentDetailsSchema,
  studentLocationSchema,
  type RegistrationPayload,
} from "@/app/api/validation/registration";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Sparkles,
  UserCheck,
  Globe,
} from "lucide-react";

type LocationOption = {
  id: string;
  name: string;
};

type RegistrationFormState = {
  type: "student" | "graduate";
  fullName: string;
  phone: string;
  email: string;
  university: string;
  course: string;
  yearOfStudy: string;
  smallGroup: string;
  ministryFocus: string;
  servingPillars: string[];
  location: {
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  graduationYear: string;
  isDiaspora: boolean;
  residence: {
    mode: "rwanda" | "diaspora";
    province: string;
    district: string;
    sector: string;
    country: string;
  };
};

const defaultFormState: RegistrationFormState = {
  type: "student",
  fullName: "",
  phone: "",
  email: "",
  university: "",
  course: "",
  yearOfStudy: "",
  smallGroup: "",
  ministryFocus: "",
  servingPillars: [],
  location: {
    province: "",
    district: "",
    sector: "",
    cell: "",
    village: "",
  },
  graduationYear: "",
  isDiaspora: false,
  residence: {
    mode: "rwanda",
    province: "",
    district: "",
    sector: "",
    country: "",
  },
};

const STEPS = [
  {
    id: 0,
    title: "Identity & Contact",
    description: "Tell us who you are so we can greet you by name.",
    icon: UserCheck,
  },
  {
    id: 1,
    title: "Faith & Formation",
    description: "Share your university journey and ministry heartbeat.",
    icon: Sparkles,
  },
  {
    id: 2,
    title: "Location",
    description: "Help us understand where you gather or reside.",
    icon: MapPin,
  },
];

const PILLARS = [
  "Worship",
  "Evangelism",
  "Discipleship",
  "Leadership",
  "Administration",
  "Finance",
  "Media",
  "Hospitality",
  "Prayer",
  "Counseling",
];

const YEAR_OPTIONS = ["1", "2", "3", "4", "5", "6"];

const pathKey = (issuePath: (string | number | symbol)[]) =>
  issuePath.map((segment) => segment.toString()).join(".");

type SafeResult = { success: true } | { success: false; error: z.ZodError<any> };

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegistrationFormState>(defaultFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [studentDistricts, setStudentDistricts] = useState<LocationOption[]>([]);
  const [studentSectors, setStudentSectors] = useState<LocationOption[]>([]);
  const [studentCells, setStudentCells] = useState<LocationOption[]>([]);
  const [studentVillages, setStudentVillages] = useState<LocationOption[]>([]);

  const [gradDistricts, setGradDistricts] = useState<LocationOption[]>([]);
  const [gradSectors, setGradSectors] = useState<LocationOption[]>([]);

  const [studentProvinceId, setStudentProvinceId] = useState<string>("");
  const [studentDistrictId, setStudentDistrictId] = useState<string>("");
  const [studentSectorId, setStudentSectorId] = useState<string>("");
  const [studentCellId, setStudentCellId] = useState<string>("");
  const [studentVillageId, setStudentVillageId] = useState<string>("");

  const [gradProvinceId, setGradProvinceId] = useState<string>("");
  const [gradDistrictId, setGradDistrictId] = useState<string>("");
  const [gradSectorId, setGradSectorId] = useState<string>("");

  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await fetch("/api/locations?type=provinces");
        if (!response.ok) throw new Error("Failed to load provinces");
        const data: LocationOption[] = await response.json();
        setProvinces(data);
      } catch (error) {
        console.error(error);
        setLocationError("Unable to load provinces. Please try again later.");
      }
    };

    loadProvinces();
  }, []);

  useEffect(() => {
    if (!studentProvinceId) {
      setStudentDistricts([]);
      setStudentSectors([]);
      setStudentCells([]);
      setStudentVillages([]);
      setStudentDistrictId("");
      setStudentSectorId("");
      setStudentCellId("");
      setStudentVillageId("");
      return;
    }
    setStudentDistrictId("");
    setStudentSectorId("");
    setStudentCellId("");
    setStudentVillageId("");
    fetchLocationChildren("districts", studentProvinceId, setStudentDistricts);
  }, [studentProvinceId]);

  useEffect(() => {
    if (!studentDistrictId) {
      setStudentSectors([]);
      setStudentCells([]);
      setStudentVillages([]);
      setStudentSectorId("");
      setStudentCellId("");
      setStudentVillageId("");
      return;
    }
    setStudentSectorId("");
    setStudentCellId("");
    setStudentVillageId("");
    fetchLocationChildren("sectors", studentDistrictId, setStudentSectors);
  }, [studentDistrictId]);

  useEffect(() => {
    if (!studentSectorId) {
      setStudentCells([]);
      setStudentVillages([]);
      setStudentCellId("");
      setStudentVillageId("");
      return;
    }
    setStudentCellId("");
    setStudentVillageId("");
    fetchLocationChildren("cells", studentSectorId, setStudentCells);
  }, [studentSectorId]);

  useEffect(() => {
    if (!studentCellId) {
      setStudentVillages([]);
      setStudentVillageId("");
      return;
    }
    setStudentVillageId("");
    fetchLocationChildren("villages", studentCellId, setStudentVillages);
  }, [studentCellId]);

  useEffect(() => {
    if (!gradProvinceId) {
      setGradDistricts([]);
      setGradSectors([]);
      setGradDistrictId("");
      setGradSectorId("");
      return;
    }
    setGradDistrictId("");
    setGradSectorId("");
    fetchLocationChildren("districts", gradProvinceId, setGradDistricts);
  }, [gradProvinceId]);

  useEffect(() => {
    if (!gradDistrictId) {
      setGradSectors([]);
      setGradSectorId("");
      return;
    }
    setGradSectorId("");
    fetchLocationChildren("sectors", gradDistrictId, setGradSectors);
  }, [gradDistrictId]);

  useEffect(() => {
    if (!Object.keys(touchedFields).length) return;
    const payload = buildPayload(formData);
    const validation = registrationSchema.safeParse(payload);

    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(touchedFields).forEach((key) => delete next[key]);

      if (!validation.success) {
        validation.error.issues.forEach((issue) => {
          const key = pathKey(issue.path);
          if (touchedFields[key]) {
            next[key] = issue.message;
          }
        });
      }

      return next;
    });
  }, [formData, touchedFields]);

  const fetchLocationChildren = async (
    type: string,
    parentId: string,
    setter: (data: LocationOption[]) => void
  ) => {
    if (!parentId) {
      setter([]);
      return;
    }
    try {
      const response = await fetch(`/api/locations?type=${type}&parentId=${parentId}`);
      if (!response.ok) throw new Error("Failed to fetch locations");
      const data: LocationOption[] = await response.json();
      setter(data);
    } catch (error) {
      console.error(error);
      setLocationError("Location data is currently unavailable.");
    }
  };

  const markTouched = (key: string) =>
    setTouchedFields((prev) => ({
      ...prev,
      [key]: true,
    }));

  const handleTypeChange = (value: "student" | "graduate") => {
    setFormData((prev) => ({
      ...prev,
      type: value,
      servingPillars: [],
      location:
        value === "student"
          ? prev.location
          : { province: "", district: "", sector: "", cell: "", village: "" },
      residence:
        value === "graduate"
          ? prev.residence
          : { mode: "rwanda", province: "", district: "", sector: "", country: "" },
    }));
    setCurrentStep(0);
    setErrors({});
    setTouchedFields({});
  };

  const handlePillarToggle = (pillar: string, checked: boolean) => {
    setFormData((prev) => {
      const nextPillars = checked
        ? Array.from(new Set([...prev.servingPillars, pillar]))
        : prev.servingPillars.filter((item) => item !== pillar);
      return {
        ...prev,
        servingPillars: nextPillars,
      };
    });
    markTouched("servingPillars");
  };

  const handleDiasporaToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isDiaspora: checked,
      residence: checked
        ? { mode: "diaspora", province: "", district: "", sector: "", country: prev.residence.country }
        : { mode: "rwanda", province: prev.residence.province, district: prev.residence.district, sector: prev.residence.sector, country: "" },
    }));
    if (checked) {
      setGradProvinceId("");
      setGradDistrictId("");
      setGradSectorId("");
    }
    markTouched("isDiaspora");
  };

  const buildPayload = (data: RegistrationFormState): RegistrationPayload => {
    const base = {
      type: data.type,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      email: data.email.trim() ? data.email.trim().toLowerCase() : undefined,
    } as RegistrationPayload;

    if (data.type === "student") {
      return {
        ...base,
        type: "student",
        university: data.university.trim(),
        course: data.course.trim() || undefined,
        yearOfStudy: data.yearOfStudy.trim() || undefined,
        smallGroup: data.smallGroup.trim(),
        ministryFocus: data.ministryFocus.trim() || undefined,
        servingPillars: data.servingPillars,
        location: {
          province: data.location.province.trim(),
          district: data.location.district.trim(),
          sector: data.location.sector.trim(),
          cell: data.location.cell.trim(),
          village: data.location.village.trim(),
        },
      } satisfies RegistrationPayload;
    }

    return {
      ...base,
      type: "graduate",
      university: data.university.trim() || undefined,
      course: data.course.trim() || undefined,
      graduationYear: data.graduationYear.trim() || undefined,
      ministryFocus: data.ministryFocus.trim() || undefined,
      servingPillars: data.servingPillars,
      isDiaspora: data.isDiaspora,
      residence: data.isDiaspora
        ? {
            mode: "diaspora",
            country: data.residence.country.trim(),
          }
        : {
            mode: "rwanda",
            province: data.residence.province.trim(),
            district: data.residence.district.trim(),
            sector: data.residence.sector.trim(),
          },
    } satisfies RegistrationPayload;
  };

  const applyValidationResult = (result: SafeResult, scopedKeys: string[]) => {
    if (result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        scopedKeys.forEach((key) => delete next[key]);
        return next;
      });
      setTouchedFields((prev) => ({
        ...prev,
        ...scopedKeys.reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, {}),
      }));
      return true;
    }

    setTouchedFields((prev) => ({
      ...prev,
      ...scopedKeys.reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = true;
        return acc;
      }, {}),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      scopedKeys.forEach((key) => delete next[key]);
      result.error.issues.forEach((issue) => {
        next[pathKey(issue.path)] = issue.message;
      });
      return next;
    });
    return false;
  };

  const validateStep = () => {
    const payload = buildPayload(formData);
    if (currentStep === 0) {
      const result = identitySchema.safeParse({
        type: payload.type,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
      });
      return applyValidationResult(result, ["type", "fullName", "phone", "email"]);
    }

    if (currentStep === 1) {
      if (payload.type === "student") {
        const result = studentDetailsSchema.safeParse({
          university: payload.university,
          course: payload.course,
          yearOfStudy: payload.yearOfStudy,
          smallGroup: payload.smallGroup,
          ministryFocus: payload.ministryFocus,
          servingPillars: payload.servingPillars,
        });
        return applyValidationResult(result, [
          "university",
          "course",
          "yearOfStudy",
          "smallGroup",
          "ministryFocus",
          "servingPillars",
        ]);
      }

      const result = graduateDetailsSchema.safeParse({
        university: payload.university,
        course: payload.course,
        graduationYear: payload.graduationYear,
        ministryFocus: payload.ministryFocus,
        servingPillars: payload.servingPillars,
        isDiaspora: payload.isDiaspora,
      });
      return applyValidationResult(result, [
        "university",
        "course",
        "graduationYear",
        "ministryFocus",
        "servingPillars",
        "isDiaspora",
      ]);
    }

    if (payload.type === "student") {
      const result = studentLocationSchema.safeParse(payload.location);
      return applyValidationResult(result, [
        "location.province",
        "location.district",
        "location.sector",
        "location.cell",
        "location.village",
      ]);
    }

    const result = graduateResidenceSchema.safeParse(payload.residence);
    const keys = payload.isDiaspora
      ? ["residence.country"]
      : ["residence.province", "residence.district", "residence.sector"];
    return applyValidationResult(result, keys);
  };

  const handleNext = () => {
    const isValid = validateStep();
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep === 0) return;
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    const stepValid = validateStep();
    if (!stepValid) return;

    const payload = buildPayload(formData);
    const result = registrationSchema.safeParse(payload);
    if (!result.success) {
      setErrors((prev) => {
        const next = { ...prev };
        result.error.issues.forEach((issue) => {
          next[pathKey(issue.path)] = issue.message;
        });
        return next;
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitState("idle");
      setSubmitMessage(null);
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.details || "Unable to submit request");
      }

      const data = await response.json();
      setSubmitState("success");
      setSubmitMessage(
        `Thanks for registering! Your gatekeeper token is ${data.token}. We will reach out once it's approved.`
      );
      setFormData(defaultFormState);
      setCurrentStep(0);
      setTouchedFields({});
      setErrors({});
      setStudentProvinceId("");
      setStudentDistrictId("");
      setStudentSectorId("");
      setStudentCellId("");
      setGradProvinceId("");
      setGradDistrictId("");
    } catch (error) {
      console.error(error);
      setSubmitState("error");
      setSubmitMessage(
        error instanceof Error ? error.message : "We couldn't save your registration."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  const getError = (key: string) => errors[key];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-920 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="text-center space-y-4">
          <p className="tracking-[0.3em] text-xs uppercase text-blue-300">Gatekeeper Edition</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">
            Ministry Self-Registration
          </h1>
          <p className="text-base text-slate-300 max-w-2xl mx-auto">
            Step into the ministry story with a guided, secure flow that keeps our data pristine
            while honoring your journey.
          </p>
        </div>

        <div className="mt-10 rounded-[32px] border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl">
          <Stepper currentStep={currentStep} />

          <div className="p-6 sm:p-10 space-y-6">
            {submitState !== "idle" && submitMessage && (
              <Alert variant={submitState === "success" ? "default" : "destructive"}>
                <AlertTitle>
                  {submitState === "success" ? "Registration request received" : "Something went wrong"}
                </AlertTitle>
                <AlertDescription>{submitMessage}</AlertDescription>
              </Alert>
            )}

            {currentStep === 0 && (
              <IdentityStep
                data={formData}
                errors={errors}
                onChange={(updates) => {
                  setFormData((prev) => ({ ...prev, ...updates }));
                  Object.keys(updates).forEach((key) => markTouched(key));
                }}
                onTypeChange={handleTypeChange}
              />
            )}

            {currentStep === 1 && (
              <EducationStep
                data={formData}
                errors={errors}
                onFieldChange={(key, value) => {
                  setFormData((prev) => ({ ...prev, [key]: value }));
                  markTouched(key);
                }}
                onPillarToggle={handlePillarToggle}
                onDiasporaToggle={handleDiasporaToggle}
              />
            )}

            {currentStep === 2 && (
              <LocationStep
                data={formData}
                errors={errors}
                provinces={provinces}
                student={{
                  selectedProvinceId: studentProvinceId,
                  selectedDistrictId: studentDistrictId,
                  selectedSectorId: studentSectorId,
                  selectedCellId: studentCellId,
                  selectedVillageId: studentVillageId,
                  districts: studentDistricts,
                  sectors: studentSectors,
                  cells: studentCells,
                  villages: studentVillages,
                  setProvinceId: setStudentProvinceId,
                  setDistrictId: setStudentDistrictId,
                  setSectorId: setStudentSectorId,
                  setCellId: setStudentCellId,
                  setVillageId: setStudentVillageId,
                }}
                graduate={{
                  selectedProvinceId: gradProvinceId,
                  selectedDistrictId: gradDistrictId,
                  selectedSectorId: gradSectorId,
                  districts: gradDistricts,
                  sectors: gradSectors,
                  setProvinceId: setGradProvinceId,
                  setDistrictId: setGradDistrictId,
                  setSectorId: setGradSectorId,
                }}
                onStudentLocationChange={(updates, touch = true) => {
                  setFormData((prev) => ({
                    ...prev,
                    location: { ...prev.location, ...updates },
                  }));
                  const keys = Object.keys(updates).map((key) => `location.${key}`);
                  if (touch) {
                    keys.forEach((key) => markTouched(key));
                  } else {
                    setTouchedFields((prev) => {
                      const next = { ...prev };
                      keys.forEach((key) => delete next[key]);
                      return next;
                    });
                    setErrors((prev) => {
                      const next = { ...prev };
                      keys.forEach((key) => delete next[key]);
                      return next;
                    });
                  }
                }}
                onGraduateLocationChange={(updates, touch = true) => {
                  setFormData((prev) => ({
                    ...prev,
                    residence: { ...prev.residence, ...updates },
                  }));
                  const keys = Object.keys(updates).map((key) => `residence.${key}`);
                  if (touch) {
                    keys.forEach((key) => markTouched(key));
                  } else {
                    setTouchedFields((prev) => {
                      const next = { ...prev };
                      keys.forEach((key) => delete next[key]);
                      return next;
                    });
                    setErrors((prev) => {
                      const next = { ...prev };
                      keys.forEach((key) => delete next[key]);
                      return next;
                    });
                  }
                }}
                locationError={locationError}
              />
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="justify-center"
              >
                Previous
              </Button>
              <div className="flex gap-3">
                {!isLastStep && (
                  <Button type="button" onClick={handleNext} className="gap-2">
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                )}
                {isLastStep && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    className="gap-2"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending
                      </>
                    ) : (
                      <>
                        Submit Registration
                        <CheckCircle2 className="size-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="grid gap-4 border-b border-white/10 px-6 py-6 sm:grid-cols-3">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === index;
        const isComplete = currentStep > index;
        return (
          <div
            key={step.id}
            className={cn(
              "flex items-start gap-4 rounded-2xl border px-4 py-3",
              isActive
                ? "border-blue-500/60 bg-blue-500/10"
                : "border-white/10 bg-white/5"
            )}
          >
            <div
              className={cn(
                "mt-1 flex size-10 items-center justify-center rounded-full",
                isComplete ? "bg-green-500/20" : isActive ? "bg-blue-500/30" : "bg-white/10"
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-xs text-slate-300">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type IdentityStepProps = {
  data: RegistrationFormState;
  errors: Record<string, string>;
  onChange: (updates: Partial<RegistrationFormState>) => void;
  onTypeChange: (value: "student" | "graduate") => void;
};

function IdentityStep({ data, errors, onChange, onTypeChange }: IdentityStepProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {["student", "graduate"].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onTypeChange(option as "student" | "graduate")}
            className={cn(
              "rounded-2xl border px-4 py-5 text-left transition",
              data.type === option
                ? "border-blue-400 bg-blue-500/10 text-white"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-white/30"
            )}
          >
            <p className="text-sm font-semibold capitalize">{option}</p>
            <p className="text-xs text-slate-300">
              {option === "student"
                ? "Currently pursuing studies and plugged into a campus group."
                : "Graduate continuing to serve from Rwanda or the diaspora."}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Full name"
          error={errors.fullName}
          input={
            <Input
              placeholder="e.g. Aline Umutoni"
              value={data.fullName}
              onChange={(event) => onChange({ fullName: event.target.value })}
            />
          }
        />
        <Field
          label="Phone number"
          error={errors.phone}
          input={
            <Input
              placeholder="e.g. +2507..."
              value={data.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
            />
          }
        />
      </div>
      <Field
        label="Email address (optional)"
        error={errors.email}
        input={
          <Input
            type="email"
            placeholder="shemail@domain.com"
            value={data.email}
            onChange={(event) => onChange({ email: event.target.value })}
          />
        }
      />
    </div>
  );
}

type EducationStepProps = {
  data: RegistrationFormState;
  errors: Record<string, string>;
  onFieldChange: (key: keyof RegistrationFormState, value: string) => void;
  onPillarToggle: (pillar: string, checked: boolean) => void;
  onDiasporaToggle: (checked: boolean) => void;
};

function EducationStep({
  data,
  errors,
  onFieldChange,
  onPillarToggle,
  onDiasporaToggle,
}: EducationStepProps) {
  const isStudent = data.type === "student";

  return (
    <div className="space-y-6">
      {isStudent ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="University / Campus"
            error={errors.university}
            input={
              <Input
                placeholder="University name"
                value={data.university}
                onChange={(event) => onFieldChange("university", event.target.value)}
              />
            }
          />
          <Field
            label="Small group / Connect family"
            error={errors.smallGroup}
            input={
              <Input
                placeholder="Grace small group"
                value={data.smallGroup}
                onChange={(event) => onFieldChange("smallGroup", event.target.value)}
              />
            }
          />
          <Field
            label="Course of study (optional)"
            error={errors.course}
            input={
              <Input
                placeholder="Computer Engineering"
                value={data.course}
                onChange={(event) => onFieldChange("course", event.target.value)}
              />
            }
          />
          <Field
            label="Year of study (optional)"
            error={errors.yearOfStudy}
            input={
              <Select
                value={data.yearOfStudy}
                onValueChange={(value) => onFieldChange("yearOfStudy", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose year" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      Year {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="University / Alumni family (optional)"
            error={errors.university}
            input={
              <Input
                placeholder="Former campus"
                value={data.university}
                onChange={(event) => onFieldChange("university", event.target.value)}
              />
            }
          />
          <Field
            label="Graduation year (optional)"
            error={errors.graduationYear}
            input={
              <Input
                placeholder="2024"
                value={data.graduationYear}
                onChange={(event) => onFieldChange("graduationYear", event.target.value)}
              />
            }
          />
        </div>
      )}

      <Field
        label="Where are you currently serving?"
        error={errors.ministryFocus}
        input={
          <Textarea
            placeholder="Share about your ministry, team or vision"
            value={data.ministryFocus}
            onChange={(event) => onFieldChange("ministryFocus", event.target.value)}
          />
        }
      />

      <div className="space-y-3">
        <Label>Serving pillars</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <label
              key={pillar}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2",
                data.servingPillars.includes(pillar)
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-white/10 bg-white/5"
              )}
            >
              <Checkbox
                checked={data.servingPillars.includes(pillar)}
                onCheckedChange={(checked) =>
                  onPillarToggle(pillar, Boolean(checked))
                }
              />
              <span className="text-sm">{pillar}</span>
            </label>
          ))}
        </div>
        {errors.servingPillars && (
          <p className="text-sm text-red-300">{errors.servingPillars}</p>
        )}
      </div>

      {data.type === "graduate" && (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Globe className="size-4" /> Currently living outside Rwanda
            </p>
            <p className="text-xs text-slate-300">Toggle on if you're serving from the diaspora.</p>
          </div>
          <DiasporaSwitch checked={data.isDiaspora} onCheckedChange={onDiasporaToggle} />
        </div>
      )}
    </div>
  );
}

type LocationStepProps = {
  data: RegistrationFormState;
  errors: Record<string, string>;
  provinces: LocationOption[];
  student: {
    selectedProvinceId: string;
    selectedDistrictId: string;
    selectedSectorId: string;
    selectedCellId: string;
    selectedVillageId: string;
    districts: LocationOption[];
    sectors: LocationOption[];
    cells: LocationOption[];
    villages: LocationOption[];
    setProvinceId: (id: string) => void;
    setDistrictId: (id: string) => void;
    setSectorId: (id: string) => void;
    setCellId: (id: string) => void;
    setVillageId: (id: string) => void;
  };
  graduate: {
    selectedProvinceId: string;
    selectedDistrictId: string;
    selectedSectorId: string;
    districts: LocationOption[];
    sectors: LocationOption[];
    setProvinceId: (id: string) => void;
    setDistrictId: (id: string) => void;
    setSectorId: (id: string) => void;
  };
  onStudentLocationChange: (updates: Partial<RegistrationFormState["location"]>, touch?: boolean) => void;
  onGraduateLocationChange: (
    updates: Partial<RegistrationFormState["residence"]>,
    touch?: boolean
  ) => void;
  locationError: string | null;
};

function LocationStep({
  data,
  errors,
  provinces,
  student,
  graduate,
  onStudentLocationChange,
  onGraduateLocationChange,
  locationError,
}: LocationStepProps) {
  const isStudent = data.type === "student";

  return (
    <div className="space-y-6">
      {locationError && (
        <Alert variant="destructive">
          <AlertTitle>Location data unavailable</AlertTitle>
          <AlertDescription>{locationError}</AlertDescription>
        </Alert>
      )}

      {isStudent ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Share your place of birth all the way to the village level.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <LocationSelect
              label="Province"
              selectedId={student.selectedProvinceId}
              options={provinces}
              placeholder="Select province"
              error={errors["location.province"]}
              onValueChange={(option) => {
                student.setProvinceId(option?.id || "");
                student.setDistrictId("");
                student.setSectorId("");
                student.setCellId("");
                student.setVillageId("");
                onStudentLocationChange({ province: option?.name || "" });
                onStudentLocationChange({ district: "", sector: "", cell: "", village: "" }, false);
              }}
            />
            <LocationSelect
              label="District"
              selectedId={student.selectedDistrictId}
              options={student.districts}
              placeholder="Select district"
              disabled={!student.districts.length}
              error={errors["location.district"]}
              onValueChange={(option) => {
                student.setDistrictId(option?.id || "");
                student.setSectorId("");
                student.setCellId("");
                student.setVillageId("");
                onStudentLocationChange({ district: option?.name || "" });
                onStudentLocationChange({ sector: "", cell: "", village: "" }, false);
              }}
            />
            <LocationSelect
              label="Sector"
              selectedId={student.selectedSectorId}
              options={student.sectors}
              placeholder="Select sector"
              disabled={!student.sectors.length}
              error={errors["location.sector"]}
              onValueChange={(option) => {
                student.setSectorId(option?.id || "");
                student.setCellId("");
                student.setVillageId("");
                onStudentLocationChange({ sector: option?.name || "" });
                onStudentLocationChange({ cell: "", village: "" }, false);
              }}
            />
            <LocationSelect
              label="Cell"
              selectedId={student.selectedCellId}
              options={student.cells}
              placeholder="Select cell"
              disabled={!student.cells.length}
              error={errors["location.cell"]}
              onValueChange={(option) => {
                student.setCellId(option?.id || "");
                student.setVillageId("");
                onStudentLocationChange({ cell: option?.name || "" });
                onStudentLocationChange({ village: "" }, false);
              }}
            />
            <LocationSelect
              label="Village"
              selectedId={student.selectedVillageId}
              options={student.villages}
              placeholder="Select village"
              disabled={!student.villages.length}
              error={errors["location.village"]}
              onValueChange={(option) => {
                student.setVillageId(option?.id || "");
                onStudentLocationChange({
                  village: option?.name || "",
                });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!data.isDiaspora ? (
            <div className="grid gap-4 sm:grid-cols-2">
            <LocationSelect
              label="Province"
              selectedId={graduate.selectedProvinceId}
              options={provinces}
              placeholder="Select province"
              error={errors["residence.province"]}
              onValueChange={(option) => {
                graduate.setProvinceId(option?.id || "");
                graduate.setDistrictId("");
                graduate.setSectorId("");
                onGraduateLocationChange({ province: option?.name || "" });
                onGraduateLocationChange({ district: "", sector: "" }, false);
              }}
            />
            <LocationSelect
              label="District"
              selectedId={graduate.selectedDistrictId}
              options={graduate.districts}
              placeholder="Select district"
              disabled={!graduate.districts.length}
              error={errors["residence.district"]}
              onValueChange={(option) => {
                graduate.setDistrictId(option?.id || "");
                graduate.setSectorId("");
                onGraduateLocationChange({ district: option?.name || "" });
                onGraduateLocationChange({ sector: "" }, false);
              }}
            />
            <LocationSelect
              label="Sector"
              selectedId={graduate.selectedSectorId}
              options={graduate.sectors}
              placeholder="Select sector"
              disabled={!graduate.sectors.length}
              error={errors["residence.sector"]}
              onValueChange={(option) => {
                graduate.setSectorId(option?.id || "");
                onGraduateLocationChange({ sector: option?.name || "" });
              }}
            />
          </div>
          ) : (
            <Field
              label="Country"
              error={errors["residence.country"]}
              input={
                <Input
                  placeholder="Country of residence"
                  value={data.residence.country}
                  onChange={(event) => onGraduateLocationChange({ country: event.target.value })}
                />
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

type LocationSelectProps = {
  label: string;
  selectedId: string;
  options: LocationOption[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  onValueChange: (option: LocationOption | null) => void;
};

function LocationSelect({
  label,
  selectedId,
  options,
  placeholder,
  disabled,
  error,
  onValueChange,
}: LocationSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={selectedId || undefined}
        onValueChange={(id) => {
          const option = options.find((item) => item.id === id);
          onValueChange(option ?? null);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}

type FieldProps = {
  label: string;
  input: React.ReactNode;
  error?: string;
};

function Field({ label, input, error }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {input}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}

type DiasporaSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

function DiasporaSwitch({ checked, onCheckedChange }: DiasporaSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-blue-500" : "bg-white/20"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white transition",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}
