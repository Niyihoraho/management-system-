"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AddRegionModal } from "@/components/add-region-modal";
import { DeleteRegionModal } from "@/components/delete-region-modal";
import { EditRegionModal } from "@/components/edit-region-modal";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

interface Region {
  id: number;
  name: string;
}

export default function RegionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    regionId: number | null;
    regionName: string;
  }>({
    isOpen: false,
    regionId: null,
    regionName: ''
  });
  const [deleting, setDeleting] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  // Fetch regions from API
  const fetchRegions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/regions');
      setRegions(response.data);
    } catch (err) {
      console.error('Error fetching regions:', err);
      setError('Failed to fetch regions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (regionId: number, regionName: string) => {
    setDeleteModal({
      isOpen: true,
      regionId,
      regionName
    });
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      regionId: null,
      regionName: ''
    });
  };

  // Open edit modal
  const openEditModal = (region: Region) => {
    setEditingRegion(region);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingRegion(null);
  };

  // Delete region function
  const deleteRegion = async () => {
    if (!deleteModal.regionId) return;

    setDeleting(true);
    
    try {
      const response = await axios.delete(`/api/regions?id=${deleteModal.regionId}`);
      
      if (response.status === 200) {
        // Remove the region from the local state
        setRegions(prev => prev.filter(region => region.id !== deleteModal.regionId));
        
        // Close the modal
        closeDeleteModal();
        
        // Show success message (you could add a toast notification here)
        console.log('Region deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting region:', err);
      alert('Failed to delete region. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Load regions on component mount
  useEffect(() => {
    fetchRegions();
  }, []);

  const filteredRegions = regions.filter(region => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      region.name?.toLowerCase().includes(searchLower)
    );
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Organization", href: "/links/organization" },
    { label: "Regions", href: "/links/organization/regions" }
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader breadcrumbs={breadcrumbs} />
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
          <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Regions Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage regions and their information across the organization</p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search regions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                  />
                </div>

                {/* Refresh Button */}
                <button 
                  onClick={fetchRegions}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Add New Region Button */}
              <AddRegionModal onRegionAdded={fetchRegions}>
                <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-all duration-200 shadow-sm text-sm sm:text-base">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add New Region</span>
                  <span className="sm:hidden">Add Region</span>
                </button>
              </AddRegionModal>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-destructive">
                  <span className="text-sm font-medium">Error:</span>
                  <span className="text-sm">{error}</span>
                </div>
                <button 
                  onClick={fetchRegions}
                  className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Regions Table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading regions...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Region Name
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                    {filteredRegions.map((region) => (
                      <tr key={region.id}>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-foreground">
                          {region.id}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-foreground">
                          {region.name}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button 
                              onClick={() => openEditModal(region)}
                              className="text-muted-foreground hover:text-foreground p-1 rounded" 
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openDeleteModal(region.id, region.name)}
                              className="text-destructive hover:text-destructive/80 p-1 rounded" 
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredRegions.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-12">
                  <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No regions found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm ? 'No regions match your search criteria.' : 'No regions have been added yet.'}
                  </p>
                  {!searchTerm && (
                    <AddRegionModal onRegionAdded={fetchRegions}>
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        <Plus className="w-4 h-4" />
                        Add First Region
                      </button>
                    </AddRegionModal>
                  )}
                </div>
              )}

              {/* Table Footer */}
              {!loading && filteredRegions.length > 0 && (
                <div className="bg-muted/50 px-3 sm:px-6 py-3 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      Showing <span className="font-medium text-foreground">{filteredRegions.length}</span> of <span className="font-medium text-foreground">{regions.length}</span> regions
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
      
      {/* Delete Confirmation Modal */}
      <DeleteRegionModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={deleteRegion}
        regionName={deleteModal.regionName}
        isLoading={deleting}
      />
      
      {/* Edit Region Modal */}
      <EditRegionModal
        region={editingRegion}
        onRegionUpdated={fetchRegions}
        isOpen={editingRegion !== null}
        onClose={closeEditModal}
      />
    </SidebarProvider>
  );
}
