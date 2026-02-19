
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
import { Plus, GraduationCap, MapPin } from "lucide-react"
import { useUserScope } from "@/hooks/use-user-scope"

interface Province {
    id: string; // BigInt serialized to string
    name: string;
}

interface AddGraduateSmallGroupModalProps {
    children: React.ReactNode
    onGraduateSmallGroupAdded?: () => void
}

export function AddGraduateSmallGroupModal({ children, onGraduateSmallGroupAdded }: AddGraduateSmallGroupModalProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [success, setSuccess] = React.useState(false)
    const [provinces, setProvinces] = React.useState<Province[]>([])
    const [formData, setFormData] = React.useState({
        name: "",
        provinceId: "",
    })

    // Get user scope for pre-selected fields
    const { userScope, scopeLoading } = useUserScope()

    // Determine which fields should be visible based on user scope
    // Assuming "province" scope might exist or mapping "region" to "province" if applicable? 
    // For now, if scope is superadmin/national, show province selector. 
    // If user has a specific scope that ties to a province, we might need to handle that.
    // Given the previous code used "Region", and we are moving to "Province", let's assume SuperAdmin/National sees all.
    const visibleFields = React.useMemo(() => {
        if (!userScope || scopeLoading) return { province: true }

        return {
            province: userScope.scope === 'superadmin' || userScope.scope === 'national'
        }
    }, [userScope, scopeLoading])

    // Get default values based on user scope
    const defaultValues = React.useMemo(() => {
        if (!userScope || scopeLoading) return {}

        // TODO: adaptation for province scope if it exists in future.
        // For now, no default provinceId unless explicitly mapped.
        return {
            provinceId: ""
        }
    }, [userScope, scopeLoading])

    // Fetch provinces on modal open
    React.useEffect(() => {
        if (open) {
            fetchProvinces()
        }
    }, [open])

    const fetchProvinces = async () => {
        try {
            const response = await fetch('/api/provinces')
            const data = await response.json()
            setProvinces(data)
        } catch (error) {
            console.error('Error fetching provinces:', error)
        }
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: "" }))
        }

        if (success) {
            setSuccess(false)
        }
    }

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) {
            newErrors.name = "Graduate small group name is required"
        }

        if (!formData.provinceId) {
            newErrors.provinceId = "Province is required"
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
            console.log('Creating graduate small group data:', formData)

            const response = await fetch('/api/graduate-small-groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    provinceId: formData.provinceId // API expects string or number, will convert to BigInt
                })
            })
            const data = await response.json()

            if (response.ok) {
                setSuccess(true)
                setErrors({})
                setFormData({ name: "", provinceId: "" })

                if (onGraduateSmallGroupAdded) {
                    onGraduateSmallGroupAdded()
                }

                setTimeout(() => {
                    setOpen(false)
                    setSuccess(false)
                }, 1500)
            } else {
                console.error('API Error:', data)
                setErrors({ general: data.error || "Failed to create graduate small group" })
            }
        } catch (error) {
            console.error("Error creating graduate small group:", error)
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
                            Add New Graduate Small Group
                        </SheetTitle>
                        <SheetDescription className="text-lg text-muted-foreground">
                            Add a new graduate small group to your organization.
                        </SheetDescription>
                    </SheetHeader>

                    <Card className="shadow-lg">
                        <CardHeader className="pb-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Graduate Small Group Information</h3>
                                <p className="text-sm text-muted-foreground">Fill in the details below to add a new graduate small group</p>
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
                                    <h4 className="text-md font-semibold text-foreground border-b pb-2">Graduate Small Group Details</h4>

                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                                            <GraduationCap className="h-4 w-4" />
                                            Graduate Small Group Name *
                                        </Label>
                                        <Input
                                            id="name"
                                            placeholder="Enter graduate small group name"
                                            className="h-11"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange("name", e.target.value)}
                                            required
                                        />
                                        {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                    </div>

                                    {visibleFields.province && (
                                        <div className="space-y-2">
                                            <Label htmlFor="provinceId" className="text-sm font-medium flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                Province *
                                            </Label>
                                            <Select
                                                value={formData.provinceId}
                                                onValueChange={(value) => handleInputChange("provinceId", value)}
                                            >
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select a province" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {provinces.map((province) => (
                                                        <SelectItem key={province.id} value={province.id}>
                                                            {province.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.provinceId && <p className="text-sm text-red-600">{errors.provinceId}</p>}
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
                                                Add Graduate Small Group
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
