"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
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
import { RefreshCw, Search, FileText, Download, Star, Eye, Loader2 } from "lucide-react";
import { EvaluationModal } from "@/components/reporting/evaluation-modal";
import { ViewActivityModal } from "@/app/components/reporting/view-activity-modal";
import { useToast } from "@/components/ui/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReportSubmission = {
    id: number;
    createdAt: string;
    priorityId: number | null;
    priority: { id: number; name: string } | null;
    user: { name: string | null; email: string | null };
    activities: {
        id: number;
        categoryId: number;
        categoryName: string | null;
        activityName: string;
        participantCount: number;
        dateOccurred: string | null;
        imageUrl: string;
        imageUrlSecondary: string;
    }[];
    evaluations: { id: number; questionId: number; rating: string }[];
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
    const [selectedExportPillars, setSelectedExportPillars] = useState<number[]>([]);
    const [selectAllPillars, setSelectAllPillars] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Modal State
    const [selectedReport, setSelectedReport] = useState<ReportSubmission | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const { toast } = useToast();

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

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredReports = useMemo(() => {
        return reports.filter((report) => {
            if (!normalizedSearch) return true;

            const priorityName = report.priority?.name?.toLowerCase() ?? "";
            const userName = report.user.name?.toLowerCase() ?? "";
            const userEmail = report.user.email?.toLowerCase() ?? "";

            return (
                priorityName.includes(normalizedSearch) ||
                userName.includes(normalizedSearch) ||
                userEmail.includes(normalizedSearch)
            );
        });
    }, [reports, normalizedSearch]);

    const groupedData = useMemo(() => {
        const map = new Map<number, any>();

        filteredReports.forEach(report => {
            if (!report.priorityId || !report.priority) return;
            const pId = report.priorityId;

            if (!map.has(pId)) {
                map.set(pId, {
                    priorityId: pId,
                    priorityName: report.priority.name,
                    reports: [],
                    categories: [],
                    evaluated: false
                });
            }

            const pillarGroup = map.get(pId);
            pillarGroup.reports.push(report);
            if (report.evaluations && report.evaluations.length > 0) {
                pillarGroup.evaluated = true;
            }

            report.activities.forEach(act => {
                const catId = act.categoryId;
                let catGroup = pillarGroup.categories.find((c: any) => c.categoryId === catId);
                if (!catGroup) {
                    catGroup = {
                        categoryId: catId,
                        categoryName: act.categoryName || `Category ${catId}`,
                        activities: []
                    };
                    pillarGroup.categories.push(catGroup);
                }

                catGroup.activities.push({
                    ...act,
                    reportId: report.id,
                    reportCreatedAt: report.createdAt,
                    user: report.user
                });
            });
        });

        return Array.from(map.values());
    }, [filteredReports]);

    const submittedPillars = useMemo(() => {
        return groupedData.map((pillar) => ({
            id: pillar.priorityId,
            name: pillar.priorityName,
        }));
    }, [groupedData]);

    useEffect(() => {
        setSelectedExportPillars((prev) =>
            prev.filter((pillarId) => submittedPillars.some((pillar) => pillar.id === pillarId))
        );
    }, [submittedPillars]);

    useEffect(() => {
        if (selectAllPillars) {
            setSelectedExportPillars(submittedPillars.map((pillar) => pillar.id));
        }
    }, [selectAllPillars, submittedPillars]);

    const toggleSelectAllSubmitted = (checked: boolean) => {
        setSelectAllPillars(checked);
        if (!checked) {
            setSelectedExportPillars([]);
        } else {
            setSelectedExportPillars(submittedPillars.map((pillar) => pillar.id));
        }
    };

    const togglePillarSelection = (pillarId: number, checked: boolean) => {
        setSelectAllPillars(false);
        setSelectedExportPillars((prev) => {
            if (checked) {
                if (prev.includes(pillarId)) return prev;
                return [...prev, pillarId];
            }
            return prev.filter((id) => id !== pillarId);
        });
    };

    const handleExportSelected = async () => {
        if (submittedPillars.length === 0 || exporting) return;

        const selectedIds = selectAllPillars
            ? Array.from(new Set(submittedPillars.map((pillar) => pillar.id)))
            : Array.from(new Set(selectedExportPillars));

        const exportingAll = selectAllPillars || selectedIds.length === submittedPillars.length;

        if (!exportingAll && selectedIds.length === 0) {
            toast({ title: "Select at least one pillar", description: "Choose which submitted pillars to export." });
            return;
        }

        setExporting(true);
        try {
            const payload = { pillarIds: selectedIds };
            const res = await fetch("/api/reports/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                cache: "no-store",
            });

            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.error || "Failed to export PDF");
            }

            const blob = await res.blob();
            if (!blob || blob.size === 0) {
                throw new Error("Received an empty PDF response");
            }
            const url = URL.createObjectURL(blob);
            const filenameBase = exportingAll ? "all" : selectedIds.join("-");
            const filename = `gbu-strategic-report-${filenameBase}-${new Date().toISOString().split("T")[0]}.pdf`;

            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 5000);

            const selectionLabel = exportingAll
                ? "All submitted priorities"
                : submittedPillars
                    .filter((pillar) => selectedIds.includes(pillar.id))
                    .map((pillar) => pillar.name)
                    .join(", ");

            toast({
                title: "PDF export ready",
                description: selectionLabel || "Selected pillars exported.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Failed to export PDF",
                description: error instanceof Error ? error.message : "Unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setExporting(false);
        }
    };

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
                                {/* Export Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="default" size="sm">
                                            <Download className="mr-2 h-4 w-4" />
                                            Export PDF
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[300px]">
                                        <DropdownMenuLabel>Select Pillars to Export</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem
                                            checked={selectAllPillars}
                                            onSelect={(event) => event.preventDefault()}
                                            onCheckedChange={(checked) => toggleSelectAllSubmitted(Boolean(checked))}
                                        >
                                            Export All Submitted Priorities
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuSeparator />
                                        {submittedPillars.length === 0 ? (
                                            <div className="px-3 py-2 text-xs text-muted-foreground">
                                                No pillars have submissions yet.
                                            </div>
                                        ) : (
                                            submittedPillars.map((pillar) => (
                                                <DropdownMenuCheckboxItem
                                                    key={`export-pillar-${pillar.id}`}
                                                    checked={selectAllPillars || selectedExportPillars.includes(pillar.id)}
                                                    onSelect={(event) => event.preventDefault()}
                                                    onCheckedChange={(checked) => togglePillarSelection(pillar.id, Boolean(checked))}
                                                >
                                                    {pillar.name}
                                                </DropdownMenuCheckboxItem>
                                            ))
                                        )}
                                        <DropdownMenuSeparator />
                                        <div className="px-3 pb-2">
                                            <Button
                                                size="sm"
                                                className="w-full"
                                                onClick={handleExportSelected}
                                                disabled={submittedPillars.length === 0 || exporting}
                                            >
                                                {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {exporting ? "Preparing..." : "Export Selection"}
                                            </Button>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                ) : groupedData.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <FileText className="mx-auto h-12 w-12 opacity-20 mb-3" />
                                        <p>No reports found matching your criteria.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Strategic Priority / Activity</TableHead>
                                                    <TableHead>Date / Time</TableHead>
                                                    <TableHead>Submitted By</TableHead>
                                                    <TableHead className="text-right">Total Participants</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupedData.flatMap((pillar) => {
                                                    const priorityConfig = config.find((c) => c.id === pillar.priorityId);
                                                    const canEvaluate = Boolean(priorityConfig);
                                                    const repForEval = pillar.reports[0];

                                                    const rows = [];

                                                    // Pillar Row
                                                    rows.push(
                                                        <TableRow key={`pillar-${pillar.priorityId}`} className="bg-muted/50 hover:bg-muted/50">
                                                            <TableCell colSpan={3} className="font-bold text-base border-l-4 border-l-primary/60">
                                                                {pillar.priorityName}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold">
                                                                {pillar.categories.reduce((sum: number, cat: any) => sum + cat.activities.reduce((s: number, a: any) => s + (a.participantCount ?? 0), 0), 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant={pillar.evaluated ? "secondary" : "outline"}
                                                                        className={pillar.evaluated
                                                                            ? "h-8 gap-1 bg-green-100 text-green-800 hover:bg-green-200"
                                                                            : "h-8 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 bg-white"}
                                                                        disabled={!canEvaluate}
                                                                        onClick={() => {
                                                                            if (!canEvaluate || !repForEval) return;
                                                                            setSelectedReport(repForEval);
                                                                            setIsModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Star className="h-3.5 w-3.5" />
                                                                        {pillar.evaluated ? "Re-evaluate" : "Evaluate Pillar"}
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );

                                                    // Category Rows
                                                    pillar.categories.forEach((cat: any) => {
                                                        rows.push(
                                                            <TableRow key={`cat-${pillar.priorityId}-${cat.categoryId}`} className="bg-muted/10 hover:bg-muted/10">
                                                                <TableCell colSpan={5} className="font-semibold pl-8 text-sm text-foreground/80 border-l-4 border-l-primary/30">
                                                                    {cat.categoryName}
                                                                </TableCell>
                                                            </TableRow>
                                                        );

                                                        // Activity Rows
                                                        cat.activities.forEach((act: any) => {
                                                            rows.push(
                                                                <TableRow key={`act-${act.reportId}-${act.id}`}>
                                                                    <TableCell className="pl-14">
                                                                        <span className="font-medium text-sm">{act.activityName}</span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className="whitespace-nowrap">
                                                                            {format(new Date(act.reportCreatedAt), "MMM d, yyyy")}
                                                                        </span>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {format(new Date(act.reportCreatedAt), "h:mm a")}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="font-medium">{act.user.name || "Unknown"}</div>
                                                                        <div className="text-xs text-muted-foreground">{act.user.email || "N/A"}</div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-muted-foreground">
                                                                        {act.participantCount?.toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 text-primary hover:text-primary/80"
                                        onClick={() => {
                                            setSelectedActivity(act);
                                            setIsViewModalOpen(true);
                                        }}
                                    >
                                        <Eye className="h-4 w-4" />
                                        View
                                    </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        });
                                                    });

                                                    return rows;
                                                })}
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
                            config={selectedReport && selectedReport.priorityId ? config.find(c => c.id === selectedReport.priorityId) : undefined}
                            onSuccess={fetchReports}
                        />

                        <ViewActivityModal
                            isOpen={isViewModalOpen}
                            onClose={() => setIsViewModalOpen(false)}
                            activity={selectedActivity}
                            onUpdated={fetchReports}
                            onDeleted={() => {
                                fetchReports();
                                setSelectedActivity(null);
                                setIsViewModalOpen(false);
                            }}
                        />

                    </div>
                </div>

            </SidebarInset>
        </SidebarProvider>
        );
}
