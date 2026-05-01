'use client';

import { usePathname } from 'next/navigation';
import CafeSidebar from './CafeSidebar';

interface CafeLayoutShellProps {
  children: React.ReactNode;
  cafeId: string;
  cafeName: string;
  cafeSlug?: string;
}

/** Full-screen routes where sidebar is hidden */
const FULLSCREEN_ROUTES = ['/cafe/counter', '/cafe/kitchen'];

export default function CafeLayoutShell({
  children,
  cafeId,
  cafeName,
  cafeSlug,
}: CafeLayoutShellProps) {
  const pathname = usePathname();
  const isFullScreen = FULLSCREEN_ROUTES.some(r => pathname?.startsWith(r));

  if (isFullScreen) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      <CafeSidebar cafeId={cafeId} cafeName={cafeName} cafeSlug={cafeSlug} />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
