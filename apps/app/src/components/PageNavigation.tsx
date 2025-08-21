'use client'

import { useAuthentication } from '@/hooks/use-authentication'
import { Menu, LayoutGrid, Settings, X, Users } from 'lucide-react'
import Link from 'next/link'

interface PageNavigationProps {
  children: React.ReactNode
  title?: string
  description?: string
  breadcrumb?: {
    label: string
    path?: string
  }[]
}

function PageNavigation(props: PageNavigationProps) {
  const { children, title, description, breadcrumb } = props
  const { isAdmin } = useAuthentication()

  const navigationItems = [
    {
      id: 'panels' as const,
      label: 'Panels',
      icon: LayoutGrid,
      path: '/',
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      path: '/settings',
    },
    ...(isAdmin
      ? [
          {
            id: 'acl-test' as const,
            label: 'Manage ACLs',
            icon: Users,
            path: '/manage-acls',
          },
        ]
      : []),
  ]

  return (
    <div className="drawer">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        <div className="navbar bg-base-100 shadow-sm">
          <div className="flex gap-2 items-center">
            <label htmlFor="my-drawer" className="btn btn-ghost drawer-button">
              <Menu className="h-5 w-5" />
            </label>
            <div className="flex-1">Panels</div>
          </div>
        </div>
        <div className="breadcrumbs text-xs px-6 py-2 bg-slate-50 border-y border-slate-200">
          <ul>
            <li>
              <Link href="/">Home</Link>
            </li>
            {breadcrumb?.map((item) => (
              <li key={item.label}>
                {item.path ? (
                  <Link href={item.path}>{item.label}</Link>
                ) : (
                  <span className="font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 max-w-7xl mx-auto">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-medium text-gray-900 mb-2">
                {title}
              </h1>
              <p className="text-gray-400 text-sm">{description}</p>
            </div>
          )}
          <div>{children}</div>
        </div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor="my-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        />
        <div className="menu bg-base-200 text-base-content min-h-full w-80 space-y-4">
          <div className="flex items-center justify-between gap-2 text-base font-medium border-b border-gray-200 p-4">
            Navigation
            <label
              htmlFor="my-drawer"
              className="btn btn-sm btn-ghost drawer-button -mr-4"
            >
              <X className="h-4 w-4" />
            </label>
          </div>
          <ul>
            {navigationItems.map((item) => (
              <li key={item.id} className="py-1">
                <Link href={item.path}>
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PageNavigation
