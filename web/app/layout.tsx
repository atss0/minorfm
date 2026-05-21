import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'MINOR.fm',
  description: 'MINOR.fm — Müzik, kültür ve sohbet',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans bg-bg text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
