'use client'
import { useDrawer } from '@/contexts/DrawerContext';
import RightDrawer from './RightDrawer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, content, title, closeDrawer } = useDrawer();

  return (
    <div className="relative min-h-screen bg-base-100">
      <div className="flex h-screen">
        <main className={`flex flex-col flex-1 transition-all duration-300 ${isOpen ? 'w-2/3' : 'w-full'}`}>
          {children}
        </main>
          <RightDrawer 
            open={isOpen} 
            onClose={closeDrawer}
            title={title}
          >
            {content}
          </RightDrawer>
      </div>
    </div>
  );
}