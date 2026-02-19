'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import { Search, RefreshCw, Plus, Trash2, Copy, ExternalLink, QrCode } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { CreateInvitationModal } from "@/components/create-invitation-modal";
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

interface InvitationLink {
    id: string;
    slug: string;
    type: 'student' | 'graduate';
    expiration: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    creator: {
        name: string | null;
        email: string | null;
    };
    _count?: {
        requests: number;
    };
}

export default function InvitationsPage() {
    const { data: session, status } = useSession();
    const [links, setLinks] = useState<InvitationLink[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLinks = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/invitations');
            setLinks(res.data.links || []);
        } catch (error) {
            console.error('Failed to fetch links', error);
            toast.error("Failed to load invitation links");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLinks();
    }, [fetchLinks]);

    const copyToClipboard = (slug: string) => {
        const url = `${window.location.origin}/join/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    const deleteLink = async (id: string) => {
        if (!confirm("Are you sure you want to delete this link? It will stop working immediately.")) return;
        try {
            await axios.delete(`/api/invitations?id=${id}`);
            toast.success("Link deleted");
            fetchLinks();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete link");
        }
    }

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
                                    <BreadcrumbPage>Invitations</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Public Invitations</h1>
                                <p className="text-muted-foreground mt-1">
                                    Manage entry points for public registration.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={fetchLinks} disabled={loading}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                                <CreateInvitationModal onLinkCreated={fetchLinks}>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create New Link
                                    </Button>
                                </CreateInvitationModal>
                            </div>
                        </div>

                        <div className="rounded-md border bg-card">
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm text-left">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Campaign / Slug</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Target</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Created By</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Submissions</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="h-24 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        <span>Loading invitations...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : links.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="h-24 text-center">
                                                    No active invitation links found. Create one to get started.
                                                </td>
                                            </tr>
                                        ) : (
                                            links.map((link) => {
                                                const isExpired = new Date(link.expiration) < new Date();
                                                return (
                                                    <tr key={link.id} className="border-b transition-colors hover:bg-muted/50">
                                                        <td className="p-4 align-middle">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{link.description || 'No description'}</span>
                                                                <code className="text-xs bg-muted px-1 py-0.5 rounded w-fit mt-1">/join/{link.slug}</code>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${link.type === 'student' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                {link.type.toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 align-middle text-muted-foreground">
                                                            {link.creator.name || 'Unknown'}
                                                            <div className="text-xs">{new Date(link.createdAt).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-semibold">{link._count?.requests || 0}</span>
                                                                <span className="text-muted-foreground text-xs">pending</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-middle">
                                                            {isExpired ? (
                                                                <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs">Expired</span>
                                                            ) : (
                                                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">Active</span>
                                                            )}
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                Exp: {new Date(link.expiration).toLocaleDateString()}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-middle text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(link.slug)} title="Copy URL">
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                                <Link href={`/join/${link.slug}`} target="_blank">
                                                                    <Button variant="ghost" size="icon" title="Test Link">
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteLink(link.id)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
