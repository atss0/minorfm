'use client'

import { QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'sonner'

// Global TanStack Query default: 1 minute stale time, 1 retry on failure.
// Individual hooks override these where tighter freshness is required.
const QUERY_STALE_MS = 60_000

export default function Providers({
  children,
  dehydratedState,
}: {
  children: React.ReactNode
  dehydratedState?: DehydratedState
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: QUERY_STALE_MS, retry: 1 },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
      <Toaster theme="dark" position="bottom-right" richColors />
    </QueryClientProvider>
  )
}
