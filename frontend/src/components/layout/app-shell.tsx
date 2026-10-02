import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { useDocuments } from '@/hooks/use-documents'
import { ProfileDropdown } from '@/components/profile/profile-dropdown'

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { data: documents = [] } = useDocuments()
  const location = useLocation()

  const readyDocsCount = documents.filter((d) => d.status === 'ready').length

  // Breadcrumbs determination
  let section = 'Workspace'
  let pageTitle = 'Dashboard'
  if (location.pathname.startsWith('/documents')) {
    section = 'Vector Store'
    pageTitle = location.pathname.includes('/documents/') ? 'Document Detail' : 'Document Pipelines'
  } else if (location.pathname.startsWith('/chat')) {
    section = 'Sessions'
    pageTitle = 'Ask & Trace'
  } else if (location.pathname.startsWith('/conversations')) {
    section = 'Sessions'
    pageTitle = 'History'
  } else if (location.pathname.startsWith('/settings')) {
    section = 'Configuration'
    pageTitle = 'Settings'
  } else if (location.pathname === '/dashboard') {
    section = 'Analytics'
    pageTitle = 'Vector Chunks & Health'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface bg-grid-pattern text-on-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-3 focus:ring-ring/50"
      >
        Skip to content
      </a>

      {/* Desktop Sidebar (Fixed 260px) */}
      <aside className="hidden w-[260px] shrink-0 md:block">
        <AppSidebar />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[260px] p-0 bg-surface-container-lowest border-r border-outline-variant/30" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Primary navigation for Trace</SheetDescription>
          <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Right Canvas */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Stitch Global Header Bar */}
        <header className="sticky top-0 z-40 h-14 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20 flex items-center justify-between px-gutter md:px-gutter-lg shrink-0">
          <div className="flex items-center gap-space-sm md:gap-space-md min-w-0">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden text-on-surface-variant hover:text-on-surface p-1"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>

            {/* Breadcrumb Bar */}
            <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant truncate">
              <span className="text-on-surface-variant/60">TRACE</span>
              <span className="text-outline-variant">/</span>
              <span className="text-on-surface-variant/60 hidden sm:inline">{section}</span>
              <span className="text-outline-variant hidden sm:inline">/</span>
              <span className="text-on-surface font-body-sm font-medium truncate">{pageTitle}</span>
            </div>

            <div className="h-3.5 w-px bg-outline-variant/30 hidden lg:block"></div>

            {/* Scope Filter Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px] text-secondary">filter_alt</span>
              <span className="font-label-sm text-label-sm">Scope: All {readyDocsCount} Indexed Docs</span>
            </div>
          </div>

          {/* Right Status & Avatar */}
          <div className="flex items-center gap-space-sm md:gap-space-md shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 border border-primary/30 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
              <span className="font-label-sm text-label-sm font-semibold hidden sm:inline">Grounded Mode: Strict</span>
              <span className="font-label-sm text-label-sm font-semibold sm:hidden">Strict</span>
            </div>

            <div className="h-3.5 w-px bg-outline-variant/30"></div>

            <ProfileDropdown />
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main id="main-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-surface bg-grid-pattern">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
