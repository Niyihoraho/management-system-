
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
import { Edit, GraduationCap, MapPin } from "lucide-react"

interface Province {
    id: string;
    name: string;
}

interface GraduateSmallGroup {
    id: number;
    name: string;
    provinceId: string; // BigInt serialized to string
    provinces: { name: string };
}

interface EditGraduateSmallGroupModalProps {
    graduateSmallGroup: GraduateSmallGroup | null
    onGraduateSmallGroupUpdated?: () => void
    isOpen: boolean
    onClose: () => void
}

export function EditGraduateSmallGroupModal({ graduateSmallGroup, onGraduateSmallGroupUpdated, isOpen, onClose }: EditGraduateSmallGroupModalProps) {
    const [isLoading, setIsLoading] = React.useState(false)
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [success, setSuccess] = React.useState(false)
    const [provinces, setProvinces] = React.useState<Province[]>([])
    const [formData, setFormData] = React.useState({
        name: "",
        provinceId: "",
    })

    // Fetch provinces when modal opens
    React.useEffect(() => {
        if (isOpen) {
            fetchProvinces()
        }
    }, [isOpen])

    // Populate form data when graduate small group changes
    React.useEffect(() => {
        if (graduateSmallGroup) {
            setFormData({
                name: graduateSmallGroup.name || "",
                provinceId: graduateSmallGroup.provinceId?.toString() || "",
            })
        }
    }, [graduateSmallGroup])

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

        if (!graduateSmallGroup) return

        if (!validateForm()) {
            return
        }

        setIsLoading(true)

        try {
            console.log('Updating graduate small group data:', formData)

            const response = await fetch(`/api/graduate-small-groups?id=${graduateSmallGroup.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    provinceId: Number(formData.provinceId) // Or string, depends on backend, but typically ID
                })
            })
            const data = await response.json()

            if (response.ok) {
                setSuccess(true)
                setErrors({})

                if (onGraduateSmallGroupUpdated) {
                    onGraduateSmallGroupUpdated()
                }

                setTimeout(() => {
                    onClose()
                    setSuccess(false)
                }, 1500)
            } else {
                console.error('API Error:', data)
                setErrors({ general: data.error || "Failed to update graduate small group" })
            }
        } catch (error) {
            console.error("Error updating graduate small group:", error)
            setErrors({ general: "An unexpected error occurred" })
        } finally {
            setIsLoading(false)
        }
    }

    if (!graduateSmallGroup) return null

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="top" className="h-full w-full max-w-none overflow-y-auto">
                <div className="container mx-auto max-w-2xl py-8">
                    <SheetHeader className="pb-8 text-center">
                        <SheetTitle className="flex items-center justify-center gap-3 text-2xl">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <Edit className="h-6 w-6 text-primary" />
                            </div>
                            Edit Graduate Small Group
                        </SheetTitle>
                        <SheetDescription className="text-lg text-muted-foreground">
                            Update graduate small group information for {graduateSmallGroup.name}.
                        </SheetDescription>
                    </SheetHeader>

                    <Card className="shadow-lg">
                        <CardHeader className="pb-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Graduate Small Group Information</h3>
                                <p className="text-sm text-muted-foreground">Update the details below for this graduate small group</p>
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
                                </div>

                                <div className="flex gap-3 pt-6 border-t">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1 h-11"
                                        onClick={onClose}
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
                                            "Updating..."
                                        ) : success ? (
                                            "✅ Updated Successfully!"
                                        ) : (
                                            <>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Update Graduate Small Group
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
