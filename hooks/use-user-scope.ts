"use client"

import React, { useState, useEffect } from 'react'

export interface UserScope {
  scope: 'superadmin' | 'national' | 'region' | 'university' | 'smallGroup' | 'graduateSmallGroup'
  regionId: number | null
  universityId: number | null
  smallGroupId: number | null
  graduateGroupId: number | null
  region: { id: number; name: string } | null
  university: { id: number; name: string } | null
  smallGroup: { id: number; name: string } | null
  graduateSmallGroup: { id: number; name: string } | null
}

export function useUserScope() {
  const [userScope, setUserScope] = useState<UserScope | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserScope = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/users/current-scope')

        if (!response.ok) {
          throw new Error('Failed to fetch user scope')
        }

        const data = await response.json()
        setUserScope(data.scope)
        setError(null)
      } catch (err) {
        console.error('Error fetching user scope:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUserScope()
  }, [])

  // Helper function to determine which organization fields should be visible
  const getVisibleFields = React.useCallback(() => {
    if (!userScope) return { region: false, university: false, smallGroup: false, graduateSmallGroup: false }

    switch (userScope.scope) {
      case 'superadmin':
      case 'national':
        return { region: true, university: true, smallGroup: true, graduateSmallGroup: true }

      case 'region':
        return { region: false, university: true, smallGroup: true, graduateSmallGroup: true }

      case 'university':
        return { region: false, university: false, smallGroup: true, graduateSmallGroup: true }

      case 'smallGroup':
        return { region: false, university: false, smallGroup: false, graduateSmallGroup: false }

      case 'graduateSmallGroup':
        return { region: false, university: false, smallGroup: false, graduateSmallGroup: false }

      default:
        return { region: false, university: false, smallGroup: false, graduateSmallGroup: false }
    }
  }, [userScope])

  // Helper function to get default values based on user scope
  const getDefaultValues = React.useCallback(() => {
    if (!userScope) return {}

    const defaults: any = {}

    // Set default values based on user scope
    if (userScope.regionId) defaults.regionId = userScope.regionId.toString()
    if (userScope.universityId) defaults.universityId = userScope.universityId.toString()
    if (userScope.smallGroupId) defaults.smallGroupId = userScope.smallGroupId.toString()
    if (userScope.graduateGroupId) defaults.graduateGroupId = userScope.graduateGroupId.toString()

    return defaults
  }, [userScope])

  return {
    userScope,
    loading,
    error,
    getVisibleFields,
    getDefaultValues
  }
}