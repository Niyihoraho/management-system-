"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, MapPin, Building2, Users, GraduationCap } from "lucide-react";

import axios from "axios";

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
  regionId: number;
  universityId: number;
}

interface AlumniSmallGroup {
  id: number;
  name: string;
  regionId: number;
}

interface AssignRoleModalProps {
  children: React.ReactNode;
  userId: string;
  userName: string;
  existingRole?: {
    regionId?: number;
    universityId?: number;
    smallGroupId?: number;
    alumniGroupId?: number;
    scope?: string;
  };
  onRoleAssigned?: () => void;
}

export function AssignRoleModal({ children, userId, userName, existingRole, onRoleAssigned }: AssignRoleModalProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [success, setSuccess] = React.useState(false);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [universities, setUniversities] = React.useState<University[]>([]);
  const [smallGroups, setSmallGroups] = React.useState<SmallGroup[]>([]);
  const [alumniGroups, setAlumniGroups] = React.useState<AlumniSmallGroup[]>([]);
  const [formData, setFormData] = React.useState({
    userId,
    regionId: existingRole?.regionId?.toString() || "",
    universityId: existingRole?.universityId?.toString() || "",
    smallGroupId: existingRole?.smallGroupId?.toString() || "",
    alumniGroupId: existingRole?.alumniGroupId?.toString() || "",
    scope: existingRole?.scope || "superadmin",
  });

  // Fetch regions on component mount
  React.useEffect(() => {
    fetchRegions();
  }, []);

  // Fetch universities when region changes
  React.useEffect(() => {
    if (formData.regionId) {
      fetchUniversities(Number(formData.regionId));
      fetchAlumniGroups(Number(formData.regionId));
    } else {
      setUniversities([]);
      setAlumniGroups([]);
      setFormData(prev => ({ ...prev, universityId: "", alumniGroupId: "" }));
    }
  }, [formData.regionId]);

  // Fetch small groups when university changes
  React.useEffect(() => {
    if (formData.universityId && formData.regionId) {
      fetchSmallGroups(Number(formData.regionId), Number(formData.universityId));
    } else {
      setSmallGroups([]);
      setFormData(prev => ({ ...prev, smallGroupId: "" }));
    }
  }, [formData.universityId, formData.regionId]);

  const fetchRegions = async () => {
    try {
      console.log('Fetching regions...');
      const response = await axios.get('/api/regions');
      console.log('Regions response:', response.data);
      
      // The API returns regions directly as an array
      if (response.data && Array.isArray(response.data)) {
        setRegions(response.data);
        console.log('Regions set:', response.data);
      } else {
        console.error('Unexpected regions response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchUniversities = async (regionId: number) => {
    try {
      const response = await axios.get(`/api/universities?regionId=${regionId}`);
      if (response.data && Array.isArray(response.data)) {
        setUniversities(response.data);
      }
    } catch (error) {
      console.error('Error fetching universities:', error);
    }
  };

  const fetchSmallGroups = async (regionId: number, universityId: number) => {
    try {
      const response = await axios.get(`/api/small-groups?regionId=${regionId}&universityId=${universityId}`);
      if (response.data && Array.isArray(response.data)) {
        setSmallGroups(response.data);
      }
    } catch (error) {
      console.error('Error fetching small groups:', error);
    }
  };

  const fetchAlumniGroups = async (regionId: number) => {
    try {
      const response = await axios.get(`/api/alumni-small-groups?regionId=${regionId}`);
      if (response.data && Array.isArray(response.data)) {
        setAlumniGroups(response.data);
      }
    } catch (error) {
      console.error('Error fetching alumni groups:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    // Clear dependent fields when scope changes
    if (field === "scope") {
      setFormData(prev => ({
        ...prev,
        scope: value,
        regionId: "",
        universityId: "",
        smallGroupId: "",
        alumniGroupId: ""
      }));
    } else if (field === "regionId") {
      setFormData(prev => ({
        ...prev,
        regionId: value,
        universityId: "",
        smallGroupId: "",
        alumniGroupId: ""
      }));
    } else if (field === "universityId") {
      setFormData(prev => ({
        ...prev,
        universityId: value,
        smallGroupId: ""
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
    
    // Clear success state when user starts typing
    if (success) {
      setSuccess(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Basic validation
    if (!formData.scope) {
      newErrors.scope = "Role scope is required";
    }
    
    // Scope-specific validation
    if (formData.scope === "region" && !formData.regionId) {
      newErrors.regionId = "Region is required for region scope";
    }
    
    if (formData.scope === "university" && !formData.universityId) {
      newErrors.universityId = "University is required for university scope";
    }
    
    if (formData.scope === "smallgroup" && !formData.smallGroupId) {
      newErrors.smallGroupId = "Small group is required for small group scope";
    }
    
    if (formData.scope === "alumnismallgroup" && !formData.alumniGroupId) {
      newErrors.alumniGroupId = "Alumni small group is required for alumni small group scope";
    }
    
    // Set errors and return validation result
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const dataToSubmit = {
        userId: formData.userId,
        scope: formData.scope,
        regionId: formData.regionId ? Number(formData.regionId) : null,
        universityId: formData.universityId ? Number(formData.universityId) : null,
        smallGroupId: formData.smallGroupId ? Number(formData.smallGroupId) : null,
        alumniGroupId: formData.alumniGroupId ? Number(formData.alumniGroupId) : null,
      };

      console.log('Submitting data:', dataToSubmit);

      let response;
      if (existingRole) {
        // Update existing role
        response = await axios.put('/api/user-roles', {
          id: existingRole.id,
          ...dataToSubmit
        });
      } else {
        // Create new role
        response = await axios.post('/api/user-roles', dataToSubmit);
      }

      if (response.status === 200 || response.status === 201) {
        setSuccess(true);

        // Call onRoleAssigned after a short delay to show success message
        setTimeout(() => {
          onRoleAssigned?.();
          setOpen(false);
          setSuccess(false);
          // Reset form
          setFormData({
            userId,
            regionId: "",
            universityId: "",
            smallGroupId: "",
            alumniGroupId: "",
            scope: "superadmin",
          });
        }, 1500);
      }

    } catch (error: unknown) {
      console.error('Error assigning role:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { details?: Array<{ path: string[]; message: string }>; error?: string } } };
        console.error('Error response:', axiosError.response?.data);
        
        if (axiosError.response?.data?.details && Array.isArray(axiosError.response.data.details)) {
          const newErrors: Record<string, string> = {};
          axiosError.response.data.details.forEach((detail: { path: string[]; message: string }) => {
            newErrors[detail.path[0]] = detail.message;
          });
          setErrors(newErrors);
        } else {
          setErrors({ general: axiosError.response?.data?.error || "Failed to assign role. Please try again." });
        }
      } else {
        setErrors({ general: "Failed to assign role. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      userId,
      regionId: "",
      universityId: "",
      smallGroupId: "",
      alumniGroupId: "",
      scope: "superadmin",
    });
    setErrors({});
    setSuccess(false);
  };

  const getSelectedEntityName = () => {
    if (formData.scope === "region" && formData.regionId) {
      return regions.find(r => r.id.toString() === formData.regionId)?.name;
    }
    if (formData.scope === "university" && formData.universityId) {
      return universities.find(u => u.id.toString() === formData.universityId)?.name;
    }
    if (formData.scope === "smallgroup" && formData.smallGroupId) {
      return smallGroups.find(sg => sg.id.toString() === formData.smallGroupId)?.name;
    }
    if (formData.scope === "alumnismallgroup" && formData.alumniGroupId) {
      return alumniGroups.find(ag => ag.id.toString() === formData.alumniGroupId)?.name;
    }
    return null;
  };

  const getScopeDescription = (scope: string) => {
    const descriptions: Record<string, string> = {
      superadmin: "Full system access across all entities",
      national: "National level access and management",
      region: "Access limited to specific region",
      university: "Access limited to specific university",
      smallgroup: "Access limited to specific small group",
      alumnismallgroup: "Access limited to specific alumni small group"
    };
    return descriptions[scope] || "";
  };

  const scopeOptions = [
    { value: "superadmin", label: "Super Admin" },
    { value: "national", label: "National" },
    { value: "region", label: "Region" },
    { value: "university", label: "University" },
    { value: "smallgroup", label: "Small Group" },
    { value: "alumnismallgroup", label: "Alumni Small Group" }
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="sticky top-0 bg-background z-10 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {existingRole ? 'Update Role for' : 'Assign Role to'} {userName}
          </SheetTitle>
          <SheetDescription>
            {existingRole ? 'Update user permissions and access scope.' : 'Configure user permissions and access scope for this user.'}
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          <Card className="shadow-lg">
            <CardHeader className="pb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Role Assignment</h3>
                <p className="text-sm text-muted-foreground">Select the appropriate scope and permission level</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {errors.general && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {errors.general}
                </div>
              )}

              {success && (
                <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                  {existingRole ? 'Role updated successfully!' : 'Role assigned successfully!'}
                </div>
              )}

              {/* User Information Display */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">User Information</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Name:</strong> {userName}</p>
                  <p><strong>User ID:</strong> {userId}</p>
                </div>
              </div>

              {/* Role Scope Selection */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-foreground border-b pb-2">Role Scope</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="scope" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Role Scope *
                  </Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(value) => handleInputChange("scope", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select role scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {getScopeDescription(formData.scope)}
                  </p>
                  {errors.scope && <p className="text-sm text-red-600">{errors.scope}</p>}
                </div>
              </div>

              {/* Region (for region, university, smallgroup, alumnismallgroup scopes) */}
              {(formData.scope === "region" || formData.scope === "university" || formData.scope === "smallgroup" || formData.scope === "alumnismallgroup") && (
                <div className="space-y-2">
                  <Label htmlFor="regionId" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Region{formData.scope === "region" ? " *" : ""}
                  </Label>
                  <Select
                    value={formData.regionId}
                    onValueChange={(value) => handleInputChange("regionId", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {console.log('Rendering regions in dropdown:', regions)}
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id.toString()}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.regionId && <p className="text-sm text-red-600">{errors.regionId}</p>}
                </div>
              )}

              {/* University (required for university scope; shown for smallgroup scope) */}
              {(formData.scope === "university" || formData.scope === "smallgroup") && (
                <div className="space-y-2">
                  <Label htmlFor="universityId" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    University{formData.scope === "university" ? " *" : ""}
                  </Label>
                  <Select
                    value={formData.universityId}
                    onValueChange={(value) => handleInputChange("universityId", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select university" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((university) => (
                        <SelectItem key={university.id} value={university.id.toString()}>
                          {university.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.universityId && <p className="text-sm text-red-600">{errors.universityId}</p>}
                </div>
              )}

              {/* Small Group (only for smallgroup scope) */}
              {formData.scope === "smallgroup" && (
                <div className="space-y-2">
                  <Label htmlFor="smallGroupId" className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Small Group *
                  </Label>
                  <Select
                    value={formData.smallGroupId}
                    onValueChange={(value) => handleInputChange("smallGroupId", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select small group" />
                    </SelectTrigger>
                    <SelectContent>
                      {smallGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.smallGroupId && <p className="text-sm text-red-600">{errors.smallGroupId}</p>}
                </div>
              )}

              {/* Alumni Small Group (only for alumnismallgroup scope) */}
              {formData.scope === "alumnismallgroup" && (
                <div className="space-y-2">
                  <Label htmlFor="alumniGroupId" className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Alumni Small Group *
                  </Label>
                  <Select
                    value={formData.alumniGroupId}
                    onValueChange={(value) => handleInputChange("alumniGroupId", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select alumni small group" />
                    </SelectTrigger>
                    <SelectContent>
                      {alumniGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.alumniGroupId && <p className="text-sm text-red-600">{errors.alumniGroupId}</p>}
                </div>
              )}

              {/* Role Summary */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Role Summary</h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <p><strong>User:</strong> {userName}</p>
                  <p><strong>Scope:</strong> {scopeOptions.find(opt => opt.value === formData.scope)?.label}</p>
                  {getSelectedEntityName() && <p><strong>Entity:</strong> {getSelectedEntityName()}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <Button
                  type="submit"
                  className="flex-1 h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {existingRole ? 'Updating Role...' : 'Assigning Role...'}
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      {existingRole ? 'Update Role' : 'Assign Role'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
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
