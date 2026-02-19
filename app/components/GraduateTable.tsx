'use client';

import { useState } from 'react';
import { Search, RefreshCw, UserPlus, Edit, Trash2, GraduationCap, Building2, MapPin, Phone, Mail, Globe, HeartHandshake } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Types for Graduate
interface Graduate {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  university: string | null;
  course: string | null;
  graduationYear: number | null;
  residenceProvince: string | null;
  residenceDistrict: string | null;
  residenceSector: string | null;
  isDiaspora: boolean;
  servingPillars: string[];
  financialSupport: boolean;
  graduateGroupId: number;
  status: string;
  regionId?: number | null;
  createdAt: string;
  updatedAt: string;
  region?: { name: string } | null;
  graduateGroup: { name: string };
}

const graduateStatusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  moved: 'Moved',
};

const graduateStatusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  moved: 'bg-orange-100 text-orange-800',
};

interface GraduateTableProps {
  graduates: Graduate[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onEdit?: (graduate: Graduate) => void;
  onDelete?: (graduate: Graduate) => void;
}

export default function GraduateTable({
  graduates,
  loading,
  error,
  onRefresh,
  onEdit,
  onDelete
}: GraduateTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredGraduates = graduates.filter(graduate => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    return (
      graduate.fullName?.toLowerCase().includes(searchLower) ||
      graduate.email?.toLowerCase().includes(searchLower) ||
      graduate.phone?.includes(searchTerm) ||
      graduate.university?.toLowerCase().includes(searchLower) ||
      graduate.course?.toLowerCase().includes(searchLower) ||
      graduate.region?.name?.toLowerCase().includes(searchLower) ||
      graduate.graduateGroup?.name?.toLowerCase().includes(searchLower) ||
      graduate.status?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredGraduates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGraduates = filteredGraduates.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search graduates..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input transition-all text-sm"
            />
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Add New Graduate Button */}
        <Button className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span>Add Graduate</span>
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-destructive">
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={onRefresh}
            className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Graduates Table */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-lg font-medium">Loading graduates...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Graduate</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Education</TableHead>
                  <TableHead>Residence</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGraduates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No graduates match your search' : 'No graduates found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedGraduates.map((graduate) => (
                    <TableRow key={graduate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {graduate.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{graduate.fullName}</p>
                            <p className="text-xs text-muted-foreground">ID: {graduate.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {graduate.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{graduate.email}</span>
                            </div>
                          )}
                          {graduate.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{graduate.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <GraduationCap className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{graduate.university || 'N/A'}</span>
                          </div>
                          {graduate.course && (
                            <p className="text-xs text-muted-foreground">{graduate.course}</p>
                          )}
                          {graduate.graduationYear && (
                            <Badge variant="outline" className="text-xs">
                              Class of {graduate.graduationYear}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span>{graduate.graduateGroup?.name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">
                              {graduate.residenceSector || 'N/A'}
                            </span>
                          </div>
                          {graduate.isDiaspora && (
                            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                              <Globe className="w-3 h-3 mr-1" />
                              Diaspora
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {graduate.servingPillars && graduate.servingPillars.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {graduate.servingPillars.slice(0, 2).map((pillar, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {pillar}
                                </Badge>
                              ))}
                              {graduate.servingPillars.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{graduate.servingPillars.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                          {graduate.financialSupport && (
                            <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
                              <HeartHandshake className="w-3 h-3 mr-1" />
                              Financial Support
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={graduateStatusColors[graduate.status as keyof typeof graduateStatusColors] || 'bg-gray-100'}
                        >
                          {graduateStatusLabels[graduate.status as keyof typeof graduateStatusLabels] || graduate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit?.(graduate)}
                            className="h-8 w-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete?.(graduate)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredGraduates.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredGraduates.length)} of {filteredGraduates.length} graduates
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
