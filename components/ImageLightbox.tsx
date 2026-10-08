'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  src: string
  fallbackSrc?: string // used if the large image doesn't exist
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, fallbackSrc, alt, onClose }: Props) {
  const [current, setCurrent] = useState(src)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 cursor-zoom-out"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={22} />
      </button>
      <figure className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <img
          src={current}
          alt={alt}
          onError={() => fallbackSrc && current !== fallbackSrc && setCurrent(fallbackSrc)}
          className="max-h-[75vh] max-w-[90vw] min-h-48 object-contain rounded-xl bg-white p-4 shadow-2xl"
        />
        <figcaption className="text-sm text-gray-300 text-center">{alt}</figcaption>
      </figure>
    </div>
  )
}
