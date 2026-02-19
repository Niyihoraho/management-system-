"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { MapPin, Building2, Users, GraduationCap } from "lucide-react"

interface Region {
  id: number;
  name: string;
}

interface University {
  id: number;
  name: string;
  regionId: number;
}

interface SmallGroup {
  id: number;
  name: string;
  universityId: number;
  regionId: number;
}

interface AlumniGroup {
  id: number;
  name: string;
  regionId: number;
}

interface SuperAdminScopeSelectorProps {
  onScopeChange: (scope: {
    regionId?: string;
    universityId?: string;
    smallGroupId?: string;
    alumniGroupId?: string;
  }) => void
}

export function SuperAdminScopeSelector({ onScopeChange }: SuperAdminScopeSelectorProps) {
  const [regions, setRegions] = React.useState<Region[]>([])
  const [universities, setUniversities] = React.useState<University[]>([])
  const [smallGroups, setSmallGroups] = React.useState<SmallGroup[]>([])
  const [alumniGroups, setAlumniGroups] = React.useState<AlumniGroup[]>([])
  const [selectedRegion, setSelectedRegion] = React.useState("")
  const [selectedUniversity, setSelectedUniversity] = React.useState("")
  const [selectedSmallGroup, setSelectedSmallGroup] = React.useState("")
  const [selectedAlumniGroup, setSelectedAlumniGroup] = React.useState("")

  // Fetch regions on component mount
  React.useEffect(() => {
    fetchRegions()
  }, [])

  // Fetch universities when region changes
  React.useEffect(() => {
    if (selectedRegion) {
      fetchUniversities(Number(selectedRegion))
      fetchAlumniGroups(Number(selectedRegion))
    } else {
      setUniversities([])
      setAlumniGroups([])
      setSelectedUniversity("")
      setSelectedAlumniGroup("")
    }
  }, [selectedRegion])

  // Fetch small groups when university changes
  React.useEffect(() => {
    if (selectedUniversity) {
      fetchSmallGroups(Number(selectedUniversity))
    } else {
      setSmallGroups([])
      setSelectedSmallGroup("")
    }
  }, [selectedUniversity])

  // Notify parent of scope changes
  React.useEffect(() => {
    onScopeChange({
      regionId: selectedRegion,
      universityId: selectedUniversity,
      smallGroupId: selectedSmallGroup,
      alumniGroupId: selectedAlumniGroup
    })
  }, [selectedRegion, selectedUniversity, selectedSmallGroup, selectedAlumniGroup, onScopeChange])

  const fetchRegions = async () => {
    try {
      const response = await fetch('/api/regions')
      const data = await response.json()
      setRegions(data)
    } catch (error) {
      console.error('Error fetching regions:', error)
    }
  }

  const fetchUniversities = async (regionId: number) => {
    try {
      const response = await fetch(`/api/universities?regionId=${regionId}`)
      const data = await response.json()
      setUniversities(data)
    } catch (error) {
      console.error('Error fetching universities:', error)
    }
  }

  const fetchSmallGroups = async (universityId: number) => {
    try {
      const response = await fetch(`/api/small-groups?universityId=${universityId}`)
      const data = await response.json()
      setSmallGroups(data)
    } catch (error) {
      console.error('Error fetching small groups:', error)
    }
  }

  const fetchAlumniGroups = async (regionId: number) => {
    try {
      const response = await fetch(`/api/alumni-small-groups?regionId=${regionId}`)
      const data = await response.json()
      setAlumniGroups(data)
    } catch (error) {
      console.error('Error fetching alumni groups:', error)
    }
  }

  const handleRegionChange = (value: string) => {
    setSelectedRegion(value)
    setSelectedUniversity("")
    setSelectedSmallGroup("")
    setSelectedAlumniGroup("")
  }

  const handleUniversityChange = (value: string) => {
    setSelectedUniversity(value)
    setSelectedSmallGroup("")
  }

  const handleSmallGroupChange = (value: string) => {
    setSelectedSmallGroup(value)
  }

  const handleAlumniGroupChange = (value: string) => {
    setSelectedAlumniGroup(value)
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">Super Admin Scope Selection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="region" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Filter by Region
            </Label>
            <Select value={selectedRegion} onValueChange={handleRegionChange}>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="university" className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Filter by University
            </Label>
            <Select 
              value={selectedUniversity} 
              onValueChange={handleUniversityChange}
              disabled={!selectedRegion}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={selectedRegion ? "Select university" : "Select region first"} />
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

          <div className="space-y-2">
            <Label htmlFor="smallGroup" className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Filter by Small Group
            </Label>
            <Select 
              value={selectedSmallGroup} 
              onValueChange={handleSmallGroupChange}
              disabled={!selectedUniversity}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={selectedUniversity ? "Select small group" : "Select university first"} />
              </SelectTrigger>
              <SelectContent>
                {smallGroups.map((smallGroup) => (
                  <SelectItem key={smallGroup.id} value={smallGroup.id.toString()}>
                    {smallGroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alumniGroup" className="text-sm font-medium flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Filter by Alumni Group
            </Label>
            <Select 
              value={selectedAlumniGroup} 
              onValueChange={handleAlumniGroupChange}
              disabled={!selectedRegion}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={selectedRegion ? "Select alumni group" : "Select region first"} />
              </SelectTrigger>
              <SelectContent>
                {alumniGroups.map((alumniGroup) => (
                  <SelectItem key={alumniGroup.id} value={alumniGroup.id.toString()}>
                    {alumniGroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
