"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, Trash2, Building2, AlertCircle, MoreVertical, Package, Calendar } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import GBUDataForm from "@/app/components/gbu-data-form";
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

interface GBUData {
    id: number;
    universityId: number;
    year: number;
    activeMembers: number;
    cells: number;
    discipleshipGroups: number;
    studentsInDiscipleship: number;
    joinedThisYear: number;
    savedStudents: number;
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

export default function GBUDataPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [data, setData] = useState<GBUData[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingData, setEditingData] = useState<GBUData | null>(null);
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

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `/api/gbu-data?year=${selectedYear}`;
            // If API supports region filtering directly, we could add it here.
            // Currently API supports regionId.
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
        fetchData();
    }, [selectedYear, selectedRegion]); // Refetch when filters change

    // Create Handler
    const handleCreate = async (formData: any) => {
        try {
            await axios.post('/api/gbu-data', formData);
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
            await axios.put('/api/gbu-data', { ...formData, id: editingData.id });
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
            await axios.delete(`/api/gbu-data?id=${deleteModal.id}`);
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
                                    <BreadcrumbPage>General Information</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-foreground mb-2">General Information</h1>
                            <p className="text-muted-foreground">Manage GBU statistics and overview across universities</p>
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
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="All Regions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Regions</SelectItem>
                                            {regions.map((region) => (
                                                <SelectItem key={region.id} value={region.id.toString()}>
                                                    {region.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Add Button */}
                                <Button
                                    onClick={() => setIsFormOpen(true)}
                                    className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all shadow-sm text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Record</span>
                                    <span className="sm:hidden">Add</span>
                                </Button>
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
                                                <TableHead className="font-semibold">GBU Name</TableHead>
                                                <TableHead className="font-semibold text-center">Year</TableHead>
                                                <TableHead className="font-semibold text-center">Active Members</TableHead>
                                                <TableHead className="font-semibold text-center">Cells</TableHead>
                                                <TableHead className="font-semibold text-center">D-Groups</TableHead>
                                                <TableHead className="font-semibold text-center">Students in DG</TableHead>
                                                <TableHead className="font-semibold text-center">Joined This Year</TableHead>
                                                <TableHead className="font-semibold text-center">Saved</TableHead>
                                                <TableHead className="text-right font-semibold">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Package className="w-12 h-12 text-muted-foreground/50" />
                                                            <p>No records found for {selectedYear} {selectedRegion !== "all" ? "in this region" : ""}.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredData.map((item) => (
                                                    <TableRow key={item.id} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                    <Building2 className="w-4 h-4 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">{item.university.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{item.university.region.name}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                {item.year}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">{item.activeMembers}</TableCell>
                                                        <TableCell className="text-center">{item.cells}</TableCell>
                                                        <TableCell className="text-center">{item.discipleshipGroups}</TableCell>
                                                        <TableCell className="text-center">{item.studentsInDiscipleship}</TableCell>
                                                        <TableCell className="text-center font-bold text-primary">{item.joinedThisYear}</TableCell>
                                                        <TableCell className="text-center">{item.savedStudents}</TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => setEditingData(item)}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteModal({ isOpen: true, id: item.id, name: item.university.name })}
                                                                        className="text-red-600 focus:text-red-600"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
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

            {/* Create Modal */}
            <GBUDataForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreate}
                title="Add General Information"
                universities={universities}
            />

            {/* Edit Modal */}
            {editingData && (
                <GBUDataForm
                    isOpen={!!editingData}
                    onClose={() => setEditingData(null)}
                    onSubmit={handleUpdate}
                    initialData={{
                        universityId: editingData.universityId.toString(),
                        year: editingData.year.toString(),
                        activeMembers: editingData.activeMembers.toString(),
                        cells: editingData.cells.toString(),
                        discipleshipGroups: editingData.discipleshipGroups.toString(),
                        studentsInDiscipleship: editingData.studentsInDiscipleship.toString(),
                        savedStudents: editingData.savedStudents.toString(),
                        // joinedThisYear is read-only and calculated, not passed to form for editing
                    }}
                    title="Edit General Information"
                    universities={universities}
                />
            )}

            {/* Delete Dialog */}
            <Dialog open={deleteModal.isOpen} onOpenChange={(open) => !open && setDeleteModal(prev => ({ ...prev, isOpen: false }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Record</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the GBU data for <strong>{deleteModal.name}</strong>? This action cannot be undone.
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
