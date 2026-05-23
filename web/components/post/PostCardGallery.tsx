import Link from 'next/link'
import Image from 'next/image'
import { Images } from 'lucide-react'
import type { Post } from '@/types'

interface GalleryMeta {
  images?: string[]
}

export default function PostCardGallery({ post }: { post: Post }) {
  const meta = post.metadata as unknown as GalleryMeta
  const images = meta?.images ?? []

  return (
    <Link href={`/post/${post.id}`} className="block group">
      <h2 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-snug mb-3">
        {post.title}
      </h2>

      {images.length > 0 ? (
        <div
          className={`grid gap-1 rounded-lg overflow-hidden ${
            images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {images.slice(0, 4).map((src, i) => {
            const isSingle = images.length === 1

            let layoutClass = ''
            if (images.length === 2) layoutClass = 'aspect-[4/3]'
            else if (images.length === 3) layoutClass = i === 0 ? 'col-span-2 aspect-[21/9]' : 'aspect-video'
            else if (images.length >= 4) layoutClass = 'aspect-video'

            return (
              <div
                key={i}
                className={
                  isSingle
                    // TEKLİ FOTOĞRAF KAPSAYICISI: 
                    // Kesinlikle flex center yapıyoruz ve bg-surface veriyoruz.
                    // max-h-[600px] ile tüm postun boyunu sınırlıyoruz.
                    ? 'w-full flex justify-center items-center bg-surface overflow-hidden rounded-lg border border-border max-h-[600px]'
                    : `relative bg-border overflow-hidden ${layoutClass}`
                }
              >
                {isSingle ? (
                  /* SİHİRLİ DOKUNUŞ: Sığdırma Mantığı */
                  <Image
                    src={src}
                    alt={`${post.title}`}
                    width={1200} 
                    height={1200}
                    // DÜZELTME: object-cover (keser) yerine object-contain (sığdırır) yaptık.
                    // w-auto h-auto, h-full, max-h-[600px] kombinasyonu dikey fotoğrafları 
                    // 600px'de sınırlar ve object-contain ile tamamını gösterir.
                    // Kalan sağ-sol boşluklar div'in bg-surface rengiyle feed'e karışır.
                    className="w-auto h-auto h-full max-h-[600px] object-contain group-hover:opacity-90 transition-opacity rounded-lg"
                  />
                ) : (
                  /* ÇOKLU FOTOĞRAF MANTIĞI: Grid'i doldurmak için fill ve object-cover */
                  <Image
                    src={src}
                    alt={`${post.title} — ${i + 1}`}
                    fill
                    className="object-cover group-hover:opacity-90 transition-opacity rounded-lg"
                  />
                )}

                {i === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">+{images.length - 4}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="aspect-video bg-border rounded-lg flex items-center justify-center">
          <Images size={32} className="text-muted" />
        </div>
      )}

      {images.length > 0 && (
        <p className="mt-2 text-xs text-muted flex items-center gap-1">
          <Images size={12} />
          {images.length} fotoğraf
        </p>
      )}
    </Link>
  )
}