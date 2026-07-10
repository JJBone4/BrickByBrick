import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import NavTabs from '@/components/NavTabs'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'BrickByBrick',
  description: 'Lego minifigure and set investment tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧱</span>
            <span className="text-xl font-bold tracking-tight text-white">BrickByBrick</span>
          </div>
          <NavTabs />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
