"use client"

import AppShell from '@/components/AppShell'
import { DrawerProvider } from '@/contexts/DrawerContext'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <DrawerProvider>
            <AppShell>{children}</AppShell>
        </DrawerProvider>
    )
}
