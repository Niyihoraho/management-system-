
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, GraduationCap, MapPin, Building2, Users } from "lucide-react";
import { useState } from "react";
import { GradeBadge } from "./grade-badge";
import { Button } from "@/components/ui/button";

interface UniversityStats {
    id: number;
    name: string;
    activeMembers: number;
    cells: number;
    discipleshipGroups: number;
    studentsInDiscipleship: number;
    joinedThisYear: number;
    savedStudents: number;
}

interface RegionStats {
    id: number;
    name: string;
    activeMembers: number;
    cells: number;
    discipleshipGroups: number;
    studentsInDiscipleship: number;
    joinedThisYear: number;
    savedStudents: number;
    universityStats: UniversityStats[];
    // pillarGrades removed from here as it's not needed for this table
}

export function StatisticsTable({ stats }: { stats: RegionStats[] }) {
    // Calculate Grand Totals
    const totalActive = stats.reduce((sum, r) => sum + r.activeMembers, 0);
    const totalCells = stats.reduce((sum, r) => sum + r.cells, 0);
    const totalGroups = stats.reduce((sum, r) => sum + r.discipleshipGroups, 0);
    const totalStudents = stats.reduce((sum, r) => sum + r.studentsInDiscipleship, 0);
    const totalJoined = stats.reduce((sum, r) => sum + r.joinedThisYear, 0);
    const totalSaved = stats.reduce((sum, r) => sum + r.savedStudents, 0);

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-muted/30">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    General Ministry Statistics
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Overview of active members, cells, and discipleship groups.
                </p>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[300px]">Region / University</TableHead>
                        <TableHead className="text-right">Active Members</TableHead>
                        <TableHead className="text-right">Cells</TableHead>
                        <TableHead className="text-right">DG Groups</TableHead>
                        <TableHead className="text-right">In DG</TableHead>
                        <TableHead className="text-right">New Joined</TableHead>
                        <TableHead className="text-right">Saved</TableHead>
                        <TableHead className="text-right text-primary font-bold">Saved</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {/* Grand Total Row */}
                    <TableRow className="bg-primary/5 font-bold hover:bg-primary/10">
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                <span>GRAND TOTAL</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">{totalActive.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{totalCells.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{totalGroups.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{totalStudents.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{totalJoined.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{totalSaved.toLocaleString()}</TableCell>
                    </TableRow>

                    {stats.map((region, index) => (
                        <RegionRow key={region.id} region={region} index={index} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function RegionRow({ region, index }: { region: RegionStats; index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <TableRow
                className={`
                    group transition-colors hover:bg-muted/30
                    ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}
                `}
            >
                <TableCell className="font-medium">
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
                        <span>{region.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({region.universityStats.length} Unis)</span>
                    </div>
                </TableCell>
                <TableCell className="text-right font-medium">{region.activeMembers.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{region.cells.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{region.discipleshipGroups.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{region.studentsInDiscipleship.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{region.joinedThisYear.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{region.savedStudents.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium text-primary">{region.savedStudents.toLocaleString()}</TableCell>
            </TableRow>

            {/* University Rows */}
            {isOpen && region.universityStats.map((uni) => (
                <TableRow key={uni.id} className="hover:bg-muted/10">
                    <TableCell className="pl-12">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{uni.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{uni.activeMembers.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{uni.cells.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{uni.discipleshipGroups.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{uni.studentsInDiscipleship.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{uni.joinedThisYear.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{uni.savedStudents.toLocaleString()}</TableCell>
                </TableRow>
            ))}
        </>
    );
}
