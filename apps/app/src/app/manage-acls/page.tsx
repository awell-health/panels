'use client'

import { ACLManager } from '@/components/ACLManager'
import PageNavigation from '../../components/PageNavigation'
import { useAuthentication } from '@/hooks/use-authentication'

export default function ManageACLsPage() {
  const { isAdmin } = useAuthentication()

  return (
    <PageNavigation
      title="Manage ACLs"
      description="Manage ACLs"
      breadcrumb={[{ label: 'Manage ACLs' }]}
    >
      {isAdmin && <ACLManager />}
      {!isAdmin && (
        <div className="flex items-center justify-center gap-2 text-gray-500 py-8">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Lock icon</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>You are not authorized to access this page</span>
        </div>
      )}
    </PageNavigation>
  )
}
