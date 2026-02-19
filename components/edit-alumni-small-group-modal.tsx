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

interface Region {
  id: number;
  name: string;
}

interface AlumniSmallGroup {
  id: number;
  name: string;
  regionId: number;
  region: { name: string };
}

interface EditAlumniSmallGroupModalProps {
  alumniSmallGroup: AlumniSmallGroup | null
  onAlumniSmallGroupUpdated?: () => void
  isOpen: boolean
  onClose: () => void
}

export function EditAlumniSmallGroupModal({ alumniSmallGroup, onAlumniSmallGroupUpdated, isOpen, onClose }: EditAlumniSmallGroupModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [success, setSuccess] = React.useState(false)
  const [regions, setRegions] = React.useState<Region[]>([])
  const [formData, setFormData] = React.useState({
    name: "",
    regionId: "",
  })

  // Fetch regions when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchRegions()
    }
  }, [isOpen])

  // Populate form data when alumni small group changes
  React.useEffect(() => {
    if (alumniSmallGroup) {
      setFormData({
        name: alumniSmallGroup.name || "",
        regionId: alumniSmallGroup.regionId?.toString() || "",
      })
    }
  }, [alumniSmallGroup])

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
    
    if (!formData.name.trim()) {
      newErrors.name = "Alumni small group name is required"
    }
    
    if (!formData.regionId) {
      newErrors.regionId = "Region is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!alumniSmallGroup) return
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      console.log('Updating alumni small group data:', formData)
      
      const response = await fetch(`/api/alumni-small-groups?id=${alumniSmallGroup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          regionId: Number(formData.regionId)
        })
      })
      const data = await response.json()
      
      console.log('API response:', { status: response.status, data })
      
      if (response.ok) {
        // Show success message
        setSuccess(true)
        setErrors({})
        
        // Call the callback to refresh the alumni small groups list
        if (onAlumniSmallGroupUpdated) {
          onAlumniSmallGroupUpdated()
        }
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose()
          setSuccess(false)
        }, 1500)
      } else {
        // Handle API errors
        console.error('API Error:', data)
        setErrors({ general: data.error || "Failed to update alumni small group" })
      }
    } catch (error) {
      console.error("Error updating alumni small group:", error)
      setErrors({ general: "An unexpected error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  if (!alumniSmallGroup) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="top" className="h-full w-full max-w-none overflow-y-auto">
        <div className="container mx-auto max-w-2xl py-8">
          <SheetHeader className="pb-8 text-center">
            <SheetTitle className="flex items-center justify-center gap-3 text-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Edit className="h-6 w-6 text-primary" />
              </div>
              Edit Alumni Small Group
            </SheetTitle>
            <SheetDescription className="text-lg text-muted-foreground">
              Update alumni small group information for {alumniSmallGroup.name}.
            </SheetDescription>
          </SheetHeader>
          
          <Card className="shadow-lg">
            <CardHeader className="pb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Alumni Small Group Information</h3>
                <p className="text-sm text-muted-foreground">Update the details below for this alumni small group</p>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {errors.general && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {errors.general}
                  </div>
                )}

                {/* Alumni Small Group Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-foreground border-b pb-2">Alumni Small Group Details</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Alumni Small Group Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="Enter alumni small group name"
                      className="h-11"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="regionId" className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Region *
                    </Label>
                    <Select
                      value={formData.regionId}
                      onValueChange={(value) => handleInputChange("regionId", value)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a region" />
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
                        Update Alumni Small Group
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
