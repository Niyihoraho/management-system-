"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, Trash2, GraduationCap, AlertCircle, UserPlus, MoreVertical, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import GraduateForm from "@/app/components/GraduateForm";
import { AssignGroupModal } from "@/components/AssignGroupModal";


import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Graduate {
    id: number;
    fullName: string;
    phone: string | null;
    email: string | null;
    university: string | null;
    course: string | null;
    graduationYear: number | null;
    isDiaspora: boolean;
    residenceProvince: string | null;
    residenceDistrict: string | null;
    residenceSector: string | null;


    enableReminder?: boolean;
    status: string;
    regionId: number | null;
    provinceId: string | null; // BigInt serialized as string from API? API returns string for BigInt
    graduateGroupId: number | null;
    createdAt: string;
    updatedAt: string;
    region?: { name: string };
    province?: { name: string; id: string };
    graduateGroup?: { name: string };
}

interface Region {
    id: number;
    name: string;
}

interface GraduateSmallGroup {
    id: number;
    name: string;
    regionId: number;
}

const graduateStatusLabels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
};

const graduateStatusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
};

export default function GraduatesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProvince, setSelectedProvince] = useState<string>("all");
    const [graduates, setGraduates] = useState<Graduate[]>([]);
    const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
    const [graduateGroups, setGraduateGroups] = useState<GraduateSmallGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingGraduate, setEditingGraduate] = useState<Graduate | null>(null);
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        graduateId: number | null;
        graduateName: string;
    }>({
        isOpen: false,
        graduateId: null,
        graduateName: ''
    });
    const [deleting, setDeleting] = useState(false);

    // Group Assignment State
    const [groupAssignModal, setGroupAssignModal] = useState<{
        isOpen: boolean;
        graduateId: number | null;
        currentGroupId: string | null;
    }>({
        isOpen: false,
        graduateId: null,
        currentGroupId: null
    });

    // Fetch graduates and reference data
    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [graduatesRes, groupsRes, provincesRes] = await Promise.all([
                axios.get('/api/graduates'),
                axios.get('/api/graduate-small-groups'),
                axios.get('/api/provinces'),
            ]);

            console.log('API Response - Graduates:', graduatesRes.data);
            console.log('API Response - Groups:', groupsRes.data);
            console.log('API Response - Provinces:', provincesRes.data);

            setGraduates(graduatesRes.data.graduates || []);
            setGraduateGroups(groupsRes.data || []);
            setProvinces(provincesRes.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch graduates. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        fetchData();
    }, []);

    // Create graduate
    const handleCreateGraduate = async (formData: any) => {
        try {
            const response = await axios.post('/api/graduates', formData);
            setGraduates(prev => [...prev, response.data]);
            setIsFormOpen(false);
        } catch (err: any) {
            console.error('Error creating graduate:', err);
            throw new Error(err.response?.data?.error || 'Failed to create graduate');
        }
    };

    // Update graduate
    const handleUpdateGraduate = async (formData: any) => {
        if (!editingGraduate) return;

        try {
            const response = await axios.put(`/api/graduates?id=${editingGraduate.id}`, formData);
            setGraduates(prev => prev.map(g => g.id === editingGraduate.id ? response.data : g));
            setEditingGraduate(null);
        } catch (err: any) {
            console.error('Error updating graduate:', err);
            throw new Error(err.response?.data?.error || 'Failed to update graduate');
        }
    };

    // Open delete modal
    const openDeleteModal = (graduate: Graduate) => {
        setDeleteModal({
            isOpen: true,
            graduateId: graduate.id,
            graduateName: graduate.fullName
        });
    };

    // Close delete modal
    const closeDeleteModal = () => {
        setDeleteModal({
            isOpen: false,
            graduateId: null,
            graduateName: ''
        });
    };

    // Delete graduate
    const deleteGraduate = async () => {
        if (!deleteModal.graduateId) return;

        setDeleting(true);

        try {
            await axios.delete(`/api/graduates?id=${deleteModal.graduateId}`);
            setGraduates(prev => prev.filter(g => g.id !== deleteModal.graduateId));
            closeDeleteModal();
        } catch (err) {
            console.error('Error deleting graduate:', err);
            alert('Failed to delete graduate. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    // Handle Status Change
    const handleStatusChange = async (graduateId: number, newStatus: string) => {
        try {
            // Optimistic update
            setGraduates(prev => prev.map(g => g.id === graduateId ? { ...g, status: newStatus } : g));

            await axios.put(`/api/graduates/status`, { id: graduateId, status: newStatus });
        } catch (err) {
            console.error('Error updating status:', err);
            // Revert on error
            fetchData();
            alert('Failed to update status');
        }
    };

    // Group Assignment Logic
    const openGroupAssignModal = (graduate: Graduate) => {
        setGroupAssignModal({
            isOpen: true,
            graduateId: graduate.id,
            currentGroupId: graduate.graduateGroupId?.toString() || null
        });
    };

    const handleAssignGroup = async (graduateId: number, groupId: string | null) => {
        try {
            await axios.put(`/api/graduates/assign-group`, {
                graduateId,
                graduateGroupId: groupId ? parseInt(groupId) : null
            });

            // Update local state
            const groupName = graduateGroups.find(g => g.id.toString() === groupId)?.name || 'No Group';
            setGraduates(prev => prev.map(g => {
                if (g.id === graduateId) {
                    return {
                        ...g,
                        graduateGroupId: groupId ? parseInt(groupId) : null,
                        graduateGroup: { name: groupName }
                    };
                }
                return g;
            }));

            // Close modal
            setGroupAssignModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            console.error('Error assigning group:', err);
            alert('Failed to update group');
        }
    };

    // Open edit modal
    const openEditModal = (graduate: Graduate) => {
        setEditingGraduate(graduate);
    };



    // Filter graduates
    const filteredGraduates = graduates.filter(graduate => {
        // Province Filter
        if (selectedProvince !== "all" && graduate.provinceId !== selectedProvince) {
            return false;
        }

        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();

        return (
            graduate.fullName?.toLowerCase().includes(searchLower) ||
            graduate.email?.toLowerCase().includes(searchLower) ||
            graduate.phone?.includes(searchTerm) ||
            graduate.university?.toLowerCase().includes(searchLower) ||
            graduate.course?.toLowerCase().includes(searchLower)
        );
    });

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">
                                        Dashboard
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/links/people">
                                        People Management
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Graduates</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 lg:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Graduates Management</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Manage graduates across provinces</p>
                        </div>

                        {/* Search and Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search graduates..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                                    />
                                </div>

                                {/* Refresh Button */}
                                <button
                                    onClick={fetchData}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                                </button>
                            </div>

                            {/* Province Filter */}
                            <div className="w-full sm:w-48">
                                <Select
                                    value={selectedProvince}
                                    onValueChange={setSelectedProvince}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="All Provinces" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Provinces</SelectItem>
                                        {provinces.map((province) => (
                                            <SelectItem key={province.id} value={province.id}>
                                                {province.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Add New Graduate Button */}
                            <Button
                                onClick={() => setIsFormOpen(true)}
                                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all duration-200 shadow-sm text-sm sm:text-base"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Add New Graduate</span>
                                <span className="sm:hidden">Add Graduate</span>
                            </Button>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2 text-destructive">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium">Error:</span>
                                    <span className="text-sm">{error}</span>
                                </div>
                                <button
                                    onClick={fetchData}
                                    className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {/* Graduates Table */}
                        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                        <span className="text-lg font-medium">Loading graduates...</span>
                                        <span className="text-sm">Please wait while we fetch the data</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="font-semibold">Graduate</TableHead>
                                                <TableHead className="font-semibold">Contact</TableHead>
                                                <TableHead className="font-semibold">Education</TableHead>
                                                <TableHead className="font-semibold">Location</TableHead>
                                                <TableHead className="font-semibold">Status</TableHead>
                                                <TableHead className="text-right font-semibold">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredGraduates.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
                                                            <p>{searchTerm ? 'No graduates match your search' : 'No graduates found'}</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredGraduates.map((graduate) => (
                                                    <TableRow key={graduate.id} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-primary">
                                                                        {graduate.fullName.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{graduate.fullName}</p>
                                                                    <p className="text-xs text-muted-foreground">ID: {graduate.id}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                {graduate.email && (
                                                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{graduate.email}</p>
                                                                )}
                                                                {graduate.phone && (
                                                                    <p className="text-xs text-muted-foreground">{graduate.phone}</p>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium truncate max-w-[150px]">{graduate.university || 'N/A'}</p>
                                                                {graduate.course && (
                                                                    <p className="text-xs text-muted-foreground">{graduate.course}</p>
                                                                )}
                                                                {graduate.graduationYear && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {graduate.graduationYear}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium">{graduate.graduateGroup?.name || graduate.region?.name || 'N/A'}</p>
                                                                {graduate.isDiaspora && (
                                                                    <Badge variant="secondary" className="text-xs">Diaspora</Badge>
                                                                )}
                                                                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                                    {[graduate.residenceSector, graduate.residenceDistrict, graduate.residenceProvince]
                                                                        .filter(Boolean)
                                                                        .join(', ') || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="secondary"
                                                                className={graduateStatusColors[graduate.status] || 'bg-gray-100'}
                                                            >
                                                                {graduateStatusLabels[graduate.status] || graduate.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => openGroupAssignModal(graduate)}
                                                                    title="Assign Group"
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                >
                                                                    <UserPlus className="w-4 h-4" />
                                                                </Button>

                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                        <DropdownMenuItem onClick={() => openEditModal(graduate)}>
                                                                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuLabel>Status</DropdownMenuLabel>
                                                                        <DropdownMenuItem onClick={() => handleStatusChange(graduate.id, 'active')}>
                                                                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Mark Active
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleStatusChange(graduate.id, 'inactive')}>
                                                                            <XCircle className="mr-2 h-4 w-4 text-gray-500" /> Mark Inactive
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            onClick={() => openDeleteModal(graduate)}
                                                                            className="text-red-600 focus:text-red-600"
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>

            {/* Graduate Form Modal for Create */}
            <GraduateForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateGraduate}
                title="Add New Graduate"

                provinces={provinces}
                graduateGroups={graduateGroups}
            />

            {/* Graduate Form Modal for Edit */}
            {editingGraduate && (
                <GraduateForm
                    isOpen={!!editingGraduate}
                    onClose={() => setEditingGraduate(null)}
                    onSubmit={handleUpdateGraduate}
                    title="Edit Graduate"
                    initialData={{
                        fullName: editingGraduate.fullName,
                        phone: editingGraduate.phone || '',
                        email: editingGraduate.email || '',
                        university: editingGraduate.university || '',
                        course: editingGraduate.course || '',
                        graduationYear: editingGraduate.graduationYear?.toString() || '',
                        isDiaspora: editingGraduate.isDiaspora,
                        residenceProvince: editingGraduate.residenceProvince || '',
                        residenceDistrict: editingGraduate.residenceDistrict || '',
                        residenceSector: editingGraduate.residenceSector || '',


                        graduateGroupId: editingGraduate.graduateGroupId?.toString() || '',
                        status: editingGraduate.status,

                        provinceId: editingGraduate.provinceId?.toString() || '',
                    }}
                    provinces={provinces}
                    graduateGroups={graduateGroups}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteModal.isOpen} onOpenChange={closeDeleteModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Graduate</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteModal.graduateName}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteGraduate} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AssignGroupModal
                isOpen={groupAssignModal.isOpen}
                onClose={() => setGroupAssignModal(prev => ({ ...prev, isOpen: false }))}
                entityId={groupAssignModal.graduateId}
                currentGroupId={groupAssignModal.currentGroupId}
                smallGroups={graduateGroups}
                onAssign={handleAssignGroup}
                title="Assign Graduate Group"
            />
        </SidebarProvider>
    );
}
