"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, RefreshCw, Plus } from "lucide-react";
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

type Pillar = {
    id: number;
    name: string;
    description: string;
};

export default function ReportsDashboard() {
    const router = useRouter();
    const [pillars, setPillars] = useState<Pillar[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPillars = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch("/api/reporting/config");
            const data = await res.json();

            if (!res.ok) {
                const message = typeof data?.error === "string" ? data.error : "Failed to load strategic priorities.";
                throw new Error(message);
            }

            if (!Array.isArray(data)) {
                throw new Error("Unexpected response format.");
            }

            setPillars(data);
        } catch (error) {
            console.error(error);
            setPillars([]);
            setError(error instanceof Error ? error.message : "Failed to load strategic priorities. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPillars();
    }, []);

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
                                    <BreadcrumbPage>Strategic Reporting</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 lg:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Strategic Reporting</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Select a Strategic Priority below to submit a new report</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
                            <div className="flex gap-2 sm:gap-3">
                                {/* Refresh Button */}
                                <button
                                    onClick={fetchPillars}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2 text-destructive">
                                    <span className="text-sm font-medium">Error:</span>
                                    <span className="text-sm">{error}</span>
                                </div>
                                <button
                                    onClick={fetchPillars}
                                    className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {/* Pillars Grid */}
                        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Loading strategic priorities...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {pillars.length === 0 && !error ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-medium text-foreground mb-2">No strategic priorities configured</h3>
                                            <p className="text-muted-foreground text-center mb-4">
                                                Contact your administrator to set up reporting priorities.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 sm:p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {pillars.map((pillar) => (
                                                <div
                                                    key={pillar.id}
                                                    onClick={() => router.push(`/reports/new?pillarId=${pillar.id}`)}
                                                    className="bg-card border border-border rounded-lg p-4 sm:p-6 hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                                                >
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                            <FileText className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">{pillar.name}</h3>
                                                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                                                {pillar.description || "Click to submit a report for this priority"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button className="w-full mt-2 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-all duration-200 text-sm font-medium">
                                                        Start Report →
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Footer */}
                            {!loading && pillars.length > 0 && (
                                <div className="bg-muted/50 px-3 sm:px-6 py-3 border-t border-border">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                            Showing <span className="font-medium text-foreground">{pillars.length}</span> strategic {pillars.length === 1 ? 'priority' : 'priorities'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
