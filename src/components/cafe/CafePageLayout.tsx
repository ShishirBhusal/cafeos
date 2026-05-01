import { ReactNode } from 'react';

interface CafePageLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Full width without max-width constraint */
  fullWidth?: boolean;
}

/**
 * Consistent wrapper for all sidebar-based cafe pages.
 * Provides title, description, action buttons, and consistent spacing.
 */
export default function CafePageLayout({
  title,
  description,
  actions,
  children,
  fullWidth = false,
}: CafePageLayoutProps) {
  return (
    <div className={`min-h-screen ${fullWidth ? '' : 'max-w-6xl mx-auto'}`}>
      {/* Page Header */}
      <div className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200/50">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-stone-900 truncate">{title}</h1>
            {description && (
              <p className="text-sm text-stone-500 mt-0.5">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div className="px-6 py-6">
        {children}
      </div>
    </div>
  );
}
