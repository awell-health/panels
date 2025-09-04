export interface OrganizationMember {
  member_id: string
  name: string | null
  email_address: string
}

export const organizationAPI = {
  getMembers: async (): Promise<{ members: OrganizationMember[] }> => {
    const { apiConfig } = await import('./config/apiConfig')
    const defaultOptions = await apiConfig.getDefaultOptionsNoBody()

    const response = await fetch(
      await apiConfig.buildUrl('/organization/members'),
      {
        method: 'GET',
        ...defaultOptions,
      },
    )

    if (!response.ok) {
      throw new Error('Failed to fetch organization members')
    }

    return response.json()
  },
}
