'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getAdaptiveStore, getReviewQueue } from '@/lib/adaptive-store'
import { getWordLabStore, getWordReviewQueue, getMasteryStats } from '@/lib/patterns-engine'
import type { PatternItem } from '@/lib/patterns-engine'

interface LabModule {
  href: string
  icon: string
  title: string
  sub: string
  badge?: string
  badgeColor?: string
  priority?: boolean
}

export default function LabPage() {
  const [patterns, setPatterns] = useState<PatternItem[]>([])
  const [mounted, setMounted]   = useState(false)

  useEffect(() => {
    fetch('/yds_patterns_db.json').then(r => r.json()).then(setPatterns)
    setMounted(true)
  }, [])

  const store   = mounted ? getAdaptiveStore() : null
  const wlStore = mounted ? getWordLabStore() : null
  const reviewQ = store ? getReviewQueue(store).length : 0
  const wordRevQ = (mounted && patterns.length) ? getWordReviewQueue(patterns).length : 0
  const wlStats  = (mounted && patterns.length) ? getMasteryStats(patterns) : null

  const MODULES: LabModule[] = [
    {
      href: '/practice',     icon: '⚡', title: 'Günlük Antrenman',
      sub: '15 adaptif soru · confidence tracking',
      priority: true,
    },
    {
      href: '/sentence-trainer', icon: '🧩', title: 'Cümle Tamamlama',
      sub: 'En zayıf bölüm · mantık haritası · zıtlık/neden-sonuç',
      badge: '%20 sınav', badgeColor: 'bg-red-100 text-[#FF4B4B]', priority: true,
    },
    {
      href: '/wordlab',      icon: '🔤', title: 'Kelime Lab',
      sub: `${patterns.length} kelime/kalıp · bellek hileleri · mini hikayeler`,
      badge: wlStats ? `${wlStats.mastered} ezber` : undefined,
      badgeColor: 'bg-[#D7FFB8] text-[#46A302]',
    },
    {
      href: '/review',       icon: '🔄', title: 'Tekrar Kuyruğu',
      sub: 'Spaced repetition · bugün çalışılacaklar',
      badge: (reviewQ + wordRevQ) > 0 ? `${reviewQ + wordRevQ} bekliyor` : '✓ Temiz',
      badgeColor: (reviewQ + wordRevQ) > 0 ? 'bg-red-100 text-[#FF4B4B]' : 'bg-[#D7FFB8] text-[#46A302]',
    },
    {
      href: '/mistakes',     icon: '❌', title: 'Hata Bankası',
      sub: 'Hata tipi analizi · Why Not? · tuzak açıklamaları',
      badge: store ? `${store.attempts.filter(a => !a.isCorrect).length} hata` : undefined,
      badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
      href: '/train',        icon: '🎯', title: 'Bölüm Antrenmanı',
      sub: 'İpuçları → pratik · en zayıftan en güçlüye',
    },
    {
      href: '/progress',     icon: '📈', title: 'İlerleme',
      sub: 'Seviye sistemi · 7 günlük chart · section karşılaştırma',
    },
    {
      href: '/patterns',     icon: '📚', title: 'Kalıplar',
      sub: 'Tüm YDS kalıpları · flip kartlar · kategori filtresi',
    },
    {
      href: '/chat',         icon: '🤖', title: 'AI Asistan',
      sub: 'YDS soruları sor · açıklama iste',
    },
  ]

  return (
    <div className="space-y-4 pb-4">
      <div className="pt-1">
        <h1 className="text-2xl font-black text-[#3C3C3C]">🔬 Çalışma Merkezi</h1>
        <p className="text-xs font-bold text-[#AFAFAF]">Tüm antrenman modülleri</p>
      </div>

      {/* Quick stats */}
      {mounted && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '🔄', val: reviewQ + wordRevQ, label: 'Tekrar',    color: reviewQ+wordRevQ > 0 ? 'text-[#FF4B4B]' : 'text-[#58CC02]' },
            { icon: '⭐', val: wlStats?.mastered ?? 0, label: 'Ezber', color: 'text-[#FFD900]' },
            { icon: '🔥', val: store?.streak ?? 0, label: 'Seri',      color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
              <div className="text-[10px] font-bold text-[#AFAFAF]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Modules */}
      <div className="space-y-2">
        {MODULES.map(m => (
          <Link
            key={m.href}
            href={m.href}
            className={`card p-4 flex items-center gap-4 border-b-4 active:translate-y-[2px] active:border-b-[1px] transition-all ${m.priority ? 'border-[#58CC02]' : 'border-[#E5E5E5]'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${m.priority ? 'bg-[#D7FFB8]' : 'bg-[#F8F8F8]'}`}>
              {m.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm text-[#3C3C3C]">{m.title}</span>
                {m.badge && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                )}
                {m.priority && (
                  <span className="text-[10px] font-black bg-[#D7FFB8] text-[#46A302] px-2 py-0.5 rounded-full">ÖNCELİKLİ</span>
                )}
              </div>
              <p className="text-xs font-semibold text-[#AFAFAF] mt-0.5 line-clamp-1">{m.sub}</p>
            </div>
            <span className="text-[#AFAFAF] shrink-0">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
