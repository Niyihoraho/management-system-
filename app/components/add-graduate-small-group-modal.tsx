"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Plus, MapPin } from "lucide-react"

interface Province {
    id: string;
    name: string;
}

interface AddGraduateSmallGroupModalProps {
    children: React.ReactNode;
    onGraduateSmallGroupAdded?: () => void;
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

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ""
            }))
        }

        // Clear success message
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
            const response = await fetch('/api/graduate-small-groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    provinceId: formData.provinceId
                })
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(true)
                setErrors({})
                setFormData({
                    name: "",
                    provinceId: "",
                })

                if (onGraduateSmallGroupAdded) {
                    onGraduateSmallGroupAdded()
                }

                // Optional: Close modal after success
                // setTimeout(() => setOpen(false), 1500)
            } else {
                setErrors(prev => ({
                    ...prev,
                    form: data.error || "Failed to create graduate small group"
                }))
            }
        } catch (error) {
            console.error('Error creating graduate small group:', error)
            setErrors(prev => ({
                ...prev,
                form: "An unexpected error occurred"
            }))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="sm:max-w-[500px]">
                <SheetHeader>
                    <SheetTitle>Add Graduate Small Group</SheetTitle>
                    <SheetDescription>
                        Create a new graduate small group in your province.
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <Card>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {errors.form && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                                        {errors.form}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => handleInputChange("name", e.target.value)}
                                            placeholder="Enter small group name"
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
                                                    <SelectItem key={province.id} value={province.id.toString()}>
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
