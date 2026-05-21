import { Suspense } from 'react'
import type { Metadata } from 'next'
import FeedView from '@/components/feed/FeedView'
import CategoryHeader from '@/components/category/CategoryHeader'
import CuratedCollectionView from '@/components/collection/CuratedCollectionView'

interface Props {
  params: Promise<{ slug: string }>
}

async function fetchCategory(slug: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/categories/${slug}`, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = await fetchCategory(slug)
  if (!category) return { title: `${slug} — MINOR.fm` }
  return {
    title: `${category.icon ?? ''} ${category.name} — MINOR.fm`.trim(),
    description: category.description || `MINOR.fm ${category.name} kategorisi`,
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const category = await fetchCategory(slug)

  return (
    <div>
      <CategoryHeader category={category} slug={slug} />
      <div className="p-4">
        {slug === 'koleksiyon' ? (
          <Suspense>
            <CuratedCollectionView />
          </Suspense>
        ) : (
          <Suspense>
            <FeedView categorySlug={slug} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
