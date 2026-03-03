"use client";

import { useEffect, useState, useMemo, useRef, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
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
import { RefreshCw, Search, FileText, Download, Star, Eye, Loader2, ChevronDown, ChevronRight, MapPin, Users, Building2 } from "lucide-react";
import { EvaluationModal } from "@/components/reporting/evaluation-modal";
import { ViewActivityModal } from "@/app/components/reporting/view-activity-modal";
import { useToast } from "@/components/ui/use-toast";
import { useRoleAccess } from "@/app/components/providers/role-access-provider";
import ReportPdfTemplate, { type ReportData } from "@/app/components/reporting/report-pdf-template";
import { generatePdf } from "@/lib/generate-pdf";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import JSZip from "jszip";

type ReportSubmission = {
    id: number;
    createdAt: string;
    priorityId: number | null;
    priority: { id: number; name: string } | null;
    regionName: string;
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

function RegionRow({
    region,
    index,
    config,
    setSelectedReport,
    setIsModalOpen,
    setSelectedActivity,
    setIsViewModalOpen
}: {
    region: any;
    index: number;
    config: any[];
    setSelectedReport: any;
    setIsModalOpen: any;
    setSelectedActivity: any;
    setIsViewModalOpen: any;
}) {
    const [isOpen, setIsOpen] = useState(true);

    const totalParticipants = region.pillars.reduce((sum: number, p: any) =>
        sum + p.categories.reduce((catSum: number, cat: any) =>
            catSum + cat.activities.reduce((actSum: number, act: any) => actSum + (act.participantCount ?? 0), 0)
            , 0)
        , 0);

    return (
        <>
            <TableRow
                className={`
                    group transition-colors border-b-2 border-b-primary/10 hover:bg-muted/30
                    ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}
                `}
            >
                <TableCell className="font-bold py-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-muted"
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <MapPin className="h-5 w-5 text-primary/80" />
                        <span className="text-base text-foreground uppercase tracking-wide">REGION: {region.regionName}</span>
                        <span className="text-xs font-normal text-muted-foreground ml-2">
                            ({region.pillars.length} Strategic Priorities)
                        </span>
                    </div>
                </TableCell>
                <TableCell colSpan={2} />
                <TableCell className="text-right font-bold text-primary text-base">
                    {totalParticipants.toLocaleString()}
                </TableCell>
                <TableCell />
            </TableRow>

            {isOpen && region.pillars.map((pillar: any) => {
                const priorityConfig = config.find((c) => c.id === pillar.priorityId);
                const canEvaluate = Boolean(priorityConfig);
                const repForEval = pillar.reports[0];

                return (
                    <Fragment key={`pillar-${region.regionName}-${pillar.priorityId}`}>
                        <TableRow className="bg-muted/20 hover:bg-muted/30 border-t">
                            <TableCell colSpan={3} className="font-bold text-sm pl-12 border-l-4 border-l-primary/60">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary/70" />
                                    {pillar.priorityName}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                                {pillar.categories.reduce((sum: number, cat: any) => sum + cat.activities.reduce((s: number, a: any) => s + (a.participantCount ?? 0), 0), 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant={pillar.evaluated ? "secondary" : "outline"}
                                        className={pillar.evaluated
                                            ? "h-7 gap-1 bg-green-100 text-green-800 hover:bg-green-200 text-xs"
                                            : "h-7 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 bg-white text-xs"}
                                        disabled={!canEvaluate}
                                        onClick={() => {
                                            if (!canEvaluate || !repForEval) return;
                                            setSelectedReport(repForEval);
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        <Star className="h-3 w-3" />
                                        {pillar.evaluated ? "Re-evaluate" : "Evaluate Pillar"}
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>

                        {pillar.categories.map((cat: any) => (
                            <Fragment key={`cat-${region.regionName}-${pillar.priorityId}-${cat.categoryId}`}>
                                <TableRow className="bg-transparent hover:bg-muted/10 border-none">
                                    <TableCell colSpan={5} className="font-semibold pl-16 py-2 text-xs text-muted-foreground uppercase tracking-wider">
                                        {cat.categoryName}
                                    </TableCell>
                                </TableRow>

                                {cat.activities.map((act: any) => (
                                    <TableRow key={`act-${region.regionName}-${act.reportId}-${act.id}`} className="hover:bg-muted/5 border-none">
                                        <TableCell className="pl-16 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                <span className="font-medium text-sm">{act.activityName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <span className="whitespace-nowrap text-sm text-foreground/90">
                                                {format(new Date(act.reportCreatedAt), "MMM d, yyyy")}
                                            </span>
                                            <div className="text-xs text-muted-foreground">
                                                {format(new Date(act.reportCreatedAt), "h:mm a")}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <div className="font-medium text-sm text-foreground/90">{act.user.name || "Unknown"}</div>
                                            <div className="text-xs text-muted-foreground">{act.user.email || "N/A"}</div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground py-2 font-medium">
                                            {act.participantCount?.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right py-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 gap-1 text-primary hover:bg-primary/5 hover:text-primary"
                                                onClick={() => {
                                                    setSelectedActivity(act);
                                                    setIsViewModalOpen(true);
                                                }}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </Fragment>
                        ))}
                    </Fragment>
                );
            })}
        </>
    );
}

type ConfigData = {
    id: number;
    name: string;
    description: string;
    questions: { id: number; statement: string }[];
};

export default function AdminReportsPage() {
    const router = useRouter();
    const { userRole, isLoading: roleLoading } = useRoleAccess();
    const [reports, setReports] = useState<ReportSubmission[]>([]);
    const [config, setConfig] = useState<ConfigData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedExportItems, setSelectedExportItems] = useState<string[]>([]);
    const [selectAllItems, setSelectAllItems] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'images' | null>(null);
    const [pdfData, setPdfData] = useState<ReportData | null>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);

    // Modal State
    const [selectedReport, setSelectedReport] = useState<ReportSubmission | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const { toast } = useToast();
    const canDeleteActivity = userRole !== "region";

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
        if (roleLoading) return;

        if (!userRole || !["superadmin", "national", "region"].includes(userRole)) {
            router.replace("/dashboard");
            return;
        }

        fetchReports();
        fetchConfig();
    }, [roleLoading, router, userRole]);

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
        const regionMap = new Map<string, any>();

        filteredReports.forEach(report => {
            if (!report.priorityId || !report.priority) return;

            const rName = report.regionName || "Global / Unspecified";
            if (!regionMap.has(rName)) {
                regionMap.set(rName, {
                    regionName: rName,
                    pillars: new Map<number, any>()
                });
            }

            const regionGroup = regionMap.get(rName);
            const pId = report.priorityId;

            if (!regionGroup.pillars.has(pId)) {
                regionGroup.pillars.set(pId, {
                    priorityId: pId,
                    priorityName: report.priority.name,
                    reports: [],
                    categories: [],
                    evaluated: false
                });
            }

            const pillarGroup = regionGroup.pillars.get(pId);
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

        // Convert to array of regions, each containing an array of pillars
        return Array.from(regionMap.values()).map(rg => ({
            regionName: rg.regionName,
            pillars: Array.from(rg.pillars.values())
        })).sort((a, b) => a.regionName.localeCompare(b.regionName));
    }, [filteredReports]);

    const exportableItems = useMemo(() => {
        const items: { id: string; name: string; regionName: string; reportIds: number[] }[] = [];
        groupedData.forEach(region => {
            region.pillars.forEach((pillar: any) => {
                const itemId = `${region.regionName}|${pillar.priorityId}`;
                items.push({
                    id: itemId,
                    name: pillar.priorityName,
                    regionName: region.regionName,
                    reportIds: pillar.reports.map((r: any) => r.id)
                });
            });
        });
        return items;
    }, [groupedData]);

    useEffect(() => {
        setSelectedExportItems((prev) =>
            prev.filter((itemId) => exportableItems.some((item) => item.id === itemId))
        );
    }, [exportableItems]);

    useEffect(() => {
        if (selectAllItems) {
            setSelectedExportItems(exportableItems.map((item) => item.id));
        }
    }, [selectAllItems, exportableItems]);

    const toggleSelectAllSubmitted = (checked: boolean) => {
        setSelectAllItems(checked);
        if (!checked) {
            setSelectedExportItems([]);
        } else {
            setSelectedExportItems(exportableItems.map((item) => item.id));
        }
    };

    const toggleItemSelection = (itemId: string, checked: boolean) => {
        setSelectAllItems(false);
        setSelectedExportItems((prev) => {
            if (checked) {
                if (prev.includes(itemId)) return prev;
                return [...prev, itemId];
            }
            return prev.filter((id) => id !== itemId);
        });
    };

    // Client-side PDF generation: render template → capture with html2canvas → jsPDF
    const handlePdfRender = useCallback(async () => {
        if (!pdfData || !pdfContainerRef.current) return;

        // Capture ref before any async work — it can become null during the wait
        const container = pdfContainerRef.current;

        // Wait for images and fonts to load
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Safety check after timeout
        if (!container || !container.isConnected) {
            setExporting(false);
            return;
        }

        try {
            const filenameBase = pdfData.pillars.length === 1 ? "1-target" : `${pdfData.pillars.length}-targets`;
            const filename = `gbu-strategic-report-${filenameBase}-${new Date().toISOString().split("T")[0]}.pdf`;

            await generatePdf(container, filename);

            toast({
                title: "PDF export ready",
                description: `${pdfData.pillars.length} pillar${pdfData.pillars.length === 1 ? "" : "s"} exported.`,
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Failed to generate PDF",
                description: error instanceof Error ? error.message : "Unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setPdfData(null);
            setExporting(false);
            setExportFormat(null);
        }
    }, [pdfData, toast]);

    // Trigger PDF capture once the template is rendered
    useEffect(() => {
        if (pdfData && pdfContainerRef.current) {
            handlePdfRender();
        }
    }, [pdfData, handlePdfRender]);

    const generateExcelReport = (data: ReportData) => {
        const exportData: any[] = [];
        data.pillars.forEach(pillar => {
            pillar.sections.forEach(section => {
                section.activities.forEach(activity => {
                    exportData.push({
                        "Region": activity.submitterRegion,
                        "Strategic Priority": pillar.title,
                        "Category": section.label,
                        "Activity Name": activity.name,
                        "Date": activity.date,
                        "Submitter": activity.submitterName,
                        "Submitter Email": activity.submitterEmail,
                        "Participants": activity.participants,
                        "Beneficiaries": activity.beneficiaries,
                        "Facilitators": activity.facilitators,
                        "Impact": activity.impactText
                    });
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report Activities");

        // Auto-size columns
        const wscols = [
            { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
            { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 40 }
        ];
        worksheet["!cols"] = wscols;

        XLSX.writeFile(workbook, `GBU_Strategic_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const generateImageZip = async (data: ReportData) => {
        const zip = new JSZip();
        let imageCount = 0;
        const fetchPromises: Promise<any>[] = [];

        data.pillars.forEach(pillar => {
            pillar.sections.forEach(section => {
                section.activities.forEach(activity => {
                    if (activity.photos && activity.photos.items.length > 0) {
                        activity.photos.items.forEach((photo, pIdx) => {
                            const promise = (async () => {
                                try {
                                    const response = await fetch(photo.src);
                                    if (!response.ok) throw new Error("Fetch failed");
                                    const blob = await response.blob();

                                    // Sanitize for filenames
                                    const region = activity.submitterRegion.replace(/[/\\?%*:|"<>]/g, '-');
                                    const date = activity.date.replace(/[/\\?%*:|"<>]/g, '-');
                                    const pillarTitle = pillar.title.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 30);
                                    const actName = activity.name.replace(/[/\\?%*:|"<>]/g, '-').substring(0, 30);

                                    const extension = photo.src.split('.').pop()?.split(/[?#]/)[0] || 'jpg';
                                    const filename = `${region}_${date}_${pillarTitle}_${actName}_${pIdx + 1}.${extension}`;

                                    zip.file(filename, blob);
                                    imageCount++;
                                } catch (err) {
                                    console.error(`Failed to download image: ${photo.src}`, err);
                                }
                            })();
                            fetchPromises.push(promise);
                        });
                    }
                });
            });
        });

        if (fetchPromises.length === 0) {
            toast({ title: "No images found", description: "Selected priorities don't have any images." });
            setExporting(false);
            setExportFormat(null);
            return;
        }

        await Promise.all(fetchPromises);

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `GBU_Strategic_Images_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: "Images downloaded", description: `Successfully bundled ${imageCount} images.` });
        setExporting(false);
        setExportFormat(null);
    };

    const handleExportSelected = async (format: 'pdf' | 'excel' | 'images') => {
        if (exportableItems.length === 0 || exporting) return;

        const selectedIds = selectAllItems
            ? Array.from(new Set(exportableItems.map((item) => item.id)))
            : Array.from(new Set(selectedExportItems));

        const exportingAll = selectAllItems || selectedIds.length === exportableItems.length;

        if (!exportingAll && selectedIds.length === 0) {
            toast({ title: "Select at least one priority", description: "Choose which submitted priorities to export." });
            return;
        }

        // Gather all report IDs belonging to the selected items
        const selectedReportIds = new Set<number>();
        exportableItems.forEach(item => {
            if (selectedIds.includes(item.id)) {
                item.reportIds.forEach((rId) => selectedReportIds.add(rId));
            }
        });

        if (selectedReportIds.size === 0) return;

        setExporting(true);
        setExportFormat(format);
        try {
            const payload = { reportIds: Array.from(selectedReportIds) };
            const res = await fetch("/api/reports/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                cache: "no-store",
            });

            if (!res.ok) {
                const errorBody = await res.json().catch(() => ({}));
                throw new Error(errorBody.error || "Failed to fetch report data");
            }

            const data: ReportData = await res.json();

            if (format === 'pdf') {
                setPdfData(data);
            } else if (format === 'excel') {
                generateExcelReport(data);
                setExporting(false);
                setExportFormat(null);
            } else if (format === 'images') {
                await generateImageZip(data);
            }
        } catch (error) {
            console.error(error);
            setExporting(false);
            setExportFormat(null);
            toast({
                title: `Failed to export ${format.toUpperCase()}`,
                description: error instanceof Error ? error.message : "Unexpected error occurred",
                variant: "destructive",
            });
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
                                            Export Options
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[400px]">
                                        <DropdownMenuLabel className="flex justify-between items-center">
                                            <span>Select Priorities to Export</span>
                                            <Badge variant="outline" className="text-[10px]">{selectedExportItems.length} selected</Badge>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuCheckboxItem
                                            checked={selectAllItems}
                                            onSelect={(event) => event.preventDefault()}
                                            onCheckedChange={(checked) => toggleSelectAllSubmitted(Boolean(checked))}
                                        >
                                            <span className="font-semibold">Export All Submitted Priorities</span>
                                        </DropdownMenuCheckboxItem>
                                        <DropdownMenuSeparator />
                                        <div className="max-h-[350px] overflow-y-auto">
                                            {groupedData.length === 0 ? (
                                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                                    No priorities have submissions yet.
                                                </div>
                                            ) : (
                                                groupedData.map((regionGroup) => (
                                                    <div key={`export-region-${regionGroup.regionName}`} className="mb-2">
                                                        <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-primary/80 bg-muted/30">
                                                            {regionGroup.regionName}
                                                        </div>
                                                        {regionGroup.pillars.map((pillar: any) => {
                                                            const itemId = `${regionGroup.regionName}|${pillar.priorityId}`;
                                                            return (
                                                                <DropdownMenuCheckboxItem
                                                                    key={`export-item-${itemId}`}
                                                                    checked={selectAllItems || selectedExportItems.includes(itemId)}
                                                                    onSelect={(event) => event.preventDefault()}
                                                                    onCheckedChange={(checked) => toggleItemSelection(itemId, Boolean(checked))}
                                                                    className="ml-2 pl-6"
                                                                >
                                                                    <span className="text-sm truncate pr-2 max-w-[320px] inline-block" title={pillar.priorityName}>{pillar.priorityName}</span>
                                                                </DropdownMenuCheckboxItem>
                                                            );
                                                        })}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <DropdownMenuSeparator />
                                        <div className="px-3 pb-2 pt-2 grid grid-cols-1 gap-2">
                                            <Button
                                                size="sm"
                                                className="w-full bg-red-600 hover:bg-red-700 h-9"
                                                onClick={() => handleExportSelected('pdf')}
                                                disabled={exportableItems.length === 0 || exporting}
                                            >
                                                {exporting && exportFormat === 'pdf' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {exporting && exportFormat === 'pdf' ? "Preparing PDF..." : "Export as PDF"}
                                            </Button>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="w-full h-9"
                                                    onClick={() => handleExportSelected('excel')}
                                                    disabled={exportableItems.length === 0 || exporting}
                                                >
                                                    {exporting && exportFormat === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                                    Excel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="w-full h-9"
                                                    onClick={() => handleExportSelected('images')}
                                                    disabled={exportableItems.length === 0 || exporting}
                                                >
                                                    {exporting && exportFormat === 'images' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                                    Images
                                                </Button>
                                            </div>
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
                                                {groupedData.map((region, index) => (
                                                    <RegionRow
                                                        key={`region-${region.regionName}`}
                                                        region={region}
                                                        index={index}
                                                        config={config}
                                                        setSelectedReport={setSelectedReport}
                                                        setIsModalOpen={setIsModalOpen}
                                                        setSelectedActivity={setSelectedActivity}
                                                        setIsViewModalOpen={setIsViewModalOpen}
                                                    />
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
                            config={selectedReport && selectedReport.priorityId ? config.find(c => c.id === selectedReport.priorityId) : undefined}
                            onSuccess={fetchReports}
                        />

                        <ViewActivityModal
                            isOpen={isViewModalOpen}
                            onClose={() => setIsViewModalOpen(false)}
                            activity={selectedActivity}
                            onUpdated={fetchReports}
                            canDelete={canDeleteActivity}
                            onDeleted={() => {
                                fetchReports();
                                setSelectedActivity(null);
                                setIsViewModalOpen(false);
                            }}
                        />

                    </div>
                </div>

            </SidebarInset>

            {/* Hidden off-screen container for PDF template rendering */}
            {pdfData && (
                <div
                    style={{
                        position: "absolute",
                        left: "-10000px",
                        top: 0,
                        width: "794px",
                        pointerEvents: "none",
                    }}
                >
                    <ReportPdfTemplate ref={pdfContainerRef} data={pdfData} />
                </div>
            )}
        </SidebarProvider>
    );
}
