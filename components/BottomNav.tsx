'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',         label: 'Pano',    icon: '🏠' },
  { href: '/practice', label: 'Antren',  icon: '⚡' },
  { href: '/lab',      label: 'Lab',     icon: '🔬' },
  { href: '/wordlab',  label: 'Kelime',  icon: '🔤' },
  { href: '/progress', label: 'İlerleme',icon: '📈' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#E5E5E5] z-50 safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(t => {
          const active = path === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[11px] font-black uppercase tracking-wide transition-colors ${
                active ? 'text-[#58CC02]' : 'text-[#AFAFAF]'
              }`}
            >
              <span className={`text-xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>
                {t.icon}
              </span>
              {active && (
                <span className="w-5 h-1 bg-[#58CC02] rounded-full mt-0.5" />
              )}
              {!active && <span>{t.label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
