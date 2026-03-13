"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { User, Phone, Mail, GraduationCap, Building2, MapPin, Users, BookOpen, Calendar, Plus, Loader2 } from "lucide-react"
import { useUserScope } from "@/hooks/use-user-scope"
import axios from "axios"

interface Region {
  id: number;
  name: string;
}

interface University {
  id: number;
  name: string;
  regionId: number;
}

interface SmallGroup {
  id: number;
  name: string;
  universityId: number;
}

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  title: string;
  initialData?: any;
  universities: University[];
  smallGroups: SmallGroup[];
  regions: Region[];
}

export function StudentForm({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData,
  universities,
  smallGroups,
  regions
}: StudentFormProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [formData, setFormData] = React.useState({
    fullName: "",
    sex: "Male",
    phone: "",
    email: "",
    universityId: "",
    smallGroupId: "",
    course: "",
    yearOfStudy: "",
    placeOfBirthProvince: "",
    placeOfBirthDistrict: "",
    placeOfBirthSector: "",
    status: "active",
    regionId: "",
  })

  // Options states
  const [provinces, setProvinces] = React.useState<{ id: string, name: string }[]>([])
  const [districts, setDistricts] = React.useState<{ id: string, name: string }[]>([])
  const [sectors, setSectors] = React.useState<{ id: string, name: string }[]>([])

  // Selected ID states for cascading locations
  const [selectedProvinceId, setSelectedProvinceId] = React.useState("")
  const [selectedDistrictId, setSelectedDistrictId] = React.useState("")
  const [selectedSectorId, setSelectedSectorId] = React.useState("")

  // Fetch provinces on mount
  React.useEffect(() => {
    let mounted = true;
    axios.get('/api/locations?type=provinces').then(r => {
      if (mounted) {
        setProvinces(Array.isArray(r.data) ? r.data : []);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const fetchDistricts = async (provinceId: string) => {
    try {
      const res = await axios.get(`/api/locations?type=districts&parentId=${provinceId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch { return []; }
  };

  const fetchSectors = async (districtId: string) => {
    try {
      const res = await axios.get(`/api/locations?type=sectors&parentId=${districtId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch { return []; }
  };

  // Pre-fill location selectors on edit
  const locationLoadedRef = React.useRef(false);

  React.useEffect(() => {
    // Reset the ref when the form closes or initialData changes
    if (!isOpen) {
      locationLoadedRef.current = false;
      return;
    }
  }, [isOpen, initialData]);

  React.useEffect(() => {
    const loadLocations = async () => {
      if (!isOpen || provinces.length === 0 || locationLoadedRef.current) return;
      locationLoadedRef.current = true;

      if (initialData?.placeOfBirthProvince) {
        const provName = initialData.placeOfBirthProvince.trim().toLowerCase();
        const matchedProvince = provinces.find(x => x.name.trim().toLowerCase() === provName);

        if (matchedProvince) {
          // Found a real API match — use its id for cascading fetches
          setSelectedProvinceId(matchedProvince.id);

          const fetchedDistricts = await fetchDistricts(matchedProvince.id);
          setDistricts(fetchedDistricts);

          if (initialData.placeOfBirthDistrict) {
            const distName = initialData.placeOfBirthDistrict.trim().toLowerCase();
            const matchedDistrict = fetchedDistricts.find((x: any) => x.name.trim().toLowerCase() === distName);

            if (matchedDistrict) {
              setSelectedDistrictId(matchedDistrict.id);

              const fetchedSectors = await fetchSectors(matchedDistrict.id);
              setSectors(fetchedSectors);

              if (initialData.placeOfBirthSector) {
                const secName = initialData.placeOfBirthSector.trim().toLowerCase();
                const matchedSector = fetchedSectors.find((x: any) => x.name.trim().toLowerCase() === secName);
                if (matchedSector) {
                  console.log('Found matching sector:', matchedSector);
                  setSelectedSectorId(matchedSector.id);
                } else {
                  console.log('No matching sector found for', secName, 'adding synthetic');
                  // Sector name doesn't match — add as synthetic entry so it shows in the dropdown
                  const synSector = { id: `syn_${initialData.placeOfBirthSector}`, name: initialData.placeOfBirthSector };
                  setSectors(prev => [...prev, synSector]);
                  setSelectedSectorId(synSector.id);
                }
              }
            } else {
              console.log('No matching district found for', distName, 'adding synthetic');
              // District name doesn't match — add as synthetic entry
              const synDistrict = { id: `syn_${initialData.placeOfBirthDistrict}`, name: initialData.placeOfBirthDistrict };
              setDistricts(prev => [...prev, synDistrict]);
              setSelectedDistrictId(synDistrict.id);

              // Can't cascade further with a synthetic id, but show sector if available
              if (initialData.placeOfBirthSector) {
                const synSector = { id: `syn_${initialData.placeOfBirthSector}`, name: initialData.placeOfBirthSector };
                setSectors([synSector]);
                setSelectedSectorId(synSector.id);
              }
            }
          }
        } else {
          console.log('No matching province found for', provName, 'adding synthetic');
          // Province doesn't match API data — show stored values as synthetic entries
          const synProvince = { id: `syn_${initialData.placeOfBirthProvince}`, name: initialData.placeOfBirthProvince };
          setProvinces(prev => [...prev, synProvince]);
          setSelectedProvinceId(synProvince.id);

          if (initialData.placeOfBirthDistrict) {
            const synDistrict = { id: `syn_${initialData.placeOfBirthDistrict}`, name: initialData.placeOfBirthDistrict };
            setDistricts([synDistrict]);
            setSelectedDistrictId(synDistrict.id);
          }
          if (initialData.placeOfBirthSector) {
            const synSector = { id: `syn_${initialData.placeOfBirthSector}`, name: initialData.placeOfBirthSector };
            setSectors([synSector]);
            setSelectedSectorId(synSector.id);
          }
        }
      } else {
        setSelectedProvinceId("");
        setSelectedDistrictId("");
        setSelectedSectorId("");
        setDistricts([]);
        setSectors([]);
      }
    };
    loadLocations();
  }, [isOpen, initialData, provinces]);

  // Get user scope for pre-selected fields
  const { userScope, isLoading: scopeLoading } = useUserScope()

  // Determine which fields should be visible based on user scope
  const visibleFields = React.useMemo(() => {
    if (!userScope || scopeLoading) return { region: true, university: true, smallGroup: true }

    return {
      region: userScope.scope === 'superadmin' || userScope.scope === 'national',
      university: userScope.scope === 'superadmin' || userScope.scope === 'national' || userScope.scope === 'region',
      smallGroup: userScope.scope === 'superadmin' || userScope.scope === 'national' || userScope.scope === 'region' || userScope.scope === 'university'
    }
  }, [userScope, scopeLoading])

  // Initialize form data when modal opens or initialData changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          fullName: initialData.fullName || "",
          sex: initialData.sex || "Male",
          phone: initialData.phone || "",
          email: initialData.email || "",
          universityId: initialData.universityId?.toString() || "",
          smallGroupId: initialData.smallGroupId?.toString() || "",
          course: initialData.course || "",
          yearOfStudy: initialData.yearOfStudy?.toString() || "",
          placeOfBirthProvince: initialData.placeOfBirthProvince || "",
          placeOfBirthDistrict: initialData.placeOfBirthDistrict || "",
          placeOfBirthSector: initialData.placeOfBirthSector || "",
          status: initialData.status || "active",
          regionId: initialData.regionId?.toString() || "",
        })
      } else {
        // Reset form for new student
        const defaults: any = {
          fullName: "",
          sex: "Male",
          phone: "",
          email: "",
          course: "",
          yearOfStudy: "",
          placeOfBirthProvince: "",
          placeOfBirthDistrict: "",
          placeOfBirthSector: "",
          status: "active",
          // Use scope defaults if available and creating new
          regionId: userScope?.region?.id?.toString() || "",
          universityId: userScope?.university?.id?.toString() || "",
          smallGroupId: userScope?.smallGroup?.id?.toString() || "",
        }
        setFormData(defaults)
      }
      setErrors({})
    }
  }, [isOpen, initialData, userScope])

  // Filter universities by selected region
  const filteredUniversities = React.useMemo(() => {
    if (!formData.regionId) return [];
    return universities.filter(u => u.regionId === Number(formData.regionId));
  }, [formData.regionId, universities]);

  // Filter small groups by selected university
  const filteredSmallGroups = React.useMemo(() => {
    if (!formData.universityId) return [];
    return smallGroups.filter(g => g.universityId === Number(formData.universityId));
  }, [formData.universityId, smallGroups]);

  // Reset dependent fields when parent changes
  React.useEffect(() => {
    if (formData.regionId && !filteredUniversities.find(u => u.id === Number(formData.universityId))) {
      setFormData(prev => ({ ...prev, universityId: "", smallGroupId: "" }));
    }
  }, [formData.regionId, filteredUniversities]);

  React.useEffect(() => {
    if (formData.universityId && !filteredSmallGroups.find(g => g.id === Number(formData.smallGroupId))) {
      setFormData(prev => ({ ...prev, smallGroupId: "" }));
    }
  }, [formData.universityId, filteredSmallGroups]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }))
    }
  }

  const handleProvinceChange = async (val: string) => {
    const p = provinces.find(x => x.id === val);
    setSelectedProvinceId(val);
    setSelectedDistrictId("");
    setSelectedSectorId("");
    setDistricts([]);
    setSectors([]);
    handleInputChange("placeOfBirthProvince", p?.name || "");
    handleInputChange("placeOfBirthDistrict", "");
    handleInputChange("placeOfBirthSector", "");

    if (val) {
      const d = await fetchDistricts(val);
      setDistricts(d);
    }
  };

  const handleDistrictChange = async (val: string) => {
    const d = districts.find(x => x.id === val);
    setSelectedDistrictId(val);
    setSelectedSectorId("");
    setSectors([]);
    handleInputChange("placeOfBirthDistrict", d?.name || "");
    handleInputChange("placeOfBirthSector", "");

    if (val) {
      const s = await fetchSectors(val);
      setSectors(s);
    }
  };

  const handleSectorChange = (val: string) => {
    const s = sectors.find(x => x.id === val);
    setSelectedSectorId(val);
    handleInputChange("placeOfBirthSector", s?.name || "");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!formData.sex) {
      newErrors.sex = "Sex is required"
    }

    // Only validate visible fields
    if (visibleFields.university && !formData.universityId) {
      newErrors.universityId = "University is required"
    }

    if (visibleFields.smallGroup && !formData.smallGroupId) {
      newErrors.smallGroupId = "Small group is required"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await onSubmit(formData)
      onClose()
    } catch (error: any) {
      console.error("Error submitting student:", error)
      setErrors({ general: error.message || "Failed to save student" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="top" className="h-full w-full max-w-none overflow-y-auto bg-muted/40 p-0">
        <div className="container mx-auto max-w-3xl py-8">
          <SheetHeader className="pb-8 text-center">
            <SheetTitle className="flex items-center justify-center gap-3 text-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              {title}
            </SheetTitle>
            <SheetDescription className="text-lg text-muted-foreground text-center">
              Fill in the details below to {initialData ? 'update' : 'add'} a student.
            </SheetDescription>
          </SheetHeader>

          <Card className="shadow-lg">
            <CardHeader className="pb-6 border-b mb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Student Information</h3>
                <p className="text-sm text-muted-foreground">Enter student&apos;s personal and academic details</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {errors.general && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {errors.general}
                  </div>
                )}

                {/* Show pre-selected scope information */}
                {userScope && userScope.scope !== 'superadmin' && userScope.scope !== 'national' && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pre-selected Scope</h4>

                    {!visibleFields.region && userScope.region && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          Region: <span className="font-semibold">{userScope.region.name}</span>
                        </span>
                      </div>
                    )}

                    {!visibleFields.university && userScope.university && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          University: <span className="font-semibold">{userScope.university.name}</span>
                        </span>
                      </div>
                    )}

                    {!visibleFields.smallGroup && userScope.smallGroup && (
                      <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          Small Group: <span className="font-semibold">{userScope.smallGroup.name}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Personal Information</h4>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name *
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Enter student's full name"
                      className="h-11"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      required
                    />
                    {errors.fullName && <p className="text-sm text-red-600">{errors.fullName}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sex" className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Sex *
                      </Label>
                      <Select
                        value={formData.sex}
                        onValueChange={(value) => handleInputChange("sex", value)}
                      >
                        <SelectTrigger id="sex" className="h-11">
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.sex && <p className="text-sm text-red-600">{errors.sex}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        className="h-11"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        className="h-11"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                      {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange("status", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="graduated">Graduated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Academic Information</h4>

                  {visibleFields.region && (
                    <div className="space-y-2">
                      <Label htmlFor="regionId" className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Region
                      </Label>
                      <Select
                        value={formData.regionId}
                        onValueChange={(value) => handleInputChange("regionId", value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map((region) => (
                            <SelectItem key={region.id} value={region.id.toString()}>
                              {region.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {visibleFields.university && (
                    <div className="space-y-2">
                      <Label htmlFor="universityId" className="text-sm font-medium flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        University *
                      </Label>
                      <Select
                        value={formData.universityId}
                        onValueChange={(value) => handleInputChange("universityId", value)}
                        disabled={!formData.regionId && visibleFields.region}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={formData.regionId || !visibleFields.region ? "Select a university" : "Select a region first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(visibleFields.region ? filteredUniversities : universities).map((university) => (
                            <SelectItem key={university.id} value={university.id.toString()}>
                              {university.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.universityId && <p className="text-sm text-red-600">{errors.universityId}</p>}
                    </div>
                  )}

                  {visibleFields.smallGroup && (
                    <div className="space-y-2">
                      <Label htmlFor="smallGroupId" className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Small Group *
                      </Label>
                      <Select
                        value={formData.smallGroupId}
                        onValueChange={(value) => handleInputChange("smallGroupId", value)}
                        disabled={!formData.universityId && visibleFields.university}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={formData.universityId || !visibleFields.university ? "Select a small group" : "Select a university first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(visibleFields.university ? filteredSmallGroups : smallGroups).map((group) => (
                            <SelectItem key={group.id} value={group.id.toString()}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.smallGroupId && <p className="text-sm text-red-600">{errors.smallGroupId}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="course" className="text-sm font-medium flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Course
                      </Label>
                      <Input
                        id="course"
                        placeholder="e.g. Computer Science"
                        className="h-11"
                        value={formData.course}
                        onChange={(e) => handleInputChange("course", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yearOfStudy" className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Year of Study
                      </Label>
                      <Select
                        value={formData.yearOfStudy}
                        onValueChange={(value) => handleInputChange("yearOfStudy", value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Year 1</SelectItem>
                          <SelectItem value="2">Year 2</SelectItem>
                          <SelectItem value="3">Year 3</SelectItem>
                          <SelectItem value="4">Year 4</SelectItem>
                          <SelectItem value="5">Year 5</SelectItem>
                          <SelectItem value="6">Year 6</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Place of Birth */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Place of Birth</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="placeOfBirthProvince" className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Province
                      </Label>
                      <Select
                        value={selectedProvinceId || undefined}
                        onValueChange={handleProvinceChange}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {provinces.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="placeOfBirthDistrict" className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        District
                      </Label>
                      <Select
                        value={selectedDistrictId || undefined}
                        onValueChange={handleDistrictChange}
                        disabled={!selectedProvinceId}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select district" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {districts.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="placeOfBirthSector" className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Sector
                      </Label>
                      <Select
                        value={selectedSectorId || undefined}
                        onValueChange={handleSectorChange}
                        disabled={!selectedDistrictId}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select sector" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {sectors.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      initialData ? "Update Student" : "Add Student"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
