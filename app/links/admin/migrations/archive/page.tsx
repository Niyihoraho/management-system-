'use client';

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Archive, Search, Loader2, CheckCircle2, Filter } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MigrationItem {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    fromUniversity: string;
    source: string;
    status: string;
    createdAt: string;
    processedAt: string | null;
}

export default function MigrationArchivePage() {
    const [items, setItems] = useState<MigrationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [totalApproved, setTotalApproved] = useState(0);
    const [universities, setUniversities] = useState<string[]>([]);
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ status: 'APPROVED' });
            if (selectedYear && selectedYear !== 'all') {
                params.set('year', selectedYear);
            }
            if (selectedUniversity && selectedUniversity !== 'all') {
                params.set('university', selectedUniversity);
            }
            const res = await axios.get(`/api/migrations?${params.toString()}`);
            setItems(res.data.items || []);
            setTotalApproved(res.data.totalApproved || 0);
            setUniversities(res.data.universities || []);
            setAvailableYears(res.data.availableYears || []);
        } catch (error) {
            console.error('Failed to fetch migration archive:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedUniversity]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = items.filter(item => {
        const q = searchQuery.toLowerCase();
        return (
            item.fullName.toLowerCase().includes(q) ||
            item.email.toLowerCase().includes(q) ||
            item.phone.toLowerCase().includes(q) ||
            item.fromUniversity.toLowerCase().includes(q)
        );
    });

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const handleYearChange = (value: string) => {
        setSelectedYear(value);
        setCurrentPage(1);
    };

    const handleUniversityChange = (value: string) => {
        setSelectedUniversity(value);
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
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/links/admin/migrations">Migration</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Archive</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="space-y-6 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                <Archive className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Migration Archive</h1>
                                <p className="text-sm text-muted-foreground">
                                    Approved migration records
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <div>
                                <p className="text-xs text-emerald-600 font-medium">Total Completed</p>
                                <p className="text-xl font-bold text-emerald-700">{totalApproved}</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, phone..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={selectedYear} onValueChange={handleYearChange}>
                                <SelectTrigger className="w-[130px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Select value={selectedUniversity} onValueChange={handleUniversityChange}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="University" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Universities</SelectItem>
                                {universities.map(uni => (
                                    <SelectItem key={uni} value={uni}>
                                        {uni}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>From University</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead>Approved On</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10">
                                            <Archive className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                                {searchQuery || selectedYear !== 'all' || selectedUniversity !== 'all'
                                                    ? 'No results match your filters'
                                                    : 'No archived migrations yet'}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.fullName}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.email}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.phone}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">
                                                    {item.fromUniversity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        item.source === 'student_migration'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }
                                                >
                                                    {item.source === 'student_migration' ? 'Student Migration' : 'Registration'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {item.processedAt
                                                    ? new Date(item.processedAt).toLocaleDateString()
                                                    : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {!loading && filtered.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border rounded-b-md">
                            <div className="text-sm text-muted-foreground">
                                Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} records
                                {selectedYear !== 'all' && ` for ${selectedYear}`}
                                {selectedUniversity !== 'all' && ` from ${selectedUniversity}`}
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
            </SidebarInset>
        </SidebarProvider>
    );
}
