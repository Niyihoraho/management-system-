"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Plus, Package, MapPin } from "lucide-react"
import { useUserScope } from "@/hooks/use-user-scope"

interface Region {
    id: number;
    name: string;
}

interface AddPropertyModalProps {
    children: React.ReactNode
    onPropertyAdded?: () => void
}

const PROPERTY_KINDS = [
    { value: "musical_instruments", label: "Musical Instruments" },
    { value: "books_for_reading", label: "Books for Reading" },
    { value: "secretarial_documents", label: "Secretarial Documents" },
    { value: "internal_regulations", label: "Internal Regulations" },
    { value: "training_equipments", label: "Training Equipments" },
    { value: "beddings", label: "Beddings" },
    { value: "kitchen_equipments", label: "Kitchen Equipments" },
    { value: "other_gbu_properties", label: "Other GBU Properties" },
]

export function AddPropertyModal({ children, onPropertyAdded }: AddPropertyModalProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [success, setSuccess] = React.useState(false)
    const [regions, setRegions] = React.useState<Region[]>([])
    const [formData, setFormData] = React.useState({
        kindOfProperty: "",
        nameOfProperty: "",
        numberOfProperties: "",
        propertiesFunctioning: "",
        propertiesNotFunctioning: "",
        whereKept: "",
        regionId: "",
    })

    // Get user scope for pre-selected fields
    const { userScope, loading: scopeLoading } = useUserScope()

    // Determine which fields should be visible based on user scope
    const visibleFields = React.useMemo(() => {
        if (!userScope || scopeLoading) return { region: true }

        return {
            region: userScope.scope === 'superadmin' || userScope.scope === 'national'
        }
    }, [userScope, scopeLoading])

    // Get default values based on user scope
    const defaultValues = React.useMemo(() => {
        if (!userScope || scopeLoading) return {}

        return {
            regionId: userScope.region?.id?.toString() || ""
        }
    }, [userScope, scopeLoading])

    // Fetch regions on modal open
    React.useEffect(() => {
        if (open) {
            fetchRegions()
        }
    }, [open])

    // Set default values when modal opens and user scope is loaded
    React.useEffect(() => {
        if (open && userScope && !scopeLoading && defaultValues.regionId) {
            setFormData(prev => ({
                ...prev,
                regionId: defaultValues.regionId
            }))
        }
    }, [open, userScope, scopeLoading, defaultValues.regionId])

    const fetchRegions = async () => {
        try {
            const response = await fetch('/api/regions')
            const data = await response.json()
            setRegions(data)
        } catch (error) {
            console.error('Error fetching regions:', error)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))

        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ""
            }))
        }

        // Clear success state when user starts typing
        if (success) {
            setSuccess(false)
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.kindOfProperty) {
            newErrors.kindOfProperty = "Property kind is required"
        }

        if (!formData.nameOfProperty.trim()) {
            newErrors.nameOfProperty = "Property name is required"
        }

        if (!formData.regionId) {
            newErrors.regionId = "Region is required"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsLoading(true)

        try {
            console.log('Creating property data:', formData)

            const response = await fetch('/api/properties', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    kindOfProperty: formData.kindOfProperty,
                    nameOfProperty: formData.nameOfProperty,
                    numberOfProperties: formData.numberOfProperties ? Number(formData.numberOfProperties) : 0,
                    propertiesFunctioning: formData.propertiesFunctioning ? Number(formData.propertiesFunctioning) : 0,
                    propertiesNotFunctioning: formData.propertiesNotFunctioning ? Number(formData.propertiesNotFunctioning) : 0,
                    whereKept: formData.whereKept,
                    regionId: Number(formData.regionId),
                })
            })
            const data = await response.json()

            console.log('API response:', { status: response.status, data })

            if (response.ok) {
                // Show success message
                setSuccess(true)
                setErrors({})

                // Reset form
                setFormData({
                    kindOfProperty: "",
                    nameOfProperty: "",
                    numberOfProperties: "",
                    propertiesFunctioning: "",
                    propertiesNotFunctioning: "",
                    whereKept: "",
                    regionId: defaultValues.regionId || "",
                })

                // Call the callback to refresh the list
                if (onPropertyAdded) {
                    onPropertyAdded()
                }

                // Close modal after a short delay
                setTimeout(() => {
                    setOpen(false)
                    setSuccess(false)
                }, 1500)
            } else {
                // Handle API errors
                console.error('API Error Response:', { status: response.status, data });

                let errorMessage = "Failed to create property";
                if (data && typeof data === 'object') {
                    if (data.error) errorMessage = data.error;
                    if (data.details && Array.isArray(data.details)) {
                        // validation errors
                        errorMessage += `: ${data.details.map((d: any) => d.message).join(', ')}`;
                    }
                } else if (typeof data === 'string') {
                    errorMessage = data;
                }

                setErrors({ general: errorMessage });
            }
        } catch (error) {
            console.error("Error creating property:", error)
            setErrors({ general: "An unexpected error occurred" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="top" className="h-full w-full max-w-none overflow-y-auto">
                <div className="container mx-auto max-w-2xl py-8">
                    <SheetHeader className="pb-8 text-center">
                        <SheetTitle className="flex items-center justify-center gap-3 text-2xl">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            Add New Property
                        </SheetTitle>
                        <SheetDescription className="text-lg text-muted-foreground">
                            Add a new property to the inventory.
                        </SheetDescription>
                    </SheetHeader>

                    <Card className="shadow-lg">
                        <CardHeader className="pb-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Property Information</h3>
                                <p className="text-sm text-muted-foreground">Fill in the details below</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {errors.general && (
                                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                        {errors.general}
                                    </div>
                                )}

                                {/* Show pre-selected scope information */}
                                {userScope && userScope.scope !== 'superadmin' && userScope.scope !== 'national' && (
                                    <div className="space-y-3">
                                        <h4 className="text-md font-semibold text-foreground border-b pb-2">Pre-selected Scope</h4>

                                        {!visibleFields.region && userScope.region && (
                                            <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-foreground">
                                                    Region: <span className="font-semibold">{userScope.region.name}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Property Information */}
                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-foreground border-b pb-2">Property Details</h4>

                                    <div className="space-y-2">
                                        <Label htmlFor="kindOfProperty" className="text-sm font-medium flex items-center gap-2">
                                            Kind of Property *
                                        </Label>
                                        <Select
                                            value={formData.kindOfProperty}
                                            onValueChange={(value) => handleInputChange("kindOfProperty", value)}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Select property kind" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PROPERTY_KINDS.map((kind) => (
                                                    <SelectItem key={kind.value} value={kind.value}>
                                                        {kind.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.kindOfProperty && <p className="text-sm text-red-600">{errors.kindOfProperty}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="nameOfProperty" className="text-sm font-medium flex items-center gap-2">
                                            Name of Property *
                                        </Label>
                                        <Input
                                            id="nameOfProperty"
                                            placeholder="Enter property name"
                                            className="h-11"
                                            value={formData.nameOfProperty}
                                            onChange={(e) => handleInputChange("nameOfProperty", e.target.value)}
                                            required
                                        />
                                        {errors.nameOfProperty && <p className="text-sm text-red-600">{errors.nameOfProperty}</p>}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="numberOfProperties" className="text-sm font-medium">
                                                Total Count
                                            </Label>
                                            <Input
                                                id="numberOfProperties"
                                                type="number"
                                                placeholder="0"
                                                className="h-11"
                                                min="0"
                                                value={formData.numberOfProperties}
                                                onChange={(e) => handleInputChange("numberOfProperties", e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="propertiesFunctioning" className="text-sm font-medium">
                                                Functioning
                                            </Label>
                                            <Input
                                                id="propertiesFunctioning"
                                                type="number"
                                                placeholder="0"
                                                className="h-11"
                                                min="0"
                                                value={formData.propertiesFunctioning}
                                                onChange={(e) => handleInputChange("propertiesFunctioning", e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="propertiesNotFunctioning" className="text-sm font-medium">
                                                Not Functioning
                                            </Label>
                                            <Input
                                                id="propertiesNotFunctioning"
                                                type="number"
                                                placeholder="0"
                                                className="h-11"
                                                min="0"
                                                value={formData.propertiesNotFunctioning}
                                                onChange={(e) => handleInputChange("propertiesNotFunctioning", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="whereKept" className="text-sm font-medium">
                                            Where are they kept?
                                        </Label>
                                        <Input
                                            id="whereKept"
                                            placeholder="Enter location"
                                            className="h-11"
                                            value={formData.whereKept}
                                            onChange={(e) => handleInputChange("whereKept", e.target.value)}
                                        />
                                    </div>

                                    {visibleFields.region && (
                                        <div className="space-y-2">
                                            <Label htmlFor="regionId" className="text-sm font-medium flex items-center gap-2">
                                                Region *
                                            </Label>
                                            <Select
                                                value={formData.regionId}
                                                onValueChange={(value) => handleInputChange("regionId", value)}
                                            >
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select region" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {regions.map((region) => (
                                                        <SelectItem key={region.id} value={region.id.toString()}>
                                                            {region.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.regionId && <p className="text-sm text-red-600">{errors.regionId}</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-6 border-t">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 h-11"
                                        onClick={() => setOpen(false)}
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 h-11"
                                        disabled={isLoading || success}
                                    >
                                        {isLoading ? (
                                            "Creating..."
                                        ) : success ? (
                                            "✅ Created Successfully!"
                                        ) : (
                                            <>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Property
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </SheetContent>
        </Sheet>
    )
}
