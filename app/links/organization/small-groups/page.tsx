"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, Trash2, Users } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AddSmallGroupModal } from "@/components/add-small-group-modal";
import { DeleteSmallGroupModal } from "@/components/delete-small-group-modal";
import { EditSmallGroupModal } from "@/components/edit-small-group-modal";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

interface SmallGroup {
  id: number;
  name: string;
  regionId: number;
  universityId: number;
  region: { name: string };
  university: { name: string };
}

export default function SmallGroupsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [smallGroups, setSmallGroups] = useState<SmallGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    smallGroupId: number | null;
    smallGroupName: string;
  }>({
    isOpen: false,
    smallGroupId: null,
    smallGroupName: ''
  });
  const [deleting, setDeleting] = useState(false);
  const [editingSmallGroup, setEditingSmallGroup] = useState<SmallGroup | null>(null);

  // Fetch small groups from API
  const fetchSmallGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/small-groups');
      setSmallGroups(response.data);
    } catch (err) {
      console.error('Error fetching small groups:', err);
      setError('Failed to fetch small groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (smallGroupId: number, smallGroupName: string) => {
    setDeleteModal({
      isOpen: true,
      smallGroupId,
      smallGroupName
    });
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      smallGroupId: null,
      smallGroupName: ''
    });
  };

  // Open edit modal
  const openEditModal = (smallGroup: SmallGroup) => {
    setEditingSmallGroup(smallGroup);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingSmallGroup(null);
  };

  // Delete small group function
  const deleteSmallGroup = async () => {
    if (!deleteModal.smallGroupId) return;

    setDeleting(true);
    
    try {
      const response = await axios.delete(`/api/small-groups?id=${deleteModal.smallGroupId}`);
      
      if (response.status === 200) {
        // Remove the small group from the local state
        setSmallGroups(prev => prev.filter(smallGroup => smallGroup.id !== deleteModal.smallGroupId));
        
        // Close the modal
        closeDeleteModal();
        
        // Show success message (you could add a toast notification here)
        console.log('Small group deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting small group:', err);
      alert('Failed to delete small group. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Load small groups on component mount
  useEffect(() => {
    fetchSmallGroups();
  }, []);

  const filteredSmallGroups = smallGroups.filter(smallGroup => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    return (
      smallGroup.name?.toLowerCase().includes(searchLower) ||
      smallGroup.region?.name?.toLowerCase().includes(searchLower) ||
      smallGroup.university?.name?.toLowerCase().includes(searchLower)
    );
  });

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Organization", href: "/links/organization" },
    { label: "Small Groups", href: "/links/organization/small-groups" }
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
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Small Groups Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage small groups and their information across the organization</p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search small groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                  />
                </div>

                {/* Refresh Button */}
                <button 
                  onClick={fetchSmallGroups}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Add New Small Group Button */}
              <AddSmallGroupModal onSmallGroupAdded={fetchSmallGroups}>
                <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-all duration-200 shadow-sm text-sm sm:text-base">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add New Small Group</span>
                  <span className="sm:hidden">Add Small Group</span>
                </button>
              </AddSmallGroupModal>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-destructive">
                  <span className="text-sm font-medium">Error:</span>
                  <span className="text-sm">{error}</span>
                </div>
                <button 
                  onClick={fetchSmallGroups}
                  className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Small Groups Table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading small groups...</span>
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
                          Small Group Name
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          University
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Region
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                    {filteredSmallGroups.map((smallGroup) => (
                      <tr key={smallGroup.id}>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-foreground">
                          {smallGroup.id}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-foreground">
                          {smallGroup.name}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-muted-foreground">
                          {smallGroup.university?.name}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-muted-foreground">
                          {smallGroup.region?.name}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button 
                              onClick={() => openEditModal(smallGroup)}
                              className="text-muted-foreground hover:text-foreground p-1 rounded" 
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openDeleteModal(smallGroup.id, smallGroup.name)}
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
              {!loading && filteredSmallGroups.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No small groups found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm ? 'No small groups match your search criteria.' : 'No small groups have been added yet.'}
                  </p>
                  {!searchTerm && (
                    <AddSmallGroupModal onSmallGroupAdded={fetchSmallGroups}>
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        <Plus className="w-4 h-4" />
                        Add First Small Group
                      </button>
                    </AddSmallGroupModal>
                  )}
                </div>
              )}

              {/* Table Footer */}
              {!loading && filteredSmallGroups.length > 0 && (
                <div className="bg-muted/50 px-3 sm:px-6 py-3 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                    <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                      Showing <span className="font-medium text-foreground">{filteredSmallGroups.length}</span> of <span className="font-medium text-foreground">{smallGroups.length}</span> small groups
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
      
      {/* Delete Confirmation Modal */}
      <DeleteSmallGroupModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={deleteSmallGroup}
        smallGroupName={deleteModal.smallGroupName}
        isLoading={deleting}
      />
      
      {/* Edit Small Group Modal */}
      <EditSmallGroupModal
        smallGroup={editingSmallGroup}
        onSmallGroupUpdated={fetchSmallGroups}
        isOpen={editingSmallGroup !== null}
        onClose={closeEditModal}
      />
    </SidebarProvider>
  );
}
