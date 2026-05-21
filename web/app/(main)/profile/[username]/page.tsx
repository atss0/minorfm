import type { Metadata } from 'next'
import ProfileView from '@/components/profile/ProfileView'

interface Props {
  params: Promise<{ username: string }>
}

async function fetchProfile(username: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'
    const res = await fetch(`${apiUrl}/api/users/${username}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await fetchProfile(username)
  if (!profile) return { title: `@${username} — MINOR.fm` }
  return {
    title: `@${profile.username} — MINOR.fm`,
    description: profile.bio || `@${profile.username} kullanıcısının MINOR.fm profili`,
  }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  return <ProfileView username={username} />
}
