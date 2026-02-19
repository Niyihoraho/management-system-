"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"

interface University {
  id: number;
  name: string;
}

interface UniversityDropdownProps {
  regionId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function UniversityDropdown({ 
  regionId, 
  value, 
  onValueChange, 
  disabled = false 
}: UniversityDropdownProps) {
  const [universities, setUniversities] = React.useState<University[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Fetch universities when regionId changes
  React.useEffect(() => {
    if (!regionId) {
      setUniversities([])
      return
    }

    const fetchUniversities = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/universities?regionId=${regionId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch universities')
        }
        
        const data = await response.json()
        setUniversities(data)
      } catch (error) {
        console.error('Error fetching universities:', error)
        setUniversities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUniversities()
  }, [regionId])

  return (
    <div className="space-y-2">
      <Label htmlFor="universityId" className="text-sm font-medium flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        University
      </Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="h-11">
          <SelectValue placeholder={
            isLoading 
              ? "Loading universities..." 
              : universities.length === 0
                ? "No universities found"
                : "Select university"
          } />
        </SelectTrigger>
        <SelectContent>
          {universities.map((university) => (
            <SelectItem key={university.id} value={university.id.toString()}>
              {university.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Example usage component
export function OrganizationInfoExample() {
  const [selectedUniversityId, setSelectedUniversityId] = React.useState("")
  
  // This would come from your user scope context
  const currentRegionId = "1" // Replace with actual North-west region ID
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Organization Information</h3>
        <p className="text-sm text-muted-foreground">
          Current Scope: Region - North-west
        </p>
      </div>
      
      <UniversityDropdown
        regionId={currentRegionId}
        value={selectedUniversityId}
        onValueChange={setSelectedUniversityId}
      />
    </div>
  )
}
