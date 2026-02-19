
"use client";

import { useEffect, useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function StatisticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/statistics");
            if (!res.ok) throw new Error("Failed to fetch statistics");
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
            setError("Failed to load statistics data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    <div className="flex items-center justify-between mb-2">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <BarChart3 className="h-6 w-6 text-primary" />
                                Ministry Statistics
                            </h1>
                            <p className="text-muted-foreground">
                                Overview of GBU data and strategic pillar evaluations across all regions.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>

                    {error && (
                        <Alert variant="destructive">
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
                    ) : data ? (
                        <div className="space-y-8">
                            <StatisticsTable stats={data.stats} />
                            <PillarsMatrix stats={data.stats} pillars={data.pillars} />
                        </div>
                    ) : null}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
