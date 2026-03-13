"use client";

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, DollarSign, AlertCircle, MoreVertical, X } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
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
import { toast } from "sonner";

interface EligibleGraduate {
    id: number;
    fullName: string;
    email: string | null;
    phone: string | null;
    residenceProvince: string | null;
    profession: string | null;
}

interface FinancialSupport {
    id: number;
    supportStatus: string;
    supportFrequency: string | null;
    supportAmount: string | null;
    enableReminder: boolean;
    status: string;
    updatedAt: string;
    graduate: {
        id: number;
        fullName: string;
        email: string | null;
        phone: string | null;
        residenceProvince: string | null;
        residenceDistrict: string | null;
        isDiaspora: boolean;
    };
}

const statusLabels: Record<string, string> = {
    want_to_support: 'Want to Support',
    already_supporting: 'Already Supporting',
    later: 'Undecided',
};

const statusColors: Record<string, string> = {
    want_to_support: 'bg-blue-100 text-blue-800',
    already_supporting: 'bg-green-100 text-green-800',
    later: 'bg-yellow-100 text-yellow-800',
};

const frequencyLabels: Record<string, string> = {
    monthly: 'Monthly',
    half_year: 'Semi-Annual',
    full_year: 'Yearly',
};

export default function FinancialSupportPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [financialSupports, setFinancialSupports] = useState<FinancialSupport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [diasporaFilter, setDiasporaFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Add Supporter modal state
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [eligibleGraduates, setEligibleGraduates] = useState<EligibleGraduate[]>([]);
    const [graduateSearch, setGraduateSearch] = useState('');
    const [selectedGraduate, setSelectedGraduate] = useState<EligibleGraduate | null>(null);
    const [supportStatus, setSupportStatus] = useState('later');
    const [supportFrequency, setSupportFrequency] = useState('');
    const [supportAmount, setSupportAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [graduatesLoading, setGraduatesLoading] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingSupport, setEditingSupport] = useState<FinancialSupport | null>(null);
    const [editSupportStatus, setEditSupportStatus] = useState('later');
    const [editSupportFrequency, setEditSupportFrequency] = useState('');
    const [editSupportAmount, setEditSupportAmount] = useState('');
    const [editEnableReminder, setEditEnableReminder] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [remindingSupportId, setRemindingSupportId] = useState<number | null>(null);

    const requiresCommitment = supportStatus === 'want_to_support' || supportStatus === 'already_supporting';
    const editRequiresCommitment = editSupportStatus === 'want_to_support' || editSupportStatus === 'already_supporting';
    const normalizedAmount = supportAmount.trim();
    const isAddFormValid = Boolean(
        selectedGraduate &&
        supportStatus &&
        (!requiresCommitment || (supportFrequency && normalizedAmount))
    );

    const resetAddModalForm = () => {
        setSelectedGraduate(null);
        setGraduateSearch('');
        setSupportStatus('later');
        setSupportFrequency('');
        setSupportAmount('');
        setSubmitError(null);
    };

    const closeAddModal = () => {
        if (submitting) return;
        setAddModalOpen(false);
        resetAddModalForm();
    };

    const openEditModal = (support: FinancialSupport) => {
        setEditingSupport(support);
        setEditSupportStatus(support.supportStatus || 'later');
        setEditSupportFrequency(support.supportFrequency || '');
        setEditSupportAmount(support.supportAmount || '');
        setEditEnableReminder(Boolean(support.enableReminder));
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        if (editSubmitting) return;
        setEditModalOpen(false);
        setEditingSupport(null);
    };

    const handleSupportStatusChange = (value: string) => {
        setSupportStatus(value);
        setSubmitError(null);
        if (value === 'later') {
            setSupportFrequency('');
            setSupportAmount('');
        }
    };

    // Fetch financial supports
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await axios.get(`/api/financial-support?${params}`);
            setFinancialSupports(response.data.financialSupports || []);
        } catch (err) {
            console.error('Error fetching financial supports:', err);
            setError('Failed to fetch financial supports. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchTerm]);

    // Load data on mount and when filters change
    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    // Open add modal and fetch eligible graduates
    const openAddModal = async () => {
        setAddModalOpen(true);
        resetAddModalForm();
        setGraduatesLoading(true);
        try {
            const res = await axios.get('/api/financial-support/eligible-graduates');
            setEligibleGraduates(res.data.graduates || []);
        } catch {
            setEligibleGraduates([]);
            setSubmitError('Failed to load eligible graduates. Please retry.');
            toast.error('Failed to load eligible graduates.');
        } finally {
            setGraduatesLoading(false);
        }
    };

    const handleAddSupporter = async () => {
        if (!selectedGraduate) {
            setSubmitError('Please select a graduate.');
            toast.error('Please select a graduate.');
            return;
        }
        if (!supportStatus) {
            setSubmitError('Please select a support status.');
            toast.error('Please select a support status.');
            return;
        }
        if (requiresCommitment && !supportFrequency) {
            setSubmitError('Please choose support frequency.');
            toast.error('Support frequency is required.');
            return;
        }
        if (requiresCommitment && !normalizedAmount) {
            setSubmitError('Please enter support amount.');
            toast.error('Support amount is required.');
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        try {
            await axios.post('/api/financial-support', {
                graduateId: selectedGraduate.id,
                supportStatus,
                supportFrequency: requiresCommitment ? supportFrequency : null,
                supportAmount: requiresCommitment ? normalizedAmount : null,
                enableReminder: false,
            });
            toast.success(`${selectedGraduate.fullName} added successfully.`);
            closeAddModal();
            await fetchData();
        } catch (err: any) {
            const message = err?.response?.data?.error || 'Failed to add supporter. Please try again.';
            setSubmitError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateSupport = async () => {
        if (!editingSupport) return;

        if (!editSupportStatus) {
            toast.error('Please select a support status.');
            return;
        }
        if (editRequiresCommitment && !editSupportFrequency) {
            toast.error('Support frequency is required.');
            return;
        }
        if (editRequiresCommitment && !editSupportAmount.trim()) {
            toast.error('Support amount is required.');
            return;
        }
        if (editEnableReminder && !editSupportFrequency) {
            toast.error('Select support frequency to enable reminders.');
            return;
        }

        setEditSubmitting(true);
        try {
            await axios.patch(`/api/financial-support/${editingSupport.id}`, {
                supportStatus: editSupportStatus,
                supportFrequency: editRequiresCommitment ? editSupportFrequency : null,
                supportAmount: editRequiresCommitment ? editSupportAmount.trim() : null,
                enableReminder: editEnableReminder,
            });
            toast.success('Financial support details updated.');
            closeEditModal();
            await fetchData();
        } catch (err: any) {
            const message = err?.response?.data?.error || 'Failed to update supporter details.';
            toast.error(message);
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleSendReminder = async (support: FinancialSupport) => {
        setRemindingSupportId(support.id);
        try {
            const response = await axios.post(`/api/financial-support/${support.id}/reminder`);
            toast.success(response?.data?.message || 'Reminder sent successfully.');
            await fetchData();
        } catch (err: any) {
            const message = err?.response?.data?.error || 'Failed to send reminder.';
            toast.error(message);
        } finally {
            setRemindingSupportId(null);
        }
    };

    // Filter eligible graduates by search
    const filteredEligible = eligibleGraduates.filter(g => {
        if (!graduateSearch) return true;
        const q = graduateSearch.toLowerCase();
        return g.fullName.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q) || g.phone?.includes(graduateSearch);
    });

    // Filter locally by search term
    const filteredSupports = financialSupports.filter(support => {
        // Diaspora Filter
        if (diasporaFilter === 'diaspora' && !support.graduate.isDiaspora) return false;
        if (diasporaFilter === 'local' && support.graduate.isDiaspora) return false;

        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            support.graduate.fullName?.toLowerCase().includes(searchLower) ||
            support.graduate.email?.toLowerCase().includes(searchLower) ||
            support.graduate.phone?.includes(searchTerm)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filteredSupports.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSupports = filteredSupports.slice(startIndex, endIndex);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (value: string) => {
        setStatusFilter(value);
        setCurrentPage(1);
    };

    const handleDiasporaFilterChange = (value: string) => {
        setDiasporaFilter(value);
        setCurrentPage(1);
    };

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    return (
        <>
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
                                        <BreadcrumbLink href="/links/admin">
                                            Administration
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>Financial Support</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
                        <div className="max-w-7xl mx-auto w-full">
                            {/* Header */}
                            <div className="mb-4 sm:mb-6 lg:mb-8">
                                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Financial Support Management</h1>
                                <p className="text-sm sm:text-base text-muted-foreground">Manage and track financial support commitments</p>
                            </div>

                            {/* Search and Actions */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                                    {/* Search */}
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email, or phone..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                                        />
                                    </div>

                                    {/* Status Filter */}
                                    <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                        <SelectTrigger className="w-full sm:w-[200px]">
                                            <SelectValue placeholder="Filter by status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Graduates</SelectItem>
                                            <SelectItem value="later">Undecided</SelectItem>
                                            <SelectItem value="want_to_support">Want to Support</SelectItem>
                                            <SelectItem value="already_supporting">Already Supporting</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Diaspora Filter */}
                                    <Select value={diasporaFilter} onValueChange={handleDiasporaFilterChange}>
                                        <SelectTrigger className="w-full sm:w-[160px]">
                                            <SelectValue placeholder="All Graduates" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Graduates</SelectItem>
                                            <SelectItem value="diaspora">Diaspora Only</SelectItem>
                                            <SelectItem value="local">Local Only</SelectItem>
                                        </SelectContent>
                                    </Select>
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

                                {/* Add New Supporter Button */}
                                <Button
                                    onClick={openAddModal}
                                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all duration-200 shadow-sm text-sm sm:text-base"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add Supporter</span>
                                    <span className="sm:hidden">Add</span>
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

                            {/* Financial Supports Table */}
                            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                            <span className="text-lg font-medium">Loading financial supports...</span>
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
                                                    <TableHead className="font-semibold">Type</TableHead>
                                                    <TableHead className="font-semibold">Support Status</TableHead>
                                                    <TableHead className="font-semibold">Frequency</TableHead>
                                                    <TableHead className="font-semibold">Amount</TableHead>
                                                    <TableHead className="font-semibold">Reminder</TableHead>
                                                    <TableHead className="text-right font-semibold">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredSupports.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <DollarSign className="w-12 h-12 text-muted-foreground/50" />
                                                                <p>{searchTerm ? 'No supporters match your search' : 'No financial supporters found'}</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    paginatedSupports.map((support) => (
                                                        <TableRow key={support.id} className="hover:bg-muted/50">
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                        <span className="text-sm font-medium text-primary">
                                                                            {support.graduate.fullName.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-sm">{support.graduate.fullName}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    {support.graduate.email && (
                                                                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{support.graduate.email}</p>
                                                                    )}
                                                                    {support.graduate.phone && (
                                                                        <p className="text-xs text-muted-foreground">{support.graduate.phone}</p>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={support.graduate.isDiaspora ? "text-blue-600 border-blue-200 bg-blue-50" : "text-slate-600 border-slate-200 bg-slate-50"}>
                                                                    {support.graduate.isDiaspora ? "Diaspora" : "Local"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={statusColors[support.supportStatus] || 'bg-gray-100'}
                                                                >
                                                                    {statusLabels[support.supportStatus] || support.supportStatus}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm">
                                                                    {support.supportFrequency ? frequencyLabels[support.supportFrequency] : 'N/A'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm font-medium">
                                                                    {support.supportAmount || 'N/A'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant={support.enableReminder ? "default" : "outline"} className="text-xs">
                                                                    {support.enableReminder ? 'Enabled' : 'Disabled'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                                <MoreVertical className="w-4 h-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                            <DropdownMenuItem onClick={() => openEditModal(support)}>
                                                                                <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleSendReminder(support)}
                                                                                disabled={remindingSupportId === support.id}
                                                                            >
                                                                                <DollarSign className="mr-2 h-4 w-4 text-green-600" /> Send Reminder
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
                                {!loading && filteredSupports.length > 0 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {startIndex + 1} to {Math.min(endIndex, filteredSupports.length)} of {filteredSupports.length} supporters
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
            </SidebarProvider>

            {/* Add Supporter Modal */}
            <Dialog
                open={addModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeAddModal();
                        return;
                    }
                    setAddModalOpen(true);
                }}
            >
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Financial Supporter</DialogTitle>
                        <DialogDescription>Select a graduate and set their support details.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Graduate Picker */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Graduate</label>
                            {selectedGraduate ? (
                                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                    <div>
                                        <p className="font-medium text-sm">{selectedGraduate.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{selectedGraduate.email || selectedGraduate.phone}</p>
                                    </div>
                                    <button onClick={() => setSelectedGraduate(null)} className="text-muted-foreground hover:text-foreground">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="relative p-2 border-b">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search graduates..."
                                            value={graduateSearch}
                                            onChange={e => {
                                                setGraduateSearch(e.target.value);
                                                setSubmitError(null);
                                            }}
                                            className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent outline-none"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {graduatesLoading ? (
                                            <div className="flex items-center justify-center py-6 text-muted-foreground text-sm"><RefreshCw className="w-4 h-4 animate-spin mr-2" />Loading...</div>
                                        ) : filteredEligible.length === 0 ? (
                                            <div className="text-center py-6 text-sm text-muted-foreground">No eligible graduates found</div>
                                        ) : (
                                            filteredEligible.map(g => (
                                                <button
                                                    key={g.id}
                                                    onClick={() => {
                                                        setSelectedGraduate(g);
                                                        setSubmitError(null);
                                                    }}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                                                >
                                                    <p className="text-sm font-medium">{g.fullName}</p>
                                                    <p className="text-xs text-muted-foreground">{g.email || g.phone || g.residenceProvince || '—'}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Support Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Support Status</label>
                            <Select value={supportStatus} onValueChange={handleSupportStatusChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="later">Undecided (decide later)</SelectItem>
                                    <SelectItem value="want_to_support">Want to Support</SelectItem>
                                    <SelectItem value="already_supporting">Already Supporting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Frequency — only when committing */}
                        {requiresCommitment && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Frequency</label>
                                    <Select
                                        value={supportFrequency}
                                        onValueChange={(value) => {
                                            setSupportFrequency(value);
                                            setSubmitError(null);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="half_year">Semi-Annual</SelectItem>
                                            <SelectItem value="full_year">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Amount</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 10,000 RWF"
                                        value={supportAmount}
                                        onChange={e => {
                                            setSupportAmount(e.target.value);
                                            setSubmitError(null);
                                        }}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-transparent outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {submitError && (
                            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-md px-3 py-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {submitError}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={closeAddModal} disabled={submitting}>Cancel</Button>
                        <Button onClick={handleAddSupporter} disabled={submitting || !isAddFormValid}>
                            {submitting ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Add Supporter'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Supporter Modal */}
            <Dialog
                open={editModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditModal();
                        return;
                    }
                    setEditModalOpen(true);
                }}
            >
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Financial Support</DialogTitle>
                        <DialogDescription>
                            {editingSupport ? `Update support details for ${editingSupport.graduate.fullName}.` : 'Update support details.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Support Status</label>
                            <Select
                                value={editSupportStatus}
                                onValueChange={(value) => {
                                    setEditSupportStatus(value);
                                    if (value === 'later') {
                                        setEditSupportFrequency('');
                                        setEditSupportAmount('');
                                        setEditEnableReminder(false);
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="later">Undecided (decide later)</SelectItem>
                                    <SelectItem value="want_to_support">Want to Support</SelectItem>
                                    <SelectItem value="already_supporting">Already Supporting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {editRequiresCommitment && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Frequency</label>
                                    <Select value={editSupportFrequency} onValueChange={setEditSupportFrequency}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="half_year">Semi-Annual</SelectItem>
                                            <SelectItem value="full_year">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Amount</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 10,000 RWF"
                                        value={editSupportAmount}
                                        onChange={(e) => setEditSupportAmount(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border rounded-md bg-transparent outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reminder</label>
                            <Select
                                value={editEnableReminder ? 'enabled' : 'disabled'}
                                onValueChange={(value) => setEditEnableReminder(value === 'enabled')}
                                disabled={!editRequiresCommitment || !editSupportFrequency}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select reminder setting" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="enabled">Enabled</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                            {(!editRequiresCommitment || !editSupportFrequency) && (
                                <p className="text-xs text-muted-foreground">Choose status and frequency to enable reminders.</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={closeEditModal} disabled={editSubmitting}>Cancel</Button>
                        <Button onClick={handleUpdateSupport} disabled={editSubmitting}>
                            {editSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
