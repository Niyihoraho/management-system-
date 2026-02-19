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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, FileText, Download, Star } from "lucide-react";
import { EvaluationModal } from "@/components/reporting/evaluation-modal";

type ReportSubmission = {
    id: number;
    createdAt: string;
    priority: { name: string };
    user: { name: string | null; email: string | null };
    activities: { id: number; participantCount: number }[];
    evaluations: { id: number }[];
    priorityId: number;
};

type ConfigData = {
    id: number;
    name: string;
    description: string;
    questions: { id: number; statement: string }[];
};

export default function AdminReportsPage() {
    const [reports, setReports] = useState<ReportSubmission[]>([]);
    const [config, setConfig] = useState<ConfigData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [selectedReport, setSelectedReport] = useState<ReportSubmission | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchReports = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/reports");
            if (!res.ok) throw new Error("Failed to fetch reports");
            const data = await res.json();
            setReports(data);
        } catch (err) {
            console.error(err);
            setError("Failed to load reports. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/reporting/config");
            const data = await res.json();
            setConfig(data);
        } catch (error) {
            console.error("Failed to load config", error);
        }
    };

    useEffect(() => {
        fetchReports();
        fetchConfig();
    }, []);

    const filteredReports = reports.filter(report =>
        report.priority.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.user.name && report.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.user.email && report.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                                    <BreadcrumbPage>Submitted Reports</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Submitted Reports</h1>
                                <p className="text-muted-foreground">View and manage strategic reports from all users.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                                {/* Export button placeholder */}
                                <Button variant="default" size="sm">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export CSV
                                </Button>
                            </div>
                        </div>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle>All Submissions</CardTitle>
                                <div className="flex items-center gap-2 max-w-sm mt-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Search by user or priority..."
                                            className="pl-8"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {error ? (
                                    <div className="bg-destructive/10 text-destructive p-4 rounded-md">
                                        {error}
                                    </div>
                                ) : loading ? (
                                    <div className="flex justify-center py-8">
                                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filteredReports.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
                                        <p>No reports found matching your criteria.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date Submitted</TableHead>
                                                    <TableHead>Submitted By</TableHead>
                                                    <TableHead>Strategic Priority</TableHead>
                                                    <TableHead className="text-right">Activities</TableHead>
                                                    <TableHead className="text-right">Total Participants</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredReports.map((report) => (
                                                    <TableRow key={report.id}>
                                                        <TableCell className="font-medium">
                                                            {format(new Date(report.createdAt), "MMM d, yyyy")}
                                                            <div className="text-xs text-muted-foreground">
                                                                {format(new Date(report.createdAt), "h:mm a")}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{report.user.name || "Unknown"}</div>
                                                            <div className="text-xs text-muted-foreground">{report.user.email}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{report.priority.name}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {report.activities.length}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {report.activities.reduce((sum, act) => sum + act.participantCount, 0).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {report.evaluations.length > 0 ? (
                                                                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                                                                        Evaluated
                                                                    </Badge>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                        onClick={() => {
                                                                            setSelectedReport(report);
                                                                            setIsModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Star className="h-3.5 w-3.5" />
                                                                        Evaluate
                                                                    </Button>
                                                                )}
                                                                <Button variant="ghost" size="sm" asChild>
                                                                    {/* Link to details page - TODO */}
                                                                    <a href={`/admin/reports/${report.id}`}>View</a>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <EvaluationModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            report={selectedReport}
                            config={selectedReport ? config.find(c => c.id === selectedReport.priorityId) : undefined}
                            onSuccess={fetchReports}
                        />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
