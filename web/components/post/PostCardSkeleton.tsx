export default function PostCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 bg-border rounded" />
          <div className="h-3 w-12 bg-border rounded" />
          <div className="flex-1" />
          <div className="h-3 w-24 bg-border rounded" />
        </div>
        <div className="h-5 w-3/4 bg-border rounded" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-border rounded" />
          <div className="h-3 w-5/6 bg-border rounded" />
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-3 border-t border-border/50">
        <div className="h-3 w-12 bg-border rounded" />
        <div className="h-3 w-12 bg-border rounded" />
        <div className="h-3 w-6 bg-border rounded" />
      </div>
    </div>
  )
}
