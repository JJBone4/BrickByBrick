'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/collection', label: 'Collection' },
  { href: '/investments', label: 'Investments' },
  { href: '/wishlist', label: 'Wish List' },
]

export default function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 ml-4">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active
                ? 'bg-yellow-400 text-gray-900'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
