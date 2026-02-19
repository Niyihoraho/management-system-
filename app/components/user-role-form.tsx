"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, MapPin, Building2, Users, GraduationCap, X } from "lucide-react";
import { userRoleSchema } from "@/app/api/validation/user";

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

interface GraduateGroup {
  id: number;
  name: string;
  provinceId: number; // Changed from regionId to provinceId
}

interface UserRoleFormProps {
  userId: string;
  userName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserRoleForm({ userId, userName, onSuccess, onCancel }: UserRoleFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [success, setSuccess] = React.useState(false);
  const [regions, setRegions] = React.useState<Region[]>([]);
  const [universities, setUniversities] = React.useState<University[]>([]);
  const [smallGroups, setSmallGroups] = React.useState<SmallGroup[]>([]);
  const [graduateGroups, setGraduateGroups] = React.useState<GraduateGroup[]>([]);
  const [formData, setFormData] = React.useState({
    userId,
    regionId: "",
    universityId: "",
    smallGroupId: "",
    graduateGroupId: "",
    scope: "user",
  });

  // Fetch regions on component mount
  React.useEffect(() => {
    fetchRegions();
  }, []);

  // Fetch universities when region changes
  React.useEffect(() => {
    if (formData.regionId) {
      fetchUniversities(Number(formData.regionId));
      fetchGraduateGroups(Number(formData.regionId)); // Fetch graduate groups using provinceId (which is passed as regionId from the form initially, assuming regions are provinces in this context or we need to map)
    } else {
      setUniversities([]);
      setGraduateGroups([]);
      setFormData(prev => ({ ...prev, universityId: "", graduateGroupId: "" }));
    }
  }, [formData.regionId]);

  // Fetch small groups when university changes
  React.useEffect(() => {
    if (formData.universityId) {
      fetchSmallGroups(Number(formData.universityId));
    } else {
      setSmallGroups([]);
      setFormData(prev => ({ ...prev, smallGroupId: "" }));
    }
  }, [formData.universityId]);

  const fetchRegions = async () => {
    try {
      console.log('Fetching regions...');
      const response = await fetch('/api/regions');
      const data = await response.json();
      console.log('Regions response:', data);

      if (data && Array.isArray(data)) {
        setRegions(data);
        console.log('Regions set:', data);
      } else {
        console.error('Unexpected regions response format:', data);
      }
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchUniversities = async (regionId: number) => {
    try {
      const response = await fetch(`/api/universities?regionId=${regionId}`);
      const data = await response.json();
      setUniversities(data);
    } catch (error) {
      console.error('Error fetching universities:', error);
    }
  };

  const fetchSmallGroups = async (universityId: number) => {
    try {
      const response = await fetch(`/api/small-groups?universityId=${universityId}`);
      const data = await response.json();
      setSmallGroups(data);
    } catch (error) {
      console.error('Error fetching small groups:', error);
    }
  };

  const fetchGraduateGroups = async (provinceId: number) => {
    try {
      // Use the new endpoint params. Assuming regionId maps to provinceId for now as per refactor
      const response = await fetch(`/api/graduate-small-groups?provinceId=${provinceId}`);
      const data = await response.json();
      setGraduateGroups(data);
    } catch (error) {
      console.error('Error fetching graduate groups:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

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
    try {
      const dataToValidate = {
        ...formData,
        regionId: formData.regionId ? Number(formData.regionId) : null,
        universityId: formData.universityId ? Number(formData.universityId) : null,
        smallGroupId: formData.smallGroupId ? Number(formData.smallGroupId) : null,
        graduateGroupId: formData.graduateGroupId ? Number(formData.graduateGroupId) : null,
      };

      userRoleSchema.parse(dataToValidate);
      setErrors({});
      return true;
    } catch (error: unknown) {
      const newErrors: Record<string, string> = {};
      if (error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors)) {
        error.errors.forEach((err: { path: string[]; message: string }) => {
          newErrors[err.path[0]] = err.message;
        });
      }
      setErrors(newErrors);
      return false;
    }
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
        ...formData,
        regionId: formData.regionId ? Number(formData.regionId) : null,
        universityId: formData.universityId ? Number(formData.universityId) : null,
        smallGroupId: formData.smallGroupId ? Number(formData.smallGroupId) : null,
        graduateGroupId: formData.graduateGroupId ? Number(formData.graduateGroupId) : null,
      };

      const response = await fetch('/api/user-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          const newErrors: Record<string, string> = {};
          data.details.forEach((detail: { path: string[]; message: string }) => {
            newErrors[detail.path[0]] = detail.message;
          });
          setErrors(newErrors);
        } else {
          setErrors({ general: data.error || "Failed to assign role" });
        }
        return;
      }

      setSuccess(true);

      // Call onSuccess after a short delay to show success message
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (error) {
      console.error('Error assigning role:', error);
      setErrors({ general: "Failed to assign role. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Assign Role to {userName}</h2>
          <p className="text-sm text-muted-foreground">Configure user permissions and access scope</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

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
                Role assigned successfully!
              </div>
            )}

            {/* Scope Selection */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-foreground border-b pb-2">Scope Selection</h4>

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
                    <SelectValue placeholder="Select region (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {console.log('Rendering regions in user-role-form:', regions)}
                    <SelectItem value="">No region</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id.toString()}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.regionId && <p className="text-sm text-red-600">{errors.regionId}</p>}
              </div>

              {formData.regionId && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="universityId" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      University
                    </Label>
                    <Select
                      value={formData.universityId}
                      onValueChange={(value) => handleInputChange("universityId", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select university (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No university</SelectItem>
                        {universities.map((university) => (
                          <SelectItem key={university.id} value={university.id.toString()}>
                            {university.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.universityId && <p className="text-sm text-red-600">{errors.universityId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graduateGroupId" className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Graduate Group
                    </Label>
                    <Select
                      value={formData.graduateGroupId}
                      onValueChange={(value) => handleInputChange("graduateGroupId", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select graduate group (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No graduate group</SelectItem>
                        {graduateGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.graduateGroupId && <p className="text-sm text-red-600">{errors.graduateGroupId}</p>}
                  </div>
                </>
              )}

              {formData.universityId && (
                <div className="space-y-2">
                  <Label htmlFor="smallGroupId" className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Small Group
                  </Label>
                  <Select
                    value={formData.smallGroupId}
                    onValueChange={(value) => handleInputChange("smallGroupId", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select small group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No small group</SelectItem>
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
            </div>

            {/* Permission Level */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-foreground border-b pb-2">Permission Level</h4>

              <div className="space-y-2">
                <Label htmlFor="scope" className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role Scope
                </Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value) => handleInputChange("scope", value)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select role scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User - Basic access</SelectItem>
                    <SelectItem value="moderator">Moderator - Limited admin access</SelectItem>
                    <SelectItem value="admin">Admin - Full admin access</SelectItem>
                    <SelectItem value="superadmin">Super Admin - System-wide access</SelectItem>
                  </SelectContent>
                </Select>
                {errors.scope && <p className="text-sm text-red-600">{errors.scope}</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                className="flex-1 h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning Role...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Assign Role
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


