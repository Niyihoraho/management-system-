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
import { ChevronDown, ChevronRight, MapPin, Users, Library, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";

interface SmallGroupStats {
    id: number;
    name: string;
    totalGraduates: number;
}

interface ProvinceStats {
    id: number;
    name: string;
    totalGraduates: number;
    maleGraduates: number;
    femaleGraduates: number;
    totalSmallGroups: number;
    smallGroupStats: SmallGroupStats[];
}

export function GraduateStatisticsTable({ stats }: { stats: ProvinceStats[] }) {
    // Calculate Grand Totals
    const totalGraduates = stats.reduce((sum, p) => sum + p.totalGraduates, 0);
    const totalMale = stats.reduce((sum, p) => sum + p.maleGraduates, 0);
    const totalFemale = stats.reduce((sum, p) => sum + p.femaleGraduates, 0);
    const totalSmallGroups = stats.reduce((sum, p) => sum + p.totalSmallGroups, 0);

    const handleExport = () => {
        const exportData: any[] = [];

        // Add Header Row
        exportData.push({
            "Province / Small Group": "GRAND TOTAL",
            "Total Graduates": totalGraduates,
            "Male": totalMale,
            "Female": totalFemale,
            "Small Groups": totalSmallGroups
        });

        stats.forEach(province => {
            // Add Province Row
            exportData.push({
                "Province / Small Group": province.name,
                "Total Graduates": province.totalGraduates,
                "Male": province.maleGraduates,
                "Female": province.femaleGraduates,
                "Small Groups": province.totalSmallGroups
            });

            // Add Small Group Rows
            province.smallGroupStats.forEach(group => {
                exportData.push({
                    "Province / Small Group": `  - ${group.name}`,
                    "Total Graduates": group.totalGraduates,
                    "Male": "-",
                    "Female": "-",
                    "Small Groups": "-"
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Graduate Statistics");

        // Set column widths
        const wscols = [
            { wch: 40 }, // Name
            { wch: 15 }, // Total
            { wch: 10 }, // Male
            { wch: 10 }, // Female
            { wch: 15 }  // Small Groups
        ];
        worksheet["!cols"] = wscols;

        XLSX.writeFile(workbook, `Graduate_Statistics_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden mt-4">
            <div className="p-6 border-b bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Graduate Ministry Statistics
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Overview of registered graduates, demographics, and small groups by province.
                    </p>
                </div>
                <Button
                    onClick={handleExport}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-background border-primary/20 hover:bg-primary/5 text-primary"
                >
                    <Download className="w-4 h-4" />
                    Export Excel
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[300px]">Province / Small Group</TableHead>
                        <TableHead className="text-right">Total Graduates</TableHead>
                        <TableHead className="text-right text-blue-600">Male</TableHead>
                        <TableHead className="text-right text-pink-600">Female</TableHead>
                        <TableHead className="text-right">Small Groups</TableHead>
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
                        <TableCell className="text-right">{totalGraduates.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600/80">{totalMale.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-pink-600/80">{totalFemale.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{totalSmallGroups.toLocaleString()}</TableCell>
                    </TableRow>

                    {stats.map((province, index) => (
                        <ProvinceRow key={province.id} province={province} index={index} />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function ProvinceRow({ province, index }: { province: ProvinceStats; index: number }) {
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
                            disabled={province.smallGroupStats.length === 0}
                        >
                            {province.smallGroupStats.length > 0 && (
                                isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            )}
                        </Button>
                        <MapPin className="h-4 w-4 text-primary/70" />
                        <span>{province.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({province.smallGroupStats.length} Groups)</span>
                    </div>
                </TableCell>
                <TableCell className="text-right font-medium">{province.totalGraduates.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium text-blue-600/80">{province.maleGraduates.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium text-pink-600/80">{province.femaleGraduates.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">{province.totalSmallGroups.toLocaleString()}</TableCell>
            </TableRow>

            {/* Small Group Rows */}
            {isOpen && province.smallGroupStats.map((group) => (
                <TableRow key={group.id} className="hover:bg-muted/10">
                    <TableCell className="pl-12">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Library className="h-3 w-3" />
                            <span>{group.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{group.totalGraduates.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">-</TableCell>
                </TableRow>
            ))}
        </>
    );
}
