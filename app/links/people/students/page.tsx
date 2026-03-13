"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Edit, Trash2, GraduationCap, AlertCircle, UserPlus, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { StudentForm } from "@/components/StudentForm";
import { MigrateStudentModal } from "@/components/MigrateStudentModal";
import { MigrateCampusStudentModal } from "@/components/MigrateCampusStudentModal";
import { AssignGroupModal } from "@/components/AssignGroupModal";
import { useRoleAccess } from "@/app/components/providers/role-access-provider";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Student {
  id: number;
  fullName: string;
  sex: 'Male' | 'Female' | null;
  phone: string | null;
  email: string | null;
  universityId: number;
  smallGroupId: number | null;
  course: string | null;
  yearOfStudy: number | null;
  placeOfBirthProvince: string | null;
  placeOfBirthDistrict: string | null;
  placeOfBirthSector: string | null;
  placeOfBirthCell: string | null;
  placeOfBirthVillage: string | null;
  status: string;
  regionId: number | null;
  createdAt: string;
  updatedAt: string;
  region: { name: string };
  university: { name: string };
  smallgroup: { name: string } | null;
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

interface Region {
  id: number;
  name: string;
}

const studentStatusLabels: Record<string, string> = {
  active: 'Active',
  migrating: 'Migrating',
  inactive: 'Inactive',
  graduated: 'Graduated',
};

const studentStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  migrating: 'bg-amber-100 text-amber-800',
  inactive: 'bg-gray-100 text-gray-800',
  graduated: 'bg-blue-100 text-blue-800',
};

export default function StudentsPage() {
  const router = useRouter();
  const { userRole, isLoading: roleLoading } = useRoleAccess();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [students, setStudents] = useState<Student[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    studentId: number | null;
    studentName: string;
  }>({
    isOpen: false,
    studentId: null,
    studentName: ''
  });
  const [deleting, setDeleting] = useState(false);

  // Group Assignment State
  const [groupAssignModal, setGroupAssignModal] = useState<{
    isOpen: boolean;
    studentId: number | null;
    currentGroupId: string | null;
  }>({
    isOpen: false,
    studentId: null,
    currentGroupId: null
  });

  // Migration State
  const [migrationModal, setMigrationModal] = useState<{
    isOpen: boolean;
    student: Student | null;
  }>({
    isOpen: false,
    student: null
  });

  const [campusMigrationModal, setCampusMigrationModal] = useState<{
    isOpen: boolean;
    student: Student | null;
  }>({
    isOpen: false,
    student: null,
  });

  const fetchData = async (readAfterWrite = false) => {
    try {
      if (initialLoad) {
        setLoading(true);
      } else {
        setIsRefetching(true);
      }
      setError(null);

      const studentsHeaders = readAfterWrite ? { 'x-read-after-write': '1' } : undefined;

      const [studentsRes, universitiesRes, smallGroupsRes, regionsRes] = await Promise.all([
        axios.get('/api/students', studentsHeaders ? { headers: studentsHeaders } : undefined),
        axios.get('/api/universities'),
        axios.get('/api/small-groups'),
        axios.get('/api/regions'),
      ]);

      console.log('API Response - Students:', studentsRes.data);
      console.log('API Response - Universities:', universitiesRes.data);
      console.log('API Response - Small Groups:', smallGroupsRes.data);
      console.log('API Response - Regions:', regionsRes.data);

      setStudents(studentsRes.data.students || []);
      setUniversities(universitiesRes.data || []);
      setSmallGroups(smallGroupsRes.data || []);
      setRegions(regionsRes.data || []);

      console.log('State - Students count:', studentsRes.data.students?.length || 0);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch students. Please try again.');
    } finally {
      setLoading(false);
      setIsRefetching(false);
      setInitialLoad(false);
    }
  };

  // Load data on mount after role access check
  useEffect(() => {
    if (roleLoading || userRole === null) return;

    if (!['superadmin', 'region', 'university'].includes(userRole)) {
      router.replace('/dashboard');
      return;
    }

    fetchData();
  }, [roleLoading, router, userRole]);

  // Create student
  const handleCreateStudent = async (formData: any) => {
    try {
      const response = await axios.post('/api/students', {
        ...formData,
        universityId: parseInt(formData.universityId),
        smallGroupId: formData.smallGroupId ? parseInt(formData.smallGroupId) : null,
        yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : null,
        regionId: formData.regionId ? parseInt(formData.regionId) : null,
      });

      setStudents(prev => [...prev, response.data]);
      setIsFormOpen(false);
    } catch (err: any) {
      console.error('Error creating student:', err);
      throw new Error(err.response?.data?.error || 'Failed to create student');
    }
  };

  // Update student
  const handleUpdateStudent = async (formData: any) => {
    if (!editingStudent) return;

    try {
      const response = await axios.put(`/api/students?id=${editingStudent.id}`, {
        ...formData,
        universityId: parseInt(formData.universityId),
        smallGroupId: formData.smallGroupId ? parseInt(formData.smallGroupId) : null,
        yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : null,
        regionId: formData.regionId ? parseInt(formData.regionId) : null,
      });

      setStudents(prev => prev.map(s => s.id === editingStudent.id ? response.data : s));
      setEditingStudent(null);
    } catch (err: any) {
      console.error('Error updating student:', err);
      throw new Error(err.response?.data?.error || 'Failed to update student');
    }
  };

  // Open delete modal
  const openDeleteModal = (student: Student) => {
    setDeleteModal({
      isOpen: true,
      studentId: student.id,
      studentName: student.fullName
    });
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      studentId: null,
      studentName: ''
    });
  };

  // Delete student
  const deleteStudent = async () => {
    if (!deleteModal.studentId) return;

    setDeleting(true);

    try {
      await axios.delete(`/api/students?id=${deleteModal.studentId}`);
      setStudents(prev => prev.filter(s => s.id !== deleteModal.studentId));
      closeDeleteModal();
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Handle Status Change
  const handleStatusChange = async (studentId: number, newStatus: string) => {
    try {
      // Optimistic update
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));

      await axios.put(`/api/students/status`, { id: studentId, status: newStatus });
    } catch (err) {
      console.error('Error updating status:', err);
      // Revert on error
      fetchData();
      alert('Failed to update status');
    }
  };

  const handleAssignGroup = async (studentId: number, groupId: string | null) => {
    try {
      await axios.put(`/api/students/assign-group`, {
        studentId,
        smallGroupId: groupId ? parseInt(groupId) : null
      });

      // Update local state
      const groupName = smallGroups.find(g => g.id.toString() === groupId)?.name || 'No Group';
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            smallGroupId: groupId ? parseInt(groupId) : null,
            smallgroup: groupId ? { name: groupName } : null
          };
        }
        return s;
      }));

      // Close modal
      setGroupAssignModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Error assigning group:', err);
      alert('Failed to update group');
    }
  };

  // Handle Migration
  const handleMigrateStudent = async (data: any) => {
    try {
      await axios.post('/api/students/migrate', data);
      // Don't close the modal — the success modal inside will show
      // Refresh students list to reflect the inactive status
      await fetchData(true);
    } catch (err: any) {
      console.error('Error migrating student:', err);
      toast.error(err.response?.data?.error || 'Failed to migrate student');
      throw err;
    }
  };

  const handleCampusTransfer = async (data: {
    studentId: number;
    destinationRegionId: number;
    destinationUniversityId: number;
  }) => {
    try {
      await axios.post('/api/students/migrate-campus', data);
      toast.success('Campus transfer request submitted for destination approval');
      await fetchData(true);
    } catch (err: any) {
      console.error('Error submitting campus transfer:', err);
      toast.error(err.response?.data?.error || 'Failed to submit campus transfer request');
      throw err;
    }
  };

  // Group Assignment Logic
  const openGroupAssignModal = (student: Student) => {
    setGroupAssignModal({
      isOpen: true,
      studentId: student.id,
      currentGroupId: student.smallGroupId?.toString() ?? null
    });
  };



  // Open edit modal
  const openEditModal = (student: Student) => {
    setEditingStudent(student);
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    return (
      student.fullName?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.phone?.includes(searchTerm) ||
      student.course?.toLowerCase().includes(searchLower) ||
      student.university?.name?.toLowerCase().includes(searchLower) ||
      student.smallgroup?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

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
                  <BreadcrumbPage>Students</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
          <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Students Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage students across universities and small groups</p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                  />
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => fetchData()}
                  disabled={loading || isRefetching}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${(loading || isRefetching) ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{(loading || isRefetching) ? 'Loading...' : 'Refresh'}</span>
                </button>
              </div>

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
                  onClick={() => fetchData()}
                  className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Students Table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-lg font-medium">Loading students...</span>
                    <span className="text-sm">Please wait while we fetch the data</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Student</TableHead>
                        <TableHead className="font-semibold">Sex</TableHead>
                        <TableHead className="font-semibold">Contact</TableHead>
                        <TableHead className="font-semibold">Education</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
                              <p>{searchTerm ? 'No students match your search' : 'No students found'}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedStudents.map((student) => (
                          <TableRow key={student.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {student.fullName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{student.fullName}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {student.sex || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {student.email && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{student.email}</p>
                                )}
                                {student.phone && (
                                  <p className="text-xs text-muted-foreground">{student.phone}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-sm font-medium truncate max-w-[150px]">{student.university?.name || 'N/A'}</p>
                                {student.course && (
                                  <p className="text-xs text-muted-foreground">{student.course}</p>
                                )}
                                {student.yearOfStudy && (
                                  <Badge variant="outline" className="text-xs">
                                    Year {student.yearOfStudy}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                  {student.placeOfBirthProvince && (
                                    <p>Prov: {student.placeOfBirthProvince}</p>
                                  )}
                                  {student.placeOfBirthDistrict && (
                                    <p>Dist: {student.placeOfBirthDistrict}</p>
                                  )}
                                  {student.placeOfBirthSector && (
                                    <p>Sec: {student.placeOfBirthSector}</p>
                                  )}
                                  {student.placeOfBirthCell && (
                                    <p>Cell: {student.placeOfBirthCell}</p>
                                  )}
                                  {student.placeOfBirthVillage && (
                                    <p>Vill: {student.placeOfBirthVillage}</p>
                                  )}
                                  {!student.placeOfBirthProvince && !student.placeOfBirthDistrict && !student.placeOfBirthSector && !student.placeOfBirthCell && !student.placeOfBirthVillage && (
                                    <p>N/A</p>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{student.smallgroup?.name || 'No Group'}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={studentStatusColors[student.status] || 'bg-gray-100'}
                              >
                                {studentStatusLabels[student.status] || student.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openGroupAssignModal(student)}
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
                                    <DropdownMenuItem onClick={() => openEditModal(student)}>
                                      <Edit className="mr-2 h-4 w-4" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'active')}>
                                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Mark Active
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'inactive')}>
                                      <XCircle className="mr-2 h-4 w-4 text-gray-500" /> Mark Inactive
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      disabled={student.status !== 'active'}
                                      onClick={() => setMigrationModal({ isOpen: true, student })}
                                    >
                                      <GraduationCap className="mr-2 h-4 w-4 text-blue-600" /> Migrate to Graduate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={student.status !== 'active'}
                                      onClick={() => setCampusMigrationModal({ isOpen: true, student })}
                                    >
                                      <UserPlus className="mr-2 h-4 w-4 text-sky-600" /> Migrate Campus to Campus
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openDeleteModal(student)}
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

              {/* Pagination */}
              {!loading && filteredStudents.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Student Form Modal */}
      <StudentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateStudent}
        title="Add New Student"
        universities={universities}
        smallGroups={smallGroups}
        regions={regions}
      />

      {/* Edit Student Form Modal */}
      {editingStudent && (
        <StudentForm
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSubmit={handleUpdateStudent}
          title="Edit Student"
          initialData={{
            fullName: editingStudent.fullName,
            sex: editingStudent.sex || 'Male',
            phone: editingStudent.phone || '',
            email: editingStudent.email || '',
            universityId: editingStudent.universityId.toString(),
            smallGroupId: editingStudent.smallGroupId?.toString() || '',
            course: editingStudent.course || '',
            yearOfStudy: editingStudent.yearOfStudy?.toString() || '',
            placeOfBirthProvince: editingStudent.placeOfBirthProvince || '',
            placeOfBirthDistrict: editingStudent.placeOfBirthDistrict || '',
            placeOfBirthSector: editingStudent.placeOfBirthSector || '',
            placeOfBirthCell: editingStudent.placeOfBirthCell || '',
            placeOfBirthVillage: editingStudent.placeOfBirthVillage || '',
            status: editingStudent.status,
            regionId: editingStudent.regionId?.toString() || '',
          }}
          universities={universities}
          smallGroups={smallGroups}
          regions={regions}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteModal.isOpen} onOpenChange={closeDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteModal.studentName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteStudent} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <MigrateStudentModal
        isOpen={migrationModal.isOpen}
        onClose={() => setMigrationModal({ isOpen: false, student: null })}
        student={migrationModal.student}
        onMigrate={handleMigrateStudent}
      />

      <MigrateCampusStudentModal
        isOpen={campusMigrationModal.isOpen}
        onClose={() => setCampusMigrationModal({ isOpen: false, student: null })}
        student={campusMigrationModal.student}
        regions={regions}
        universities={universities}
        onSubmit={handleCampusTransfer}
      />

      <AssignGroupModal
        isOpen={groupAssignModal.isOpen}
        onClose={() => setGroupAssignModal(prev => ({ ...prev, isOpen: false }))}
        entityId={groupAssignModal.studentId}
        currentGroupId={groupAssignModal.currentGroupId}
        smallGroups={
          groupAssignModal.studentId
            ? smallGroups.filter(
              (g) => g.universityId === students.find((s) => s.id === groupAssignModal.studentId)?.universityId
            )
            : smallGroups
        }
        onAssign={handleAssignGroup}
      />
    </SidebarProvider>
  );
}
