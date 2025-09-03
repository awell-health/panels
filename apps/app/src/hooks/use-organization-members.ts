import { useState, useEffect, useCallback } from 'react'
import { organizationAPI, type OrganizationMember } from '@/api/organizationAPI'

export function useOrganizationMembers() {
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await organizationAPI.getMembers()
      setMembers(data.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  return {
    members,
    isLoading,
    error,
    refetch: fetchMembers,
  }
}
