"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, Trash2, Building2, AlertCircle, MoreVertical, Package, Calendar, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import CampusDataForm from "@/app/components/campus-data-form";
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
import { useRoleAccess } from "@/app/components/providers/role-access-provider";

interface CampusData {
    id: number;
    universityId: number;
    year: number;
    studentsCount: number;
    faculties: string;
    associations: string;
    cults: string;
    university: { name: string; region: { id: number; name: string } };
    updatedAt: string;
}

interface Region {
    id: number;
    name: string;
}

interface University {
    id: number;
    name: string;
}

interface GroupedData {
    region: { id: number; name: string };
    universities: CampusData[];
}

function RegionRowGroup({
    regionGroup,
    canManageRecords,
    onEdit,
    onDelete
}: {
    regionGroup: GroupedData;
    canManageRecords: boolean;
    onEdit: (item: CampusData) => void;
    onDelete: (item: CampusData) => void;
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            <TableRow
                className="group transition-colors hover:bg-muted/30 bg-muted/10"
            >
                <TableCell className="font-medium" colSpan={canManageRecords ? 7 : 6}>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <MapPin className="h-4 w-4 text-primary/70" />
                        <span>{regionGroup.region.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({regionGroup.universities.length} Campuses)</span>
                    </div>
                </TableCell>
            </TableRow>

            {/* University Rows */}
            {isOpen && regionGroup.universities.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="pl-12">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{item.university.name}</p>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.year}
                        </span>
                    </TableCell>
                    <TableCell className="text-center font-medium">{item.studentsCount.toLocaleString()}</TableCell>
                    <TableCell>
                        <div className="line-clamp-2 max-w-[200px] text-xs text-muted-foreground" title={item.faculties}>
                            {item.faculties || '-'}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="line-clamp-2 max-w-[200px] text-xs text-muted-foreground" title={item.associations}>
                            {item.associations || '-'}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="line-clamp-2 max-w-[200px] text-xs text-muted-foreground" title={item.cults}>
                            {item.cults || '-'}
                        </div>
                    </TableCell>
                    {canManageRecords && (
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onEdit(item)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onDelete(item)}
                                        className="text-red-600 focus:text-red-600"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    )}
                </TableRow>
            ))}
        </>
    );
}

export default function CampusDataPage() {
    const router = useRouter();
    const { userRole, userScope, isLoading: roleLoading } = useRoleAccess();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [data, setData] = useState<CampusData[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingData, setEditingData] = useState<CampusData | null>(null);
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        id: number | null;
        name: string;
    }>({
        isOpen: false,
        id: null,
        name: ''
    });
    const [deleting, setDeleting] = useState(false);
    const canManageRecords = userRole === 'superadmin' || userRole === 'national' || userRole === 'region';
    const canSelectRegion = userRole !== 'university';

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `/api/campus-data?year=${selectedYear}`;
            if (selectedRegion !== "all") {
                url += `&regionId=${selectedRegion}`;
            }

            const [dataRes, regionsRes, universitiesRes] = await Promise.all([
                axios.get(url),
                axios.get('/api/regions'),
                axios.get('/api/universities')
            ]);

            setData(dataRes.data);
            setRegions(regionsRes.data);
            setUniversities(universitiesRes.data);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roleLoading) return;

        if (!userRole || !['superadmin', 'national', 'region', 'university'].includes(userRole)) {
            router.replace('/dashboard');
            return;
        }

        if (userRole === 'university' && userScope?.regionId) {
            setSelectedRegion(String(userScope.regionId));
        }

        fetchData();
    }, [roleLoading, router, selectedYear, selectedRegion, userRole, userScope?.regionId]);

    // Create Handler
    const handleCreate = async (formData: any) => {
        try {
            await axios.post('/api/campus-data', formData);
            fetchData();
        } catch (err: any) {
            console.error('Error creating data:', err);
            throw new Error(err.response?.data?.error || 'Failed to create record');
        }
    };

    // Update Handler
    const handleUpdate = async (formData: any) => {
        if (!editingData) return;
        try {
            await axios.put('/api/campus-data', { ...formData, id: editingData.id });
            fetchData();
            setEditingData(null);
        } catch (err: any) {
            console.error('Error updating data:', err);
            throw new Error(err.response?.data?.error || 'Failed to update record');
        }
    };

    // Delete Handler
    const handleDelete = async () => {
        if (!deleteModal.id) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/campus-data?id=${deleteModal.id}`);
            setData(prev => prev.filter(item => item.id !== deleteModal.id));
            setDeleteModal({ isOpen: false, id: null, name: '' });
        } catch (err) {
            console.error('Error deleting data:', err);
        } finally {
            setDeleting(false);
        }
    };

    const filteredData = data.filter(item => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            item.university.name.toLowerCase().includes(searchLower) ||
            item.university.region.name.toLowerCase().includes(searchLower)
        );
    });

    // Group the data by Region
    const groupedData: GroupedData[] = filteredData.reduce((acc: GroupedData[], item) => {
        const regionId = item.university.region.id;
        const existingRegion = acc.find(g => g.region.id === regionId);

        if (existingRegion) {
            existingRegion.universities.push(item);
        } else {
            acc.push({
                region: item.university.region,
                universities: [item]
            });
        }
        return acc;
    }, []);

    // Sort regions alphabetically
    groupedData.sort((a, b) => a.region.name.localeCompare(b.region.name));

    const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/links/organization">Organization</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Campus Information</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-foreground mb-2">Campus Information</h1>
                            <p className="text-muted-foreground">Manage campus student counts, faculties, associations, and cults across universities.</p>
                        </div>

                        {/* Search and Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-6">
                            <div className="flex flex-col sm:flex-row gap-3 flex-1">
                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search university..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-sm"
                                    />
                                </div>

                                {/* Refresh */}
                                <button
                                    onClick={fetchData}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 rounded-lg transition-all text-sm disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                {/* Year Filter */}
                                <div className="w-full sm:w-32">
                                    <Select
                                        value={selectedYear}
                                        onValueChange={setSelectedYear}
                                    >
                                        <SelectTrigger className="w-full">
                                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((y) => (
                                                <SelectItem key={y} value={y.toString()}>
                                                    {y}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Region Filter */}
                                <div className="w-full sm:w-48">
                                    <Select
                                        value={selectedRegion}
                                        onValueChange={setSelectedRegion}
                                        disabled={!canSelectRegion}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="All Regions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {canSelectRegion && <SelectItem value="all">All Regions</SelectItem>}
                                            {regions.map((region) => (
                                                <SelectItem key={region.id} value={region.id.toString()}>
                                                    {region.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Add Button */}
                                {canManageRecords && (
                                    <Button
                                        onClick={() => setIsFormOpen(true)}
                                        className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all shadow-sm text-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">Add Record</span>
                                        <span className="sm:hidden">Add</span>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 text-destructive flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Data Table */}
                        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                    <span>Loading data...</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[300px] font-semibold">Region / Campus Name</TableHead>
                                                <TableHead className="font-semibold text-center w-[100px]">Year</TableHead>
                                                <TableHead className="font-semibold text-center w-[150px]">All Students</TableHead>
                                                <TableHead className="font-semibold w-[200px]">Faculties</TableHead>
                                                <TableHead className="font-semibold w-[200px]">Associations</TableHead>
                                                <TableHead className="font-semibold w-[200px]">Cults</TableHead>
                                                {canManageRecords && <TableHead className="text-right font-semibold w-[100px]">Actions</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={canManageRecords ? 7 : 6} className="text-center py-12 text-muted-foreground">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Package className="w-12 h-12 text-muted-foreground/50" />
                                                            <p>No records found for {selectedYear} {selectedRegion !== "all" ? "in this region" : ""}.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                groupedData.map((group) => (
                                                    <RegionRowGroup
                                                        key={group.region.id}
                                                        regionGroup={group}
                                                        canManageRecords={canManageRecords}
                                                        onEdit={(item) => setEditingData(item)}
                                                        onDelete={(item) => setDeleteModal({ isOpen: true, id: item.id, name: item.university.name })}
                                                    />
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

            {/* Create Modal */}
            <CampusDataForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreate}
                title="Add Campus Information"
                universities={universities}
            />

            {/* Edit Modal */}
            {editingData && (
                <CampusDataForm
                    isOpen={!!editingData}
                    onClose={() => setEditingData(null)}
                    onSubmit={handleUpdate}
                    initialData={{
                        universityId: editingData.universityId.toString(),
                        year: editingData.year.toString(),
                        studentsCount: editingData.studentsCount.toString(),
                        faculties: editingData.faculties,
                        associations: editingData.associations,
                        cults: editingData.cults,
                    }}
                    title="Edit Campus Information"
                    universities={universities}
                />
            )}

            {/* Delete Dialog */}
            <Dialog open={deleteModal.isOpen} onOpenChange={(open) => !open && setDeleteModal(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Record</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the campus data for <strong>{deleteModal.name}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
