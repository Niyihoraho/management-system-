"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Plus, Edit, Trash2, Package } from 'lucide-react';
import { AppSidebar } from "@/components/app-sidebar";
import { AddPropertyModal } from "@/components/add-property-modal";
import { DeletePropertyModal } from "@/components/delete-property-modal";
import { EditPropertyModal } from "@/components/edit-property-modal";
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

interface Property {
    id: number;
    kindOfProperty: string;
    nameOfProperty: string;
    numberOfProperties: number;
    propertiesFunctioning: number;
    propertiesNotFunctioning: number;
    whereKept: string | null;
    regionId: number;
    region: { name: string };
    updatedAt: string;
}

const PROPERTY_KINDS: Record<string, string> = {
    "musical_instruments": "Musical Instruments",
    "books_for_reading": "Books for Reading",
    "secretarial_documents": "Secretarial Documents",
    "internal_regulations": "Internal Regulations",
    "training_equipments": "Training Equipments",
    "beddings": "Beddings",
    "kitchen_equipments": "Kitchen Equipments",
    "other_gbu_properties": "Other GBU Properties",
};

export default function PropertiesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        propertyId: number | null;
        propertyName: string;
    }>({
        isOpen: false,
        propertyId: null,
        propertyName: ''
    });
    const [deleting, setDeleting] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);

    // Fetch properties from API
    const fetchProperties = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/properties');
            setProperties(response.data);
        } catch (err: any) {
            console.error('Error fetching properties:', err);
            const serverError = err.response?.data;
            const errorMessage = serverError?.details || serverError?.error || err.message || 'Unknown error';
            setError(`Failed to fetch properties. Error: ${errorMessage}`);

            if (serverError?.stack) {
                console.error("Server Stack Trace:", serverError.stack);
            }
        } finally {
            setLoading(false);
        }
    };

    // Open delete confirmation modal
    const openDeleteModal = (propertyId: number, propertyName: string) => {
        setDeleteModal({
            isOpen: true,
            propertyId,
            propertyName
        });
    };

    // Close delete confirmation modal
    const closeDeleteModal = () => {
        setDeleteModal({
            isOpen: false,
            propertyId: null,
            propertyName: ''
        });
    };

    // Open edit modal
    const openEditModal = (property: Property) => {
        setEditingProperty(property);
    };

    // Close edit modal
    const closeEditModal = () => {
        setEditingProperty(null);
    };

    // Delete property function
    const deleteProperty = async () => {
        if (!deleteModal.propertyId) return;

        setDeleting(true);

        try {
            const response = await axios.delete(`/api/properties?id=${deleteModal.propertyId}`);

            if (response.status === 200) {
                setProperties(prev => prev.filter(property => property.id !== deleteModal.propertyId));
                closeDeleteModal();
                console.log('Property deleted successfully');
            }
        } catch (err) {
            console.error('Error deleting property:', err);
            alert('Failed to delete property. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    // Load properties on component mount
    useEffect(() => {
        fetchProperties();
    }, []);

    const filteredProperties = properties.filter(property => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const kindLabel = PROPERTY_KINDS[property.kindOfProperty] || property.kindOfProperty;

        return (
            property.nameOfProperty.toLowerCase().includes(searchLower) ||
            kindLabel.toLowerCase().includes(searchLower) ||
            property.region?.name.toLowerCase().includes(searchLower) ||
            (property.whereKept && property.whereKept.toLowerCase().includes(searchLower))
        );
    });

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
                                    <BreadcrumbLink href="/links/organization">
                                        Organization
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Properties</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-2 sm:p-4 pt-0">
                    <div className="max-w-7xl mx-auto w-full">
                        {/* Header */}
                        <div className="mb-4 sm:mb-6 lg:mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Properties Management</h1>
                            <p className="text-sm sm:text-base text-muted-foreground">Manage organization properties, equipment, and resources</p>
                        </div>

                        {/* Search and Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between mb-4 sm:mb-6">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1">
                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search properties..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-muted/30 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-muted/50 transition-all duration-200 text-foreground placeholder:text-muted-foreground text-sm sm:text-base"
                                    />
                                </div>

                                {/* Refresh Button */}
                                <button
                                    onClick={fetchProperties}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-foreground bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40 rounded-lg transition-all duration-200 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
                                </button>
                            </div>

                            {/* Add New Property Button */}
                            <AddPropertyModal onPropertyAdded={fetchProperties}>
                                <button className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-all duration-200 shadow-sm text-sm sm:text-base">
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Add New Property</span>
                                    <span className="sm:hidden">Add Property</span>
                                </button>
                            </AddPropertyModal>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2 text-destructive">
                                    <span className="text-sm font-medium">Error:</span>
                                    <span className="text-sm">{error}</span>
                                </div>
                                <button
                                    onClick={fetchProperties}
                                    className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {/* Properties Table */}
                        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Loading properties...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px]">
                                        <thead className="bg-muted/50 border-b border-border">
                                            <tr>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Kind of Properties
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Total
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Functioning
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Not Functioning
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Where Kept
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
                                            {filteredProperties.map((property) => (
                                                <tr key={property.id} className="hover:bg-muted/50">
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium text-foreground">
                                                        {PROPERTY_KINDS[property.kindOfProperty] || property.kindOfProperty}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-foreground">
                                                        {property.nameOfProperty}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-foreground">
                                                        {property.numberOfProperties}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-green-600">
                                                        {property.propertiesFunctioning}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-red-600">
                                                        {property.propertiesNotFunctioning}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-muted-foreground">
                                                        {property.whereKept || '-'}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-muted-foreground">
                                                        {property.region?.name}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm font-medium">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <button
                                                                onClick={() => openEditModal(property)}
                                                                className="text-muted-foreground hover:text-foreground p-1 rounded"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(property.id, property.nameOfProperty)}
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
                            {!loading && filteredProperties.length === 0 && !error && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Package className="w-12 h-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium text-foreground mb-2">No properties found</h3>
                                    <p className="text-muted-foreground text-center mb-4">
                                        {searchTerm ? 'No properties match your search criteria.' : 'No properties have been added yet.'}
                                    </p>
                                    {!searchTerm && (
                                        <AddPropertyModal onPropertyAdded={fetchProperties}>
                                            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                                                <Plus className="w-4 h-4" />
                                                Add First Property
                                            </button>
                                        </AddPropertyModal>
                                    )}
                                </div>
                            )}

                            {/* Table Footer */}
                            {!loading && filteredProperties.length > 0 && (
                                <div className="bg-muted/50 px-3 sm:px-6 py-3 border-t border-border">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                                            Showing <span className="font-medium text-foreground">{filteredProperties.length}</span> of <span className="font-medium text-foreground">{properties.length}</span> properties
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SidebarInset>

            {/* Delete Confirmation Modal */}
            <DeletePropertyModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={deleteProperty}
                propertyName={deleteModal.propertyName}
                isLoading={deleting}
            />

            {/* Edit Property Modal */}
            <EditPropertyModal
                property={editingProperty}
                onPropertyUpdated={fetchProperties}
                isOpen={editingProperty !== null}
                onClose={closeEditModal}
            />
        </SidebarProvider>
    );
}
