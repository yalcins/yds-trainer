'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Ana Sayfa', icon: '🏠' },
  { href: '/quiz', label: 'Quiz', icon: '⚡' },
  { href: '/chat', label: 'AI', icon: '🤖' },
  { href: '/patterns', label: 'Kalıplar', icon: '📚' },
  { href: '/admin', label: 'Ekle', icon: '➕' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(t => {
          const active = path === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
