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
} from "@/components/ui/sheet"
import { Edit, Save, MapPin } from "lucide-react"
import { useUserScope } from "@/hooks/use-user-scope"

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
}

interface Region {
    id: number;
    name: string;
}

interface EditPropertyModalProps {
    property: Property | null
    isOpen: boolean
    onClose: () => void
    onPropertyUpdated: () => void
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

export function EditPropertyModal({ property, isOpen, onClose, onPropertyUpdated }: EditPropertyModalProps) {
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

    // Get user scope
    const { userScope, isLoading: scopeLoading } = useUserScope()

    // Determine visible fields
    const visibleFields = React.useMemo(() => {
        if (!userScope || scopeLoading) return { region: true }
        return {
            region: userScope.scope === 'superadmin' || userScope.scope === 'national'
        }
    }, [userScope, scopeLoading])

    // Fetch regions on modal open
    React.useEffect(() => {
        if (isOpen) {
            fetchRegions()
        }
    }, [isOpen])

    // Initialize form with property data
    React.useEffect(() => {
        if (isOpen && property) {
            setFormData({
                kindOfProperty: property.kindOfProperty,
                nameOfProperty: property.nameOfProperty,
                numberOfProperties: property.numberOfProperties.toString(),
                propertiesFunctioning: property.propertiesFunctioning.toString(),
                propertiesNotFunctioning: property.propertiesNotFunctioning.toString(),
                whereKept: property.whereKept || "",
                regionId: property.regionId.toString(),
            })
        }
    }, [isOpen, property])

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
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }))
        if (success) setSuccess(false)
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}
        if (!formData.kindOfProperty) newErrors.kindOfProperty = "Property kind is required"
        if (!formData.nameOfProperty.trim()) newErrors.nameOfProperty = "Property name is required"
        if (!formData.regionId) newErrors.regionId = "Region is required"
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm() || !property) return

        setIsLoading(true)

        try {
            const response = await fetch('/api/properties', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: property.id,
                    kindOfProperty: formData.kindOfProperty,
                    nameOfProperty: formData.nameOfProperty,
                    numberOfProperties: Number(formData.numberOfProperties) || 0,
                    propertiesFunctioning: Number(formData.propertiesFunctioning) || 0,
                    propertiesNotFunctioning: Number(formData.propertiesNotFunctioning) || 0,
                    whereKept: formData.whereKept,
                    regionId: Number(formData.regionId),
                })
            })

            if (response.ok) {
                setSuccess(true)
                onPropertyUpdated()
                setTimeout(() => {
                    onClose()
                    setSuccess(false)
                }, 1500)
            } else {
                const data = await response.json()
                setErrors({ general: typeof data === 'string' ? data : "Failed to update property" })
            }
        } catch (error) {
            console.error("Error updating property:", error)
            setErrors({ general: "An unexpected error occurred" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="top" className="h-full w-full max-w-none overflow-y-auto">
                <div className="container mx-auto max-w-2xl py-8">
                    <SheetHeader className="pb-8 text-center">
                        <SheetTitle className="flex items-center justify-center gap-3 text-2xl">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <Edit className="h-6 w-6 text-primary" />
                            </div>
                            Edit Property
                        </SheetTitle>
                        <SheetDescription className="text-lg text-muted-foreground">
                            Update property details.
                        </SheetDescription>
                    </SheetHeader>

                    <Card className="shadow-lg">
                        <CardHeader className="pb-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Property Information</h3>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {errors.general && (
                                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                        {errors.general}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h4 className="text-md font-semibold text-foreground border-b pb-2">Property Details</h4>

                                    <div className="space-y-2">
                                        <Label htmlFor="kindOfProperty" className="text-sm font-medium">Kind of Property *</Label>
                                        <Select value={formData.kindOfProperty} onValueChange={(val) => handleInputChange("kindOfProperty", val)}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Select property kind" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PROPERTY_KINDS.map((kind) => (
                                                    <SelectItem key={kind.value} value={kind.value}>{kind.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="nameOfProperty" className="text-sm font-medium">Name of Property *</Label>
                                        <Input
                                            id="nameOfProperty"
                                            className="h-11"
                                            value={formData.nameOfProperty}
                                            onChange={(e) => handleInputChange("nameOfProperty", e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="numberOfProperties">Total Count</Label>
                                            <Input
                                                id="numberOfProperties"
                                                type="number"
                                                className="h-11"
                                                min="0"
                                                value={formData.numberOfProperties}
                                                onChange={(e) => handleInputChange("numberOfProperties", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="propertiesFunctioning">Functioning</Label>
                                            <Input
                                                id="propertiesFunctioning"
                                                type="number"
                                                className="h-11"
                                                min="0"
                                                value={formData.propertiesFunctioning}
                                                onChange={(e) => handleInputChange("propertiesFunctioning", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="propertiesNotFunctioning">Not Functioning</Label>
                                            <Input
                                                id="propertiesNotFunctioning"
                                                type="number"
                                                className="h-11"
                                                min="0"
                                                value={formData.propertiesNotFunctioning}
                                                onChange={(e) => handleInputChange("propertiesNotFunctioning", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="whereKept">Where are they kept?</Label>
                                        <Input
                                            id="whereKept"
                                            className="h-11"
                                            value={formData.whereKept}
                                            onChange={(e) => handleInputChange("whereKept", e.target.value)}
                                        />
                                    </div>

                                    {visibleFields.region && (
                                        <div className="space-y-2">
                                            <Label htmlFor="regionId">Region *</Label>
                                            <Select value={formData.regionId} onValueChange={(val) => handleInputChange("regionId", val)}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select region" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {regions.map((region) => (
                                                        <SelectItem key={region.id} value={region.id.toString()}>{region.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-6 border-t">
                                    <Button type="button" variant="outline" className="flex-1 h-11" onClick={onClose} disabled={isLoading}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1 h-11" disabled={isLoading || success}>
                                        {isLoading ? "Saving..." : success ? "✅ Saved Successfully!" : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
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
