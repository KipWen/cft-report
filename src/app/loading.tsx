export default function Loading() {
  return (
    <div className="flex h-screen bg-bg-primary">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block w-[220px] shrink-0 bg-bg-white border-r border-border-light">
        <div className="px-4 pt-5 pb-4">
          <div className="h-5 w-28 bg-bg-secondary rounded animate-pulse" />
        </div>
        <nav className="px-2.5 pb-4 space-y-1">
          <div className="px-2 pb-2 h-3 w-14 bg-bg-secondary rounded animate-pulse" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-full bg-bg-secondary rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </nav>
      </aside>

      {/* Main skeleton */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-bg-primary/95 border-b border-border-light px-5 py-2.5">
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-16 bg-bg-secondary rounded-md animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-1 mb-3">
            <div className="h-6 w-14 bg-bg-secondary rounded animate-pulse" />
            <div className="h-6 w-14 bg-bg-secondary rounded animate-pulse" />
          </div>
          <div className="h-64 w-full bg-bg-secondary rounded animate-pulse" />
          <div className="h-64 w-full bg-bg-secondary rounded animate-pulse" />
        </div>
      </main>
    </div>
  );
}
