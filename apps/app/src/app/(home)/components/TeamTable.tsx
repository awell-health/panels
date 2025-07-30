import { Plus } from 'lucide-react'
import type React from 'react'

type User = {
  id: string
  name: string
  email: string
  role: string
  panels: string
}

type TeamTableProps = {
  users: User[]
}

const TeamTable: React.FC<TeamTableProps> = ({ users }) => {
  return (
    <div className="ml-12">
      <div className="flex justify-between items-center mb-4 max-w-3xl">
        <h2 className="text-base font-medium">Teams and users</h2>
        <button
          type="button"
          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add User
        </button>
      </div>
      <div className="border border-neutral-200 rounded-md overflow-hidden max-w-3xl">
        {users.map((user) => (
          <div
            key={user.id}
            className="p-4 border-b border-neutral-200 last:border-b-0"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="text-sm text-gray-600">{user.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TeamTable
