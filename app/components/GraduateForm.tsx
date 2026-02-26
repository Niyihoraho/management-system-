'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Globe, GraduationCap, Sparkles } from 'lucide-react';

interface GraduateFormData {
  fullName: string;
  sex: string;
  phone: string;
  email: string;
  university: string;
  course: string;
  profession: string;
  graduationYear: string;
  residenceProvince: string;
  residenceDistrict: string;
  residenceSector: string;
  isDiaspora: boolean;
  servingPillars: string[];

  graduateGroupId: string;
  noCellAvailable: boolean;
  status: string;

  provinceId: string;
}

interface GraduateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GraduateFormData) => Promise<void>;
  initialData?: Partial<GraduateFormData>;
  title?: string;
  showNewCellBadge?: boolean;
  graduateGroups: { id: number; name: string; provinceId?: string | null }[];
  provinces: { id: string; name: string }[];
}

const initialFormData: GraduateFormData = {
  fullName: '',
  sex: 'Male',
  phone: '',
  email: '',
  university: '',
  course: '',
  profession: '',
  graduationYear: '',
  residenceProvince: '',
  residenceDistrict: '',
  residenceSector: '',
  isDiaspora: false,
  servingPillars: [],

  graduateGroupId: '',
  noCellAvailable: false,
  status: 'active',

  provinceId: '',
};

const servingPillarOptions = [
  { value: 'mobilization_integration', label: 'Mobilization & Integration' },
  { value: 'capacity_building', label: 'Capacity Building' },
  { value: 'event_planning_management', label: 'Event Planning & Management' },
  { value: 'graduate_cell_management', label: 'Graduate Cell Management' },
  { value: 'social_cohesion_promotion', label: 'Social Cohesion Promotion' },
  { value: 'prayer_promotion', label: 'Prayer Promotion' },
  { value: 'database_management', label: 'Database Management' },
];

export default function GraduateForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title = 'Add Graduate',
  showNewCellBadge = false,
  graduateGroups,
  provinces,
}: GraduateFormProps) {
  const [formData, setFormData] = useState<GraduateFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof GraduateFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const provinceOptions = useMemo<{ id: string; name: string }[]>(() => {
    if (Array.isArray(provinces)) return provinces;
    if (Array.isArray((provinces as any)?.provinces)) return (provinces as any).provinces;
    return [];
  }, [provinces]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialFormData,
          ...initialData,
          graduationYear: initialData.graduationYear?.toString() || '',
          graduateGroupId: initialData.graduateGroupId?.toString() || '',
          provinceId: initialData.provinceId?.toString() || '',
          servingPillars: initialData.servingPillars || [],
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GraduateFormData, string>> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.sex) {
      newErrors.sex = 'Sex is required';
    }

    if (!formData.isDiaspora && !formData.noCellAvailable && !formData.graduateGroupId) {
      newErrors.graduateGroupId = 'Graduate group is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
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

  const handleChange = (field: keyof GraduateFormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleServingPillarToggle = (pillar: string) => {
    setFormData(prev => {
      const current = prev.servingPillars;
      const updated = current.includes(pillar)
        ? current.filter(p => p !== pillar)
        : [...current, pillar];
      return { ...prev, servingPillars: updated };
    });
  };

  // Filter graduate groups based on selected province
  const filteredGraduateGroups = graduateGroups.filter(gg => {
    if (formData.provinceId && gg.provinceId) {
      return gg.provinceId === formData.provinceId;
    }
    return true;
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="top" className="h-full w-full max-w-none overflow-y-auto bg-muted/40 p-0">
        <div className="container mx-auto max-w-3xl py-8">
          <SheetHeader className="pb-8 text-center">
            <SheetTitle className="flex items-center justify-center gap-3 text-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              {title}
            </SheetTitle>
            <SheetDescription className="text-lg text-muted-foreground text-center">
              Fill in the graduate details below. Required fields are marked with an asterisk (*).
            </SheetDescription>
          </SheetHeader>

          <Card className="shadow-lg">
            <CardHeader className="pb-6 border-b mb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Graduate Information</h3>
                <p className="text-sm text-muted-foreground">Enter graduate&apos;s personal and academic details</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Personal Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        placeholder="Enter full name"
                        className={`h-11 ${errors.fullName ? 'border-destructive' : ''}`}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive">{errors.fullName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sex">Sex</Label>
                      <Select
                        value={formData.sex}
                        onValueChange={(value) => handleChange('sex', value)}
                      >
                        <SelectTrigger id="sex" className="h-11">
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.sex && (
                        <p className="text-sm text-destructive">{errors.sex}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="Enter phone number"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="Enter email address"
                        className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleChange('status', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="moved">Moved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Academic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="university">University</Label>
                      <Input
                        id="university"
                        value={formData.university}
                        onChange={(e) => handleChange('university', e.target.value)}
                        placeholder="Enter university name"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <Input
                        id="course"
                        value={formData.course}
                        onChange={(e) => handleChange('course', e.target.value)}
                        placeholder="Enter course of study"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profession">Profession</Label>
                      <Input
                        id="profession"
                        value={formData.profession}
                        onChange={(e) => handleChange('profession', e.target.value)}
                        placeholder="Enter profession"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="graduationYear">Graduation Year</Label>
                      <Input
                        id="graduationYear"
                        type="number"
                        min="1950"
                        max={new Date().getFullYear()}
                        value={formData.graduationYear}
                        onChange={(e) => handleChange('graduationYear', e.target.value)}
                        placeholder="Enter graduation year"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Group & Province/Region */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Group Assignment
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provinceId">Province</Label>
                      <Select
                        value={formData.provinceId}
                        onValueChange={(value) => {
                          handleChange('provinceId', value);
                          if (!formData.noCellAvailable) {
                            handleChange('graduateGroupId', '');
                          }
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinceOptions.map((province) => (
                            <SelectItem key={province.id} value={province.id.toString()}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>



                    <div className="space-y-2">
                      <Label htmlFor="graduateGroupId">
                        Graduate Group {(!formData.isDiaspora && !formData.noCellAvailable) && <span className="text-destructive">*</span>}
                      </Label>
                      <Select
                        value={formData.graduateGroupId}
                        onValueChange={(value) => {
                          handleChange('graduateGroupId', value);
                          if (value) handleChange('noCellAvailable', false);
                        }}
                        disabled={formData.noCellAvailable}
                      >
                        <SelectTrigger className={`h-11 ${errors.graduateGroupId ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Select graduate group" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredGraduateGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.graduateGroupId && (
                        <p className="text-sm text-destructive">{errors.graduateGroupId}</p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div className="space-y-1">
                          <Label htmlFor="noCellAvailable" className="cursor-pointer">No graduate cell nearby</Label>
                          <p className="text-xs text-muted-foreground">Use this when the graduate is new and not yet attached to a cell.</p>
                        </div>
                        <Checkbox
                          id="noCellAvailable"
                          checked={formData.noCellAvailable}
                          onCheckedChange={(checked) => {
                            const enabled = Boolean(checked);
                            handleChange('noCellAvailable', enabled);
                            if (enabled) {
                              handleChange('graduateGroupId', '');
                            }
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cell Membership: {formData.noCellAvailable ? 'New' : formData.graduateGroupId ? 'Member' : 'New'}
                      </div>
                      {showNewCellBadge && (
                        <div className="inline-flex items-center gap-1 text-xs rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1">
                          <Sparkles className="w-3 h-3" />
                          New (auto-clears after 15 days)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Residence (Up to Sector) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Current Residence (Up to Sector)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="residenceProvince">Province</Label>
                      <Input
                        id="residenceProvince"
                        value={formData.residenceProvince}
                        onChange={(e) => handleChange('residenceProvince', e.target.value)}
                        placeholder="Enter province"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="residenceDistrict">District</Label>
                      <Input
                        id="residenceDistrict"
                        value={formData.residenceDistrict}
                        onChange={(e) => handleChange('residenceDistrict', e.target.value)}
                        placeholder="Enter district"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="residenceSector">Sector</Label>
                      <Input
                        id="residenceSector"
                        value={formData.residenceSector}
                        onChange={(e) => handleChange('residenceSector', e.target.value)}
                        placeholder="Enter sector"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>

                {/* Engagement */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Engagement & Support
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isDiaspora"
                        checked={formData.isDiaspora}
                        onCheckedChange={(checked) => handleChange('isDiaspora', checked as boolean)}
                      />
                      <Label htmlFor="isDiaspora" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="w-4 h-4 text-blue-500" />
                        Currently in Diaspora
                      </Label>
                    </div>



                    <div className="space-y-2">
                      <Label>Serving Pillars</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {servingPillarOptions.map((pillar) => (
                          <div key={pillar.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`pillar-${pillar.value}`}
                              checked={formData.servingPillars.includes(pillar.value)}
                              onCheckedChange={() => handleServingPillarToggle(pillar.value)}
                            />
                            <Label htmlFor={`pillar-${pillar.value}`} className="text-sm cursor-pointer">
                              {pillar.label}
                            </Label>
                          </div>
                        ))}
                      </div>
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
                      'Save Graduate'
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
