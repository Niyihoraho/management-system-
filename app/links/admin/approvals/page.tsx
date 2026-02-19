"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Eye, Search, RefreshCw, MapPin } from "lucide-react";

// Types matching API response
type RegistrationRequest = {
    id: number;
    type: "student" | "graduate";
    fullName: string;
    email: string | null;
    phone: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    payload: any;
};

export default function AdminApprovalsPage() {
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/approvals");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setRequests(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (action: "approve" | "reject") => {
        if (!selectedRequest) return;
        try {
            setActionLoading(true);
            const res = await fetch("/api/admin/approvals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestId: selectedRequest.id,
                    action,
                }),
            });

            if (!res.ok) throw new Error("Action failed");

            // Success
            await fetchRequests();
            setSelectedRequest(null);
        } catch (error) {
            console.error(error);
            alert("Failed to process request");
        } finally {
            setActionLoading(false);
        }
    };

    // Filter requests based on search term
    const filteredRequests = requests.filter(req => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            req.fullName.toLowerCase().includes(searchLower) ||
            (req.email && req.email.toLowerCase().includes(searchLower))
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
                                    <BreadcrumbLink href="/links/admin/user-management">
                                        Admin
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Approvals</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 lg:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Pending Approvals</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Review and authorize new member registrations.</p>
                        </div>

                        {/* Search and Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                                    />
                                </div>

                                {/* Refresh Button */}
                                <button
                                    onClick={fetchRequests}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Requests Table */}
                        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Loading requests...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[600px]">
                                        <thead className="bg-muted/50 border-b border-border">
                                            <tr>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Type
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Contact
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-card divide-y divide-border">
                                            {filteredRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-muted/50">
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-foreground">
                                                        {format(new Date(req.createdAt), "MMM d, yyyy")}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground">
                                                        {req.fullName}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                                                        <Badge variant={req.type === "student" ? "default" : "secondary"}>
                                                            {req.type.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-muted-foreground">
                                                        <div className="flex flex-col">
                                                            <span>{req.email || "-"}</span>
                                                            <span className="text-xs">{req.phone || "-"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setSelectedRequest(req)}
                                                            className="gap-2 h-8"
                                                        >
                                                            <Eye className="size-3.5" /> Review
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Empty State */}
                            {!loading && filteredRequests.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">No pending approvals</h3>
                                    <p className="text-muted-foreground text-center mb-4">
                                        {searchTerm ? 'No requests match your search.' : 'There are no registration requests pending approval.'}
                                    </p>
                                </div>
                            )}

                            {/* Table Footer */}
                            {!loading && filteredRequests.length > 0 && (
                                <div className="bg-muted/50 px-3 sm:px-6 py-3 border-t border-border">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                            Showing <span className="font-medium text-foreground">{filteredRequests.length}</span> pending requests
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Review Dialog */}
                <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Review Registration Request</DialogTitle>
                            <DialogDescription>
                                Verify the details below before approving. This will create a permanent{" "}
                                {selectedRequest?.type} record.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedRequest && (
                            <div className="grid grid-cols-2 gap-6 py-4">
                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                                        Personal Details
                                    </h4>
                                    <div className="grid gap-2 text-sm">
                                        <div className="flex justify-between border-b border-border pb-2">
                                            <span className="text-muted-foreground">Full Name</span>
                                            <span className="font-medium">{selectedRequest.fullName}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border pb-2">
                                            <span className="text-muted-foreground">Email</span>
                                            <span className="font-medium">{selectedRequest.email}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border pb-2">
                                            <span className="text-muted-foreground">Phone</span>
                                            <span className="font-medium">{selectedRequest.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                                        {selectedRequest.type === "student" ? "Academic" : "Profile"} Details
                                    </h4>
                                    <div className="grid gap-2 text-sm bg-muted/50 p-4 rounded-lg border border-border">
                                        {selectedRequest.type === "student" ? (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">University</span>
                                                    <span>{selectedRequest.payload.university}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Course</span>
                                                    <span>{selectedRequest.payload.course}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Year</span>
                                                    <span>{selectedRequest.payload.yearOfStudy}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">University</span>
                                                    <span>{selectedRequest.payload.university}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Grad Year</span>
                                                    <span>{selectedRequest.payload.graduationYear}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Diaspora</span>
                                                    <span>{selectedRequest.payload.isDiaspora ? "Yes" : "No"}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="destructive"
                                onClick={() => handleAction("reject")}
                                disabled={actionLoading}
                                className="gap-2"
                            >
                                <XCircle className="size-4" /> Reject
                            </Button>
                            <Button
                                onClick={() => handleAction("approve")}
                                disabled={actionLoading}
                                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                                {actionLoading ? (
                                    <Loader2 className="animate-spin size-4" />
                                ) : (
                                    <CheckCircle className="size-4" />
                                )}
                                Approve & Create Record
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SidebarInset>
        </SidebarProvider>
    );
}
