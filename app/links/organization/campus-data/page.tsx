"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search, RefreshCw, Building2, AlertCircle, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRoleAccess } from "@/app/components/providers/role-access-provider";

interface University {
    id: number;
    name: string;
    regionId: number;
    studentPopulation?: number;
    region: { name: string };
    cult?: { name: string }[];
    faculty?: { name: string }[];
    association?: { name: string }[];
}

interface Region {
    id: number;
    name: string;
}

interface GroupedData {
    region: { id: number; name: string };
    universities: University[];
}

function RegionRowGroup({
    regionGroup,
}: {
    regionGroup: GroupedData;
}) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            <TableRow
                className="group transition-colors hover:bg-muted/30 bg-muted/10"
            >
                <TableCell className="font-medium" colSpan={5}>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <MapPin className="h-4 w-4 text-primary/70" />
                        <span>{regionGroup.region.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({regionGroup.universities.length} {regionGroup.universities.length === 1 ? 'University' : 'Universities'})</span>
                    </div>
                </TableCell>
            </TableRow>

            {/* University Rows */}
            {isOpen && regionGroup.universities.map((university) => (
                <TableRow key={university.id} className="hover:bg-muted/50">
                    <TableCell className="pl-12">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">{university.name}</p>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                        {university.studentPopulation?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {university.faculty && university.faculty.length > 0 ? (
                                university.faculty.map((f, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{f.name}</Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {university.association && university.association.length > 0 ? (
                                university.association.map((a, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{a.name}</Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                            )}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {university.cult && university.cult.length > 0 ? (
                                university.cult.map((c, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{c.name}</Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
}

export default function CampusDataPage() {
    const router = useRouter();
    const { userRole, userScope, isLoading: roleLoading } = useRoleAccess();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [universities, setUniversities] = useState<University[]>([]);
    const [regions, setRegions] = useState<Region[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const canSelectRegion = userRole !== 'university';

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            let universityUrl = '/api/universities';
            if (selectedRegion !== "all") {
                universityUrl += `?regionId=${selectedRegion}`;
            }

            const [universitiesRes, regionsRes] = await Promise.all([
                axios.get(universityUrl),
                axios.get('/api/regions'),
            ]);

            setUniversities(universitiesRes.data || []);
            setRegions(regionsRes.data || []);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (roleLoading) return;

        if (!userRole || !['superadmin', 'national', 'region', 'university'].includes(userRole)) {
            router.replace('/dashboard');
            return;
        }

        if (userRole === 'university' && userScope?.regionId) {
            setSelectedRegion(String(userScope.regionId));
        }

        fetchData();
    }, [roleLoading, router, selectedRegion, userRole, userScope?.regionId]);

    const filteredData = universities.filter(university => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            university.name.toLowerCase().includes(searchLower) ||
            university.region?.name?.toLowerCase().includes(searchLower)
        );
    });

    // Group by Region
    const groupedData: GroupedData[] = filteredData.reduce((acc: GroupedData[], university) => {
        const regionId = university.regionId;
        const existingRegion = acc.find(g => g.region.id === regionId);

        if (existingRegion) {
            existingRegion.universities.push(university);
        } else {
            acc.push({
                region: { id: regionId, name: university.region?.name || 'Unknown' },
                universities: [university]
            });
        }
        return acc;
    }, []);

    // Sort regions alphabetically
    groupedData.sort((a, b) => a.region.name.localeCompare(b.region.name));

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
                                    <BreadcrumbLink href="/links/organization">Organization</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Campus Information</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-foreground mb-2">Campus Information</h1>
                            <p className="text-muted-foreground">View campus student counts, faculties, associations, and cults across universities. Data is managed from the <a href="/links/organization/universities" className="text-primary hover:underline font-medium">Universities</a> page.</p>
                        </div>

                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-6">
                            <div className="flex flex-col sm:flex-row gap-3 flex-1">
                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search university..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-sm"
                                    />
                                </div>

                                {/* Refresh */}
                                <button
                                    onClick={fetchData}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-4 py-2 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 rounded-lg transition-all text-sm disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                                </button>
                            </div>

                            {/* Region Filter */}
                            <div className="w-full sm:w-48">
                                <Select
                                    value={selectedRegion}
                                    onValueChange={setSelectedRegion}
                                    disabled={!canSelectRegion}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="All Regions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {canSelectRegion && <SelectItem value="all">All Regions</SelectItem>}
                                        {regions.map((region) => (
                                            <SelectItem key={region.id} value={region.id.toString()}>
                                                {region.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 text-destructive flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Data Table */}
                        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                    <span>Loading data...</span>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[300px] font-semibold">Region / University</TableHead>
                                                <TableHead className="font-semibold text-center w-[150px]">Student Population</TableHead>
                                                <TableHead className="font-semibold w-[200px]">Faculties</TableHead>
                                                <TableHead className="font-semibold w-[200px]">Associations</TableHead>
                                                <TableHead className="font-semibold w-[200px]">Cults</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Building2 className="w-12 h-12 text-muted-foreground/50" />
                                                            <p>No universities found{selectedRegion !== "all" ? " in this region" : ""}.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                groupedData.map((group) => (
                                                    <RegionRowGroup
                                                        key={group.region.id}
                                                        regionGroup={group}
                                                    />
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {/* Table Footer */}
                            {!loading && filteredData.length > 0 && (
                                <div className="bg-muted/50 px-6 py-3 border-t border-border">
                                    <div className="text-sm text-muted-foreground">
                                        Showing <span className="font-medium text-foreground">{filteredData.length}</span> of <span className="font-medium text-foreground">{universities.length}</span> universities
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
