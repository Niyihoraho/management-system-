"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, DollarSign, AlertCircle, MoreVertical } from 'lucide-react';
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
    };
}

const statusLabels: Record<string, string> = {
    want_to_support: 'Want to Support',
    already_supporting: 'Already Supporting',
    later: 'Decided Later',
};

const statusColors: Record<string, string> = {
    want_to_support: 'bg-blue-100 text-blue-800',
    already_supporting: 'bg-green-100 text-green-800',
    later: 'bg-gray-100 text-gray-800',
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

    // Fetch financial supports
    const fetchData = async () => {
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
    };

    // Load data on mount and when filters change
    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    // Filter locally by search term
    const filteredSupports = financialSupports.filter(support => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();

        return (
            support.graduate.fullName?.toLowerCase().includes(searchLower) ||
            support.graduate.email?.toLowerCase().includes(searchLower) ||
            support.graduate.phone?.includes(searchTerm)
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
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                                    />
                                </div>

                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Supporters</SelectItem>
                                        <SelectItem value="want_to_support">Want to Support</SelectItem>
                                        <SelectItem value="already_supporting">Already Supporting</SelectItem>
                                        <SelectItem value="later">Decided Later</SelectItem>
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
                                onClick={() => {/* TODO: Open add supporter modal */ }}
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
                                                filteredSupports.map((support) => (
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
                                                                    <p className="text-xs text-muted-foreground">ID: {support.graduate.id}</p>
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
                                                                        <DropdownMenuItem>
                                                                            <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem>
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
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
