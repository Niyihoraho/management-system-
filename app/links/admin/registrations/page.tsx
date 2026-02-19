'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { RefreshCw, Check, X, User, GraduationCap, Phone, Mail, Clock } from 'lucide-react';
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
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface RegistrationRequest {
    id: number;
    type: 'student' | 'graduate';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    fullName: string;
    phone: string;
    email: string | null;
    createdAt: string;
    payload: any;
    invitationLink?: {
        slug: string;
        description: string;
    };
}

export default function RegistrationsPage() {
    const { data: session, status } = useSession();
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/registrations'); // We need to create this API
            setRequests(res.data.requests || []);
        } catch (error) {
            console.error('Failed to fetch registrations', error);
            toast.error("Failed to load registration requests");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!selectedRequest) return;
        setIsProcessing(true);
        try {
            await axios.post(`/api/registrations/${action}`, {
                id: selectedRequest.id
            });
            toast.success(`Request ${action}d successfully`);
            setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
            setSelectedRequest(null);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data || `Failed to ${action} request`);
        } finally {
            setIsProcessing(false);
        }
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
                                    <BreadcrumbLink href="/links/admin">Admin</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Registrations</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
                                <p className="text-muted-foreground mt-1">
                                    Review and approve new member registrations.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Loading requests...</span>
                                    </div>
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                                    <p className="text-muted-foreground">No pending registrations found.</p>
                                </div>
                            ) : (
                                requests.map(req => (
                                    <div key={req.id} className="bg-card border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${req.type === 'student' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                    }`}>
                                                    {req.type === 'student' ? <User className="w-3 h-3 mr-1" /> : <GraduationCap className="w-3 h-3 mr-1" />}
                                                    {req.type.toUpperCase()}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Via: {req.invitationLink?.description || req.invitationLink?.slug || 'Direct'}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-lg">{req.fullName}</h3>
                                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {req.phone}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" /> {req.email || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" onClick={() => setSelectedRequest(req)}>
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Detail Modal */}
                <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Review Registration</DialogTitle>
                            <DialogDescription>
                                Verify the details below before approving.
                            </DialogDescription>
                        </DialogHeader>

                        {selectedRequest && (
                            <div className="py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Full Name</h4>
                                        <p className="font-medium">{selectedRequest.fullName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                                        <p className="font-medium capitalize">{selectedRequest.type}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Phone</h4>
                                        <p className="font-medium">{selectedRequest.phone}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                                        <p className="font-medium">{selectedRequest.email}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-muted-foreground">Additional Details</h4>
                                    <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                                        {Object.entries(selectedRequest.payload).map(([key, value]) => {
                                            if (['fullName', 'phone', 'email', 'type', 'invitationLinkId', 'role_description'].includes(key)) return null;
                                            return (
                                                <div key={key} className="grid grid-cols-[140px_1fr]">
                                                    <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                                    <span>{String(value)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleAction('reject')} disabled={isProcessing}>
                                <X className="w-4 h-4 mr-2" />
                                Reject
                            </Button>
                            <div className="flex-1" />
                            <Button variant="secondary" onClick={() => setSelectedRequest(null)} disabled={isProcessing}>
                                Cancel
                            </Button>
                            <Button onClick={() => handleAction('approve')} disabled={isProcessing}>
                                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                Approve & Create Account
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SidebarInset>
        </SidebarProvider>
    );
}
