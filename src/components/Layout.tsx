import { NavLink, Outlet } from 'react-router-dom'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  [
    'px-4 sm:px-6 py-3 font-mono text-[11px] tracking-[0.12em] uppercase transition-all border-b-2 -mb-px rounded-t-md',
    isActive
      ? 'text-gs-accent border-gs-accent bg-white/[0.06] shadow-[0_-4px_24px_-6px_rgba(232,255,71,0.15)]'
      : 'text-gs-muted border-transparent hover:text-gs-text hover:bg-white/[0.03]',
  ].join(' ')

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 gs-glass-header-bar">
        <div className="gs-container pt-8 sm:pt-10 pb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gs-muted mb-1">
            Daily command center
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gs-text">
            Grad <span className="text-gs-accent">Sprint</span>
          </h1>
        </div>
        <div className="border-b border-white/[0.08]">
          <div className="gs-container flex flex-wrap gap-0">
            <NavLink to="/" end className={tabClass}>
              Today
            </NavLink>
            <NavLink to="/week" className={tabClass}>
              Week
            </NavLink>
            <NavLink to="/settings" className={tabClass}>
              Settings
            </NavLink>
          </div>
        </div>
      </header>
      <main className="flex-1 gs-container py-8 sm:py-10 pb-16 sm:pb-20">
        <Outlet />
      </main>
    </div>
  )
}
