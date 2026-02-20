"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, RefreshCw, Loader2, Settings, Trash2, Plus } from "lucide-react";
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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

type StrategicPriority = {
    id: number;
    name: string;
    description: string;
    categories: ActivityCategory[];
    questions: EvaluationQuestion[];
};

type ActivityCategory = {
    id: number;
    name: string;
    templates: ActivityTemplate[];
};

type ActivityTemplate = {
    id: number;
    name: string;
};

type EvaluationQuestion = {
    id: number;
    statement: string;
};

type DeleteTarget = {
    type: 'priority' | 'category' | 'template' | 'question';
    id: number;
    name?: string;
};

// Sub-components for adding items to ensure proper state management
const AddCategoryForm = ({ priorityId, onAdd }: { priorityId: number, onAdd: (pid: number, name: string) => void }) => {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onAdd(priorityId, name);
        setName("");
    };

    return (
        <div className="flex gap-2">
            <Input
                placeholder="New Category Name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                }}
            />
            <Button size="sm" variant="outline" onClick={handleSubmit}>Add</Button>
        </div>
    );
};

const AddTemplateForm = ({ categoryId, onAdd }: { categoryId: number, onAdd: (cid: number, name: string) => void }) => {
    const [name, setName] = useState("");

    const handleSubmit = () => {
        if (!name.trim()) return;
        onAdd(categoryId, name);
        setName("");
    };

    return (
        <div className="flex items-center gap-1">
            <Input
                className="h-9 w-48 text-sm"
                placeholder="+ Activity Template"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                }}
            />
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={handleSubmit}>
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    );
};

const AddQuestionForm = ({ priorityId, onAdd }: { priorityId: number, onAdd: (pid: number, stmt: string) => void }) => {
    const [statement, setStatement] = useState("");

    const handleSubmit = () => {
        if (!statement.trim()) return;
        onAdd(priorityId, statement);
        setStatement("");
    };

    return (
        <div className="flex gap-2 mt-4">
            <Input
                placeholder="Add new evaluation question statement..."
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                }}
            />
            <Button size="sm" onClick={handleSubmit}>Add Question</Button>
        </div>
    );
};

export default function ReportingConfigPage() {
    const [priorities, setPriorities] = useState<StrategicPriority[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const fetchPriorities = async () => {
        const res = await fetch("/api/reporting/config");
        const data = await res.json();

        if (!res.ok) {
            const message = typeof data?.error === "string" ? data.error : "Failed to load reporting configuration.";
            throw new Error(message);
        }

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response format.");
        }

        return data as StrategicPriority[];
    };

    const fetchConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchPriorities();
            setPriorities(data);
        } catch (error) {
            console.error(error);
            setPriorities([]);
            setError(error instanceof Error ? error.message : "Failed to load reporting configuration. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleCreatePriority = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;

        // Optimistic update or just background refresh
        // For now, let's just not set loading=true

        try {
            const res = await fetch("/api/admin/reporting-config", {
                method: "POST",
                body: JSON.stringify({
                    action: "create_priority",
                    data: { name, description },
                }),
            });
            if (res.ok) {
                toast({ title: "Priority Created" });
                // Refresh without full page loader
                const data = await fetchPriorities();
                setPriorities(data);

                (e.target as HTMLFormElement).reset();
            }
        } catch (error) {
            toast({ title: "Error creating priority", variant: "destructive" });
        }
    };

    const handleCreateCategory = async (priorityId: number, name: string) => {
        if (!name) return;
        try {
            const res = await fetch("/api/admin/reporting-config", {
                method: "POST",
                body: JSON.stringify({
                    action: "create_category",
                    data: { name, priorityId },
                }),
            });
            if (res.ok) {
                // Refresh in background
                const data = await fetchPriorities();
                setPriorities(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateTemplate = async (categoryId: number, name: string) => {
        if (!name) return;
        try {
            const res = await fetch("/api/admin/reporting-config", {
                method: "POST",
                body: JSON.stringify({
                    action: "create_template",
                    data: { name, categoryId },
                }),
            });
            if (res.ok) {
                // Refresh in background
                const data = await fetchPriorities();
                setPriorities(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleCreateQuestion = async (priorityId: number, statement: string) => {
        if (!statement) return;
        try {
            const res = await fetch("/api/admin/reporting-config", {
                method: "POST",
                body: JSON.stringify({
                    action: "create_question",
                    data: { statement, priorityId },
                }),
            });
            if (res.ok) {
                // Refresh in background
                const data = await fetchPriorities();
                setPriorities(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const confirmDelete = (type: DeleteTarget['type'], id: number, name?: string) => {
        setDeleteTarget({ type, id, name });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        // Optimistic delete: remove from UI immediately
        // This is complex for nested items, so for now we'll just not show the loading spinner
        // But we explicitly won't call setLoading(true)

        try {
            const res = await fetch("/api/admin/reporting-config", {
                method: "POST",
                body: JSON.stringify({
                    action: `delete_${deleteTarget.type}`,
                    data: { id: deleteTarget.id },
                }),
            });

            if (res.ok) {
                toast({ title: `${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted successfully` });
                // Refresh in background
                const data = await fetchPriorities();
                setPriorities(data);
            } else {
                toast({ title: "Failed to delete", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error deleting item", variant: "destructive" });
        } finally {
            setDeleteTarget(null);
        }
    };

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
                                    <BreadcrumbLink href="/reports">
                                        Strategic Reporting
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Configure Reports</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 lg:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Reporting Configuration</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Manage Strategic Priorities, Activity Categories, Templates, and Evaluation Questions</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
                            <div className="flex gap-2 sm:gap-3">
                                {/* Refresh Button */}
                                <button
                                    onClick={fetchConfig}
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
                                    onClick={fetchConfig}
                                    className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {/* Create New Pillar */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Add New Strategic Priority (Pillar)</CardTitle>
                                <CardDescription>Create a new strategic priority for reporting</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreatePriority} className="flex flex-col sm:flex-row gap-4 items-end">
                                    <div className="grid w-full sm:max-w-sm items-center gap-1.5">
                                        <Label htmlFor="name">Pillar Name</Label>
                                        <Input type="text" id="name" name="name" placeholder="e.g. Witness" required />
                                    </div>
                                    <div className="grid w-full sm:max-w-sm items-center gap-1.5">
                                        <Label htmlFor="description">Vision / Description</Label>
                                        <Input type="text" id="description" name="description" placeholder="Short vision statement" />
                                    </div>
                                    <Button type="submit" className="w-full sm:w-auto">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Pillar
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Priorities List */}
                        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Loading configuration...</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {priorities.length === 0 && !error ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-medium text-foreground mb-2">No priorities configured</h3>
                                            <p className="text-muted-foreground text-center mb-4">
                                                Create your first strategic priority above to get started.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="p-4 sm:p-6 space-y-6">
                                            {priorities.map((priority, index) => (
                                                <Card key={priority.id} className="border-l-4 border-l-primary/50 relative">
                                                    <div className="absolute right-4 top-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive"
                                                            onClick={() => confirmDelete('priority', priority.id, priority.name)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <CardHeader className="pb-3 pr-12">
                                                        <div className="flex justify-between">
                                                            <CardTitle className="text-xl">
                                                                <span className="text-muted-foreground opacity-50 mr-2">{index + 1}.</span>
                                                                {priority.name}
                                                            </CardTitle>
                                                        </div>
                                                        <CardDescription>{priority.description}</CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <Accordion type="single" collapsible className="w-full">
                                                            {/* Categories Section */}
                                                            <AccordionItem value="categories">
                                                                <AccordionTrigger>Activity Categories ({priority.categories.length})</AccordionTrigger>
                                                                <AccordionContent className="space-y-4 pt-2">
                                                                    <div className="pl-4 border-l-2 border-muted space-y-6">
                                                                        {/* Add Category */}
                                                                        <AddCategoryForm priorityId={priority.id} onAdd={handleCreateCategory} />

                                                                        {/* List Categories */}
                                                                        {priority.categories.map((cat, catIndex) => (
                                                                            <div key={cat.id} className="bg-muted/30 p-3 rounded-md group relative">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-6 w-6 absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                                                    onClick={() => confirmDelete('category', cat.id, cat.name)}
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </Button>
                                                                                <h4 className="font-semibold text-sm mb-2 pr-6">
                                                                                    <span className="text-muted-foreground opacity-50 mr-1">{index + 1}.{catIndex + 1}</span>
                                                                                    {cat.name}
                                                                                </h4>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {cat.templates.map(temp => (
                                                                                        <span key={temp.id} className="text-sm bg-background border border-input shadow-sm px-3 py-1.5 rounded-full text-foreground flex items-center gap-2 group/chip hover:bg-muted/50 transition-colors">
                                                                                            <span className="truncate max-w-[200px]">{temp.name}</span>
                                                                                            <button
                                                                                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover/chip:opacity-100 transition-opacity p-0.5"
                                                                                                onClick={() => confirmDelete('template', temp.id, temp.name)}
                                                                                                title="Remove template"
                                                                                            >
                                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                                            </button>
                                                                                        </span>
                                                                                    ))}
                                                                                    <AddTemplateForm categoryId={cat.id} onAdd={handleCreateTemplate} />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>

                                                            {/* Evaluation Questions Section */}
                                                            <AccordionItem value="questions">
                                                                <AccordionTrigger>Evaluation Questions ({priority.questions.length})</AccordionTrigger>
                                                                <AccordionContent className="space-y-2 pt-2">
                                                                    <ul className="space-y-2">
                                                                        {priority.questions.map(q => (
                                                                            <li key={q.id} className="flex items-start justify-between gap-2 text-sm bg-muted/20 p-2 rounded group">
                                                                                <div className="flex items-start gap-2">
                                                                                    <span className="text-primary font-bold">•</span>
                                                                                    <span>{q.statement}</span>
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                                                    onClick={() => confirmDelete('question', q.id, q.statement)}
                                                                                >
                                                                                    <Trash2 className="h-3 w-3" />
                                                                                </Button>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                    <AddQuestionForm priorityId={priority.id} onAdd={handleCreateQuestion} />
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        </Accordion>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Footer */}
                            {!loading && priorities.length > 0 && (
                                <div className="bg-muted/50 px-3 sm:px-6 py-3 border-t border-border">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                            Showing <span className="font-medium text-foreground">{priorities.length}</span> strategic {priorities.length === 1 ? 'priority' : 'priorities'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            {deleteTarget?.type === 'priority' ? ' strategic priority and all associated data' : ''}
                            {deleteTarget?.type === 'category' ? ' activity category and all associated templates' : ''}
                            {deleteTarget?.type === 'template' ? ' activity template' : ''}
                            {deleteTarget?.type === 'question' ? ' evaluation question' : ''}
                            {deleteTarget?.name ? ` "${deleteTarget.name}"` : ''}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </SidebarProvider>
    );
}
