
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { GradeBadge } from "./grade-badge";
import { MapPin, Target, Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface RegionStats {
    id: number;
    name: string;
    pillarGrades: Record<string, string>;
}

interface PillarsMatrixProps {
    stats: RegionStats[];
    pillars: { id: number; name: string; description?: string }[];
}

export function PillarsMatrix({ stats, pillars }: PillarsMatrixProps) {
    return (
        <div className="rounded-xl border bg-card shadow-sm flex flex-col h-[600px]">
            <div className="p-6 border-b bg-muted/30 shrink-0">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Strategic Priorities Matrix
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Evaluation grades (A-D) for each region against strategic pillars.
                    Scroll horizontally to see all pillars, and vertically for all regions.
                </p>
            </div>

            <div className="flex-1 overflow-auto relative">
                <Table>
                    <TableHeader className="sticky top-0 z-20 bg-card shadow-sm">
                        <TableRow className="bg-muted/50 hover:bg-muted/50 border-b-2 border-border">
                            <TableHead className="w-[250px] pl-6 font-bold text-foreground sticky left-0 z-30 bg-background/95 backdrop-blur shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Region
                            </TableHead>
                            {pillars.map((pillar) => (
                                <TableHead key={pillar.id} className="text-center min-w-[160px] py-4 h-full align-top">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center gap-2 group cursor-help h-full justify-start pt-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors text-center line-clamp-2 leading-tight">
                                                        {pillar.name}
                                                    </span>
                                                    <Info className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[300px] p-4">
                                                <p className="font-semibold mb-1">{pillar.name}</p>
                                                {pillar.description && (
                                                    <p className="text-xs text-muted-foreground">{pillar.description}</p>
                                                )}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.map((region, index) => (
                            <TableRow
                                key={region.id}
                                className={`
                        transition-colors hover:bg-muted/30 border-b border-border/50
                        ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'}
                    `}
                            >
                                <TableCell className="font-medium pl-6 sticky left-0 z-10 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1 h-8 rounded-full ${index % 2 === 0 ? 'bg-primary/20' : 'bg-primary/10'}`}></div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-foreground">{region.name}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                {pillars.map((pillar) => (
                                    <TableCell key={`${region.id}-${pillar.id}`} className="text-center p-4">
                                        <GradeBadge grade={region.pillarGrades[pillar.id.toString()]} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
