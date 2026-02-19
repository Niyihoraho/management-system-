"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, Trash2, Building2, MoreVertical, AlertCircle, Ban } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import UniversityForm from "@/app/components/UniversityForm";

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

interface University {
  id: number;
  name: string;
  regionId: number;
  studentPopulation?: number;
  region: { name: string };
  cult?: { name: string }[];
  faculty?: { name: string }[];
  association?: { name: string }[];
}

interface Region {
  id: number;
  name: string;
}

export default function UniversitiesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [universities, setUniversities] = useState<University[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);

  // Delete State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    universityId: number | null;
    universityName: string;
  }>({
    isOpen: false,
    universityId: null,
    universityName: ''
  });
  const [deleting, setDeleting] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [universitiesRes, regionsRes] = await Promise.all([
        axios.get('/api/universities'),
        axios.get('/api/regions'),
      ]);

      setUniversities(universitiesRes.data || []);
      setRegions(regionsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch universities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Create university
  const handleCreateUniversity = async (formData: any) => {
    try {
      const response = await axios.post('/api/universities', {
        name: formData.name,
        regionId: Number(formData.regionId),
        studentPopulation: Number(formData.studentPopulation),
        cults: formData.cults,
        faculties: formData.faculties,
        associations: formData.associations
      });
      setUniversities(prev => [...prev, response.data]);
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error creating university:', err);
      throw new Error(err.response?.data?.error || 'Failed to create university');
    }
  };

  // Update university
  const handleUpdateUniversity = async (formData: any) => {
    if (!editingUniversity) return;

    try {
      const response = await axios.put(`/api/universities?id=${editingUniversity.id}`, {
        name: formData.name,
        regionId: Number(formData.regionId),
        studentPopulation: Number(formData.studentPopulation),
        cults: formData.cults,
        faculties: formData.faculties,
        associations: formData.associations
      });
      setUniversities(prev => prev.map(u => u.id === editingUniversity.id ? response.data : u));
      setEditingUniversity(null);
    } catch (err: any) {
      console.error('Error updating university:', err);
      throw new Error(err.response?.data?.error || 'Failed to update university');
    }
  };

  // Open delete modal
  const openDeleteModal = (university: University) => {
    setDeleteModal({
      isOpen: true,
      universityId: university.id,
      universityName: university.name
    });
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      universityId: null,
      universityName: ''
    });
  };

  // Delete university
  const deleteUniversity = async () => {
    if (!deleteModal.universityId) return;

    setDeleting(true);

    try {
      await axios.delete(`/api/universities?id=${deleteModal.universityId}`);
      setUniversities(prev => prev.filter(u => u.id !== deleteModal.universityId));
      closeDeleteModal();
    } catch (err: any) {
      console.error('Error deleting university:', err);
      const errorMessage = err.response?.data?.error || 'Failed to delete university. Please try again.';
      alert(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // Filter universities
  const filteredUniversities = universities.filter(university => {
    // Region Filter
    if (selectedRegion !== "all" && university.regionId.toString() !== selectedRegion) {
      return false;
    }

    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    return (
      university.name?.toLowerCase().includes(searchLower) ||
      university.region?.name?.toLowerCase().includes(searchLower)
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
                  <BreadcrumbLink href="/links/organization">
                    Organization
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Universities</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
          <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Universities Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage universities and their information across the organization</p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search universities..."
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

              {/* Add New University Button */}
              <Button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all duration-200 shadow-sm text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New University</span>
                <span className="sm:hidden">Add University</span>
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

            {/* Universities Table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-lg font-medium">Loading universities...</span>
                    <span className="text-sm">Please wait while we fetch the data</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold w-[50px]">ID</TableHead>
                        <TableHead className="font-semibold">University Name</TableHead>
                        <TableHead className="font-semibold">Region</TableHead>
                        <TableHead className="font-semibold">Population</TableHead>
                        <TableHead className="font-semibold hidden lg:table-cell">Faculties</TableHead>
                        <TableHead className="font-semibold hidden xl:table-cell">Cults</TableHead>
                        <TableHead className="font-semibold hidden xl:table-cell">Associations</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUniversities.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Building2 className="w-12 h-12 text-muted-foreground/50" />
                              <p>{searchTerm ? 'No universities match your search' : 'No universities found'}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUniversities.map((university) => (
                          <TableRow key={university.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              #{university.id}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {university.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium text-sm">{university.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {university.region?.name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">
                                {university.studentPopulation?.toLocaleString() || '0'}
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex flex-wrap gap-1">
                                {university.faculty && university.faculty.length > 0 ? (
                                  university.faculty.slice(0, 2).map((f, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{f.name}</Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                                {(university.faculty?.length || 0) > 2 && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">+{university.faculty!.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <div className="flex flex-wrap gap-1">
                                {university.cult && university.cult.length > 0 ? (
                                  university.cult.slice(0, 2).map((c, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{c.name}</Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                                {(university.cult?.length || 0) > 2 && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">+{university.cult!.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              <div className="flex flex-wrap gap-1">
                                {university.association && university.association.length > 0 ? (
                                  university.association.slice(0, 2).map((a, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{a.name}</Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                                {(university.association?.length || 0) > 2 && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">+{university.association!.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setEditingUniversity(university)}>
                                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => openDeleteModal(university)}
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

              {/* Table Footer */}
              {!loading && filteredUniversities.length > 0 && (
                <div className="bg-muted/50 px-3 sm:px-6 py-3 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      Showing <span className="font-medium text-foreground">{filteredUniversities.length}</span> of <span className="font-medium text-foreground">{universities.length}</span> universities
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Create Modal */}
      <UniversityForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateUniversity}
        title="Add New University"
        regions={regions}
      />

      {/* Edit Modal */}
      {editingUniversity && (
        <UniversityForm
          isOpen={!!editingUniversity}
          onClose={() => setEditingUniversity(null)}
          onSubmit={handleUpdateUniversity}
          title="Edit University"
          regions={regions}
          initialData={{
            name: editingUniversity.name,
            regionId: editingUniversity.regionId.toString(),
            studentPopulation: editingUniversity.studentPopulation?.toString(),
            cults: editingUniversity.cult?.map(c => c.name) || [],
            faculties: editingUniversity.faculty?.map(f => f.name) || [],
            associations: editingUniversity.association?.map(a => a.name) || []
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal.isOpen} onOpenChange={closeDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete University</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteModal.universityName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteUniversity} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
