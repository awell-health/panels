import { MedplumProvider } from '@/contexts/medplum-context';
import { PanelStoreProvider } from '@/hooks/use-panel-store';
import { Inter } from "next/font/google";
import './globals.css';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: 'Worklist App',
  description: 'Multi provider worklist app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className={inter.className}>
        <MedplumProvider>
          <PanelStoreProvider>
            {children}
          </PanelStoreProvider>
        </MedplumProvider>
      </body>
    </html>
  )
}
