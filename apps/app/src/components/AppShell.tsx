'use client'
import { useDrawer } from '@/contexts/DrawerContext';
import RightDrawer from './RightDrawer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isOpen, content, title, closeDrawer } = useDrawer();

  return (
    <div className={`app-shell ${isOpen ? 'drawer-open' : ''}`}>
      {children}
      <RightDrawer
        open={isOpen}
        onClose={closeDrawer}
        title={title}
      >
        {content}
      </RightDrawer>
    </div>
  );
}