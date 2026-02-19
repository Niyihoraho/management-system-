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

interface Region {
  id: number;
  name: string;
}

interface AddAlumniSmallGroupModalProps {
  children: React.ReactNode
  onAlumniSmallGroupAdded?: () => void
}

export function AddAlumniSmallGroupModal({ children, onAlumniSmallGroupAdded }: AddAlumniSmallGroupModalProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [success, setSuccess] = React.useState(false)
  const [regions, setRegions] = React.useState<Region[]>([])
  const [formData, setFormData] = React.useState({
    name: "",
    regionId: "",
  })

  // Get user scope for pre-selected fields
  const { userScope, scopeLoading } = useUserScope()
  
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
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      console.log('Creating alumni small group data:', formData)
      
      const response = await fetch('/api/alumni-small-groups', {
        method: 'POST',
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
        
        // Reset form
        setFormData({
          name: "",
          regionId: "",
        })
        
        // Call the callback to refresh the alumni small groups list
        if (onAlumniSmallGroupAdded) {
          onAlumniSmallGroupAdded()
        }
        
        // Close modal after a short delay
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1500)
      } else {
        // Handle API errors
        console.error('API Error:', data)
        setErrors({ general: data.error || "Failed to create alumni small group" })
      }
    } catch (error) {
      console.error("Error creating alumni small group:", error)
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
              Add New Alumni Small Group
            </SheetTitle>
            <SheetDescription className="text-lg text-muted-foreground">
              Add a new alumni small group to your organization.
            </SheetDescription>
          </SheetHeader>
          
          <Card className="shadow-lg">
            <CardHeader className="pb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Alumni Small Group Information</h3>
                <p className="text-sm text-muted-foreground">Fill in the details below to add a new alumni small group</p>
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

                  {visibleFields.region && (
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
                        Add Alumni Small Group
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
