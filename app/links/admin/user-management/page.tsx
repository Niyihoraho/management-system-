'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import axios from 'axios';
import { Search, RefreshCw, UserPlus, Edit, Trash2, Eye, Users, Mail, Phone, Calendar, UserCheck } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { AddUserModal } from "@/components/add-user-modal";
import { DeleteUserModal } from "@/components/delete-user-modal";
import { EditUserModal } from "@/components/edit-user-modal";
import { AssignRoleModal } from "@/components/assign-role-modal";
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

// Types for API response
interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  contact?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  userrole?: {
    id: number;
    scope: string;
    region?: { name: string } | null;
    university?: { name: string } | null;
    smallgroup?: { name: string } | null;
    graduateSmallGroup?: { name: string } | null;
  }[];
}

const userStatusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

const userStatusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
};

const scopeLabels = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  user: 'User',
};

const scopeColors = {
  superadmin: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  moderator: 'bg-yellow-100 text-yellow-800',
  user: 'bg-gray-100 text-gray-800',
};

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: ''
  });
  const [deleting, setDeleting] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/users?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}`);
      setUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm]);

  // Load users on component mount and when search/page changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open delete confirmation modal
  const openDeleteModal = (userId: string, userName: string) => {
    setDeleteModal({
      isOpen: true,
      userId,
      userName
    });
  };

  // Close delete confirmation modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      userId: null,
      userName: ''
    });
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditingUser(null);
  };

  // Delete user function
  const deleteUser = async () => {
    if (!deleteModal.userId) return;

    setDeleting(true);

    try {
      const response = await axios.delete(`/api/users?id=${deleteModal.userId}`);

      if (response.status === 200) {
        // Remove the user from the local state
        setUsers(prev => prev.filter(user => user.id !== deleteModal.userId));

        // Close the modal
        closeDeleteModal();

        // Show success message (you could add a toast notification here)
        console.log('User deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.contact?.includes(searchTerm) ||
      user.status?.toLowerCase().includes(searchLower) ||
      userStatusLabels[user.status as keyof typeof userStatusLabels]?.toLowerCase().includes(searchLower)
    );
  });

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination handlers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, page));
  };

  const _goToPreviousPage = () => {
    goToPage(currentPage - 1);
  };

  const _goToNextPage = () => {
    goToPage(currentPage + 1);
  };

  // Show loading state while session is being fetched
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to access this page.</p>
          <Link href="/" className="text-primary hover:underline">Go to Login</Link>
        </div>
      </div>
    );
  }

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
                  <BreadcrumbLink href="/links/admin/user-management">
                    Admin
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>User Management</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
          <div className="max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">User Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage system users and their permissions</p>
            </div>

            {/* Search and Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                  />
                </div>

                {/* Refresh Button */}
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Add New User Button */}
              <AddUserModal onUserAdded={fetchUsers}>
                <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-all duration-200 shadow-sm text-sm sm:text-base">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add New User</span>
                  <span className="sm:hidden">Add User</span>
                </button>
              </AddUserModal>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-destructive">
                  <span className="text-sm font-medium">Error:</span>
                  <span className="text-sm">{error}</span>
                </div>
                <button
                  onClick={fetchUsers}
                  className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                          Contact
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Roles & Permissions
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                    {user.name?.[0]}{user.username?.[0]}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                                <div className="text-sm font-medium text-foreground truncate">
                                  {user.name}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 truncate">
                                  <span>@{user.username}</span>
                                  <span>•</span>
                                  <span>{user.id}</span>
                                </div>
                                {/* Mobile: Show contact info inline */}
                                <div className="md:hidden mt-1 space-y-1">
                                  <div className="text-xs text-foreground flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{user.email}</span>
                                  </div>
                                  {user.contact && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{user.contact}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                            <div className="text-sm text-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[200px]">{user.email}</span>
                            </div>
                            {user.contact && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{user.contact}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="space-y-1">
                              {user.userrole && user.userrole.length > 0 ? (
                                user.userrole.map((role, index) => (
                                  <div key={index} className="flex flex-col gap-1">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${scopeColors[role.scope as keyof typeof scopeColors]}`}>
                                      {scopeLabels[role.scope as keyof typeof scopeLabels]}
                                    </span>
                                    {role.region && (
                                      <span className="text-xs text-muted-foreground">Region: {role.region.name}</span>
                                    )}
                                    {role.university && (
                                      <span className="text-xs text-muted-foreground">University: {role.university.name}</span>
                                    )}
                                    {role.smallgroup && (
                                      <span className="text-xs text-muted-foreground">Small Group: {role.smallgroup.name}</span>
                                    )}
                                    {role.graduateSmallGroup && (
                                      <span className="text-xs text-muted-foreground">Graduate Group: {role.graduateSmallGroup.name}</span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">No roles assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4">
                            <div className="flex flex-col gap-1 sm:gap-2">
                              {/* Status Badge */}
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${userStatusColors[user.status as keyof typeof userStatusColors]}`}>
                                {userStatusLabels[user.status as keyof typeof userStatusLabels]}
                              </span>
                              {/* Created Date */}
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <button className="text-primary hover:text-primary/80 p-1 rounded" title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(user)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <AssignRoleModal
                                userId={user.id}
                                userName={user.name || user.username}
                                onRoleAssigned={fetchUsers}
                              >
                                <button
                                  className="text-blue-600 hover:text-blue-700 p-1 rounded"
                                  title="Assign Role"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              </AssignRoleModal>
                              <button
                                onClick={() => openDeleteModal(user.id, user.name || user.username)}
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
              {!loading && filteredUsers.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm ? 'No users match your search criteria.' : 'No users have been added yet.'}
                  </p>
                  {!searchTerm && (
                    <AddUserModal onUserAdded={fetchUsers}>
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        <UserPlus className="w-4 h-4" />
                        Add First User
                      </button>
                    </AddUserModal>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Delete Confirmation Modal */}
      <DeleteUserModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={deleteUser}
        userName={deleteModal.userName}
        isLoading={deleting}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={editingUser}
        onUserUpdated={fetchUsers}
        isOpen={editingUser !== null}
        onClose={closeEditModal}
      />
    </SidebarProvider>
  );
}
