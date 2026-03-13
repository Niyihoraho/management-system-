'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import axios from 'axios';
import { ArrowRightLeft, Search, Loader2, Users } from 'lucide-react';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface MigrationItem {
    id: number;
    fullName: string;
    email: string;
    phone: string;
    fromUniversity: string;
    source: string;
    status: string;
    workflowStatus?: 'pending_student_completion' | 'ready_for_final_approval' | null;
    createdAt: string;
    processedAt: string | null;
}

export default function MigrationMembersPage() {
    const [items, setItems] = useState<MigrationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/migrations?status=PENDING');
            setItems(res.data.items || []);
        } catch (error) {
            console.error('Failed to fetch migrations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filtered = items.filter(item => {
        const q = searchQuery.toLowerCase();
        return (
            item.fullName.toLowerCase().includes(q) ||
            (item.email || '').toLowerCase().includes(q) ||
            (item.phone || '').toLowerCase().includes(q) ||
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
                                    <BreadcrumbPage>Migration Members</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="space-y-6 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                <ArrowRightLeft className="h-5 w-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Migration Members</h1>
                                <p className="text-sm text-muted-foreground">
                                    Migration progress before final registrations approval
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="text-base px-4 py-1.5">
                            <Users className="mr-2 h-4 w-4" />
                            {items.length} in progress
                        </Badge>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, phone, university..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-9"
                        />
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
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
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
                                            <ArrowRightLeft className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                                {searchQuery ? 'No results match your search' : 'No pending migration requests'}
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedItems.map((item) => (
                                        <TableRow key={`${item.id}-${item.workflowStatus ?? 'na'}`}>
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
                                            <TableCell className="text-right">
                                                {item.workflowStatus === 'pending_student_completion' ? (
                                                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                                        Pending Student Completion
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                                        Ready for Final Approval
                                                    </Badge>
                                                )}
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
                                Showing {startIndex + 1} to {Math.min(endIndex, filtered.length)} of {filtered.length} members
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
