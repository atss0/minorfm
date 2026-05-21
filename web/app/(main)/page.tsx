import { Suspense } from 'react'
import FeedView from '@/components/feed/FeedView'

export default function HomePage() {
  return (
    <div className="p-4">
      <Suspense>
        <FeedView showBanner />
      </Suspense>
    </div>
  )
}
