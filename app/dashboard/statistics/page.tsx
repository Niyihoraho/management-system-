
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { StatisticsTable } from "@/components/statistics/statistics-table";
import { PillarsMatrix } from "@/components/statistics/pillars-matrix";
import { BarChart3, RefreshCw, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduateStatisticsTable } from "@/components/statistics/graduate-statistics-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRoleAccess } from "@/app/components/providers/role-access-provider";

export default function StatisticsPage() {
    const router = useRouter();
    const { userRole, isLoading: roleLoading } = useRoleAccess();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [graduateData, setGraduateData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("students");
    const [selectedYear, setSelectedYear] = useState<string>("all");

    // Generate last 10 years
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => (currentYear - i).toString());

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const yearQuery = selectedYear !== "all" ? `?year=${selectedYear}` : "";

            if (activeTab === "students") {
                const res = await fetch(`/api/statistics${yearQuery}`);
                if (!res.ok) throw new Error("Failed to fetch student statistics");
                const json = await res.json();
                setData(json);
            } else {
                const res = await fetch(`/api/statistics/graduates${yearQuery}`);
                if (!res.ok) throw new Error("Failed to fetch graduate statistics");
                const json = await res.json();
                setGraduateData(json);
            }
        } catch (err) {
            console.error(err);
            setError(`Failed to load ${activeTab} statistics data. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roleLoading) return;

        if (!userRole || !["superadmin", "national"].includes(userRole)) {
            router.replace("/dashboard");
            return;
        }

        fetchData();
    }, [roleLoading, router, userRole, activeTab, selectedYear]);

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
                                    <BreadcrumbPage>Statistics</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <BarChart3 className="h-6 w-6 text-primary" />
                                Ministry Statistics
                            </h1>
                            <p className="text-muted-foreground">
                                Overview of GBU data and strategic pillar evaluations across all regions.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    {years.map((year) => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="students" className="w-[150px]">Students</TabsTrigger>
                            <TabsTrigger value="graduates" className="w-[150px]">Graduates</TabsTrigger>
                        </TabsList>

                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <RefreshCw className="h-10 w-10 animate-spin text-muted-foreground" />
                                <p className="text-muted-foreground animate-pulse">Aggregating latest statistics...</p>
                            </div>
                        ) : (
                            <>
                                <TabsContent value="students" className="m-0 border-none outline-none">
                                    {data ? (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <StatisticsTable stats={data.stats} />
                                            <PillarsMatrix stats={data.stats} pillars={data.pillars} />
                                        </div>
                                    ) : null}
                                </TabsContent>
                                <TabsContent value="graduates" className="m-0 border-none outline-none">
                                    {graduateData ? (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                            <GraduateStatisticsTable stats={graduateData.stats} />
                                        </div>
                                    ) : null}
                                </TabsContent>
                            </>
                        )}
                    </Tabs>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
