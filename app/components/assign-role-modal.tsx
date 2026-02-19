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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserCheck, Shield, MapPin, Building2, Users, Crown } from "lucide-react";
import { useState } from "react";
import axios from "axios";

interface AssignRoleModalProps {
    children: React.ReactNode;
    userId: string;
    userName: string;
    onRoleAssigned?: () => void;
}

export function AssignRoleModal({
    children,
    userId,
    userName,
    onRoleAssigned,
}: AssignRoleModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [scope, setScope] = useState<string>("");
    const [regionId, setRegionId] = useState<string>("");
    const [universityId, setUniversityId] = useState<string>("");
    const [smallGroupId, setSmallGroupId] = useState<string>("");
    const [graduateGroupId, setGraduateGroupId] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    // Data for dropdowns
    const [regions, setRegions] = useState<any[]>([]);
    const [universities, setUniversities] = useState<any[]>([]);
    const [smallGroups, setSmallGroups] = useState<any[]>([]);
    const [graduateGroups, setGraduateGroups] = useState<any[]>([]);

    // Fetch data when modal opens
    React.useEffect(() => {
        if (open) {
            fetchRegions();
            setError(null);
        }
    }, [open]);

    // Fetch dependent data when parent selection changes
    React.useEffect(() => {
        if (regionId && (scope === "university" || scope === "smallgroup")) {
            fetchUniversities(regionId);
        }
        if (regionId && scope === "graduatesmallgroup") {
            fetchGraduateGroups(regionId);
        }
    }, [regionId, scope]);

    React.useEffect(() => {
        if (universityId && scope === "smallgroup") {
            fetchSmallGroups(universityId);
        }
    }, [universityId, scope]);

    const fetchRegions = async () => {
        try {
            const response = await axios.get("/api/regions");
            setRegions(response.data.regions || []);
        } catch (error) {
            console.error("Error fetching regions:", error);
        }
    };

    const fetchUniversities = async (rId: string) => {
        try {
            const response = await axios.get(`/api/universities?regionId=${rId}`);
            setUniversities(response.data.universities || []);
        } catch (error) {
            console.error("Error fetching universities:", error);
        }
    };

    const fetchSmallGroups = async (uId: string) => {
        try {
            const response = await axios.get(`/api/small-groups?universityId=${uId}`);
            setSmallGroups(response.data.smallGroups || []);
        } catch (error) {
            console.error("Error fetching small groups:", error);
        }
    };

    const fetchGraduateGroups = async (rId: string) => {
        try {
            const response = await axios.get(`/api/graduate-small-groups?regionId=${rId}`);
            setGraduateGroups(response.data.graduateGroups || []);
        } catch (error) {
            console.error("Error fetching graduate groups:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await axios.post("/api/user-roles", {
                userId,
                scope,
                regionId: regionId ? parseInt(regionId) : undefined,
                universityId: universityId ? parseInt(universityId) : undefined,
                smallGroupId: smallGroupId ? parseInt(smallGroupId) : undefined,
                graduateGroupId: graduateGroupId ? parseInt(graduateGroupId) : undefined,
            });

            if (onRoleAssigned) {
                onRoleAssigned();
            }
            setOpen(false);

            // Reset form
            setScope("");
            setRegionId("");
            setUniversityId("");
            setSmallGroupId("");
            setGraduateGroupId("");

        } catch (error: any) {
            console.error("Error assigning role:", error);
            setError(error.response?.data?.error || "Failed to assign role. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            // Reset form on close if desired
            setError(null);
        }
    };

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent className="w-full sm:max-w-md h-full flex flex-col">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5" />
                        Assign Role
                    </SheetTitle>
                    <SheetDescription>
                        Assign a new role to <span className="font-semibold text-foreground">{userName}</span>.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto py-6">
                    <Card className="border-none shadow-none">
                        <CardHeader className="p-0 pb-4">
                            <div className="text-sm text-muted-foreground">
                                Select the scope and specific entity for this role assignment.
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {error && (
                                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="scope" className="text-sm font-medium flex items-center gap-2">
                                            <Shield className="h-4 w-4" />
                                            Role Scope *
                                        </Label>
                                        <Select value={scope} onValueChange={setScope} required>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select scope" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="superadmin">Super Admin</SelectItem>
                                                <SelectItem value="national">National</SelectItem>
                                                <SelectItem value="region">Region</SelectItem>
                                                <SelectItem value="university">University</SelectItem>
                                                <SelectItem value="smallgroup">Small Group</SelectItem>
                                                <SelectItem value="graduatesmallgroup">Graduate Group</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {(scope === "region" || scope === "university" || scope === "smallgroup" || scope === "graduatesmallgroup") && (
                                        <div className="space-y-2">
                                            <Label htmlFor="region" className="text-sm font-medium flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Region *
                                            </Label>
                                            <Select value={regionId} onValueChange={setRegionId} required>
                                                <SelectTrigger>
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
                                        </div>
                                    )}

                                    {(scope === "university" || scope === "smallgroup") && (
                                        <div className="space-y-2">
                                            <Label htmlFor="university" className="text-sm font-medium flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                University *
                                            </Label>
                                            <Select value={universityId} onValueChange={setUniversityId} required>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select university" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {universities.map((uni) => (
                                                        <SelectItem key={uni.id} value={uni.id.toString()}>
                                                            {uni.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {scope === "smallgroup" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="smallgroup" className="text-sm font-medium flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Small Group *
                                            </Label>
                                            <Select value={smallGroupId} onValueChange={setSmallGroupId} required>
                                                <SelectTrigger>
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
                                        </div>
                                    )}

                                    {scope === "graduatesmallgroup" && (
                                        <div className="space-y-2">
                                            <Label htmlFor="graduategroup" className="text-sm font-medium flex items-center gap-2">
                                                <Crown className="h-4 w-4" />
                                                Graduate Group *
                                            </Label>
                                            <Select value={graduateGroupId} onValueChange={setGraduateGroupId} required>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select graduate group" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {graduateGroups.map((group) => (
                                                        <SelectItem key={group.id} value={group.id.toString()}>
                                                            {group.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-4 mt-auto">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Assigning...
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="h-4 w-4 mr-2" />
                                                Assign Role
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setOpen(false)}
                                        disabled={loading}
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
