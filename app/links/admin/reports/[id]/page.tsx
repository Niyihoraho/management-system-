"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, FileText, User, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ReportDetail = {
    id: number;
    createdAt: string;
    priority: { name: string; description: string };
    user: { name: string; email: string };
    activities: {
        id: number;
        category: { name: string };
        activityName: string;
        participantCount: number;
        dateOccurred: string;
        beneficiaries: string;
        facilitators: string;
        followUpPractice: string;
        impactSummary: string;
        imageUrl: string | null;
        imageUrlSecondary: string | null;
    }[];
    evaluations: {
        id: number;
        rating: string;
        question: { statement: string };
    }[];
};

export default function ReportDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/reports/${params.id}`);
                if (!res.ok) throw new Error("Report not found");
                const data = await res.json();
                setReport(data);
            } catch (err) {
                console.error(err);
                setError("Failed to load report details.");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [params.id]);

    if (loading) return <div className="h-screen flex items-center justify-center"><Skeleton className="h-12 w-12 rounded-full" /></div>;
    if (error || !report) return <div className="h-screen flex items-center justify-center text-destructive">{error || "Report not found"}</div>;

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
                                <BreadcrumbItem>
                                    <BreadcrumbLink href="/admin/reports">Reports</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Report #{report.id}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-6 p-4 pt-0 max-w-5xl mx-auto w-full">
                    {/* Header Card */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">Report Details</h1>
                            <div className="flex items-center gap-4 text-muted-foreground text-sm">
                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(report.createdAt), "PPP")}</span>
                                <span className="flex items-center gap-1"><User className="w-4 h-4" /> {report.user.name} ({report.user.email})</span>
                            </div>
                        </div>
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
                        </Button>
                    </div>

                    <Card className="border-l-4 border-l-primary/50">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center justify-between">
                                Priority: {report.priority.name}
                                <Badge variant="secondary">{report.activities.length} Activities</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{report.priority.description}</p>
                        </CardContent>
                    </Card>

                    {/* Activities List */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Activity Logs
                        </h2>
                        <div className="grid gap-4">
                            {report.activities.map((act) => (
                                <Card key={act.id}>
                                    <CardHeader className="pb-2 bg-muted/20">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Badge variant="outline" className="mb-2">{act.category.name}</Badge>
                                                <CardTitle className="text-lg">{act.activityName}</CardTitle>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {format(new Date(act.dateOccurred), "PP")}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">Create Activity</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">{act.participantCount} Participants</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">Beneficiaries</p>
                                                <p>{act.beneficiaries || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">Facilitators</p>
                                                <p>{act.facilitators || "N/A"}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">Impact</p>
                                                <p className="text-sm whitespace-pre-wrap">{act.impactSummary || "No impact summary provided."}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase">Follow Up</p>
                                                <p className="text-sm">{act.followUpPractice || "None"}</p>
                                            </div>
                                            {(act.imageUrl || act.imageUrlSecondary) && (
                                                <div className="mt-2 grid sm:grid-cols-2 gap-3">
                                                    {act.imageUrl && (
                                                        <img src={act.imageUrl} alt="Activity evidence 1" className="rounded-md max-h-40 object-cover border" />
                                                    )}
                                                    {act.imageUrlSecondary && (
                                                        <img src={act.imageUrlSecondary} alt="Activity evidence 2" className="rounded-md max-h-40 object-cover border" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>

                    <Separator />

                    {/* Evaluations */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Evaluations
                        </h2>
                        <Card>
                            <CardContent className="pt-6">
                                <ul className="space-y-4">
                                    {report.evaluations.map((ev) => (
                                        <li key={ev.id} className="flex justify-between items-start border-b last:border-0 pb-4 last:pb-0">
                                            <span className="text-sm font-medium pr-4">{ev.question.statement}</span>
                                            <Badge className={
                                                ev.rating === "NA_OR_NOT_SURE" ? "bg-gray-100 text-gray-800" :
                                                    ev.rating === "NOT_EVIDENT" ? "bg-red-100 text-red-800" :
                                                        ev.rating === "BEGINNING" ? "bg-orange-100 text-orange-800" :
                                                            ev.rating === "GROWING" ? "bg-yellow-100 text-yellow-800" :
                                                                "bg-green-100 text-green-800"
                                            }>
                                                {ev.rating.replace(/_/g, " ")}
                                            </Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
