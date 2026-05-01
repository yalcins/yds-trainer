'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { loadData } from '@/lib/data'
import type { Pattern } from '@/lib/types'

const CAT_COLORS: Record<string, { border: string; badge: string; bg: string }> = {
  VOCAB:       { border: 'border-violet-300', badge: 'bg-violet-100 text-violet-700', bg: 'bg-violet-50' },
  GRAMMAR:     { border: 'border-blue-300',   badge: 'bg-blue-100 text-blue-700',     bg: 'bg-blue-50' },
  PREPOSITION: { border: 'border-amber-300',  badge: 'bg-amber-100 text-amber-700',   bg: 'bg-amber-50' },
  LINKER:      { border: 'border-[#58CC02]',  badge: 'bg-[#D7FFB8] text-[#46A302]',  bg: 'bg-[#F0FFF0]' },
  PHRASAL:     { border: 'border-rose-300',   badge: 'bg-rose-100 text-rose-600',     bg: 'bg-rose-50' },
}

const CATS = ['Tümü', 'VOCAB', 'GRAMMAR', 'PREPOSITION', 'LINKER', 'PHRASAL']

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [filter, setFilter]   = useState('Tümü')
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const [search, setSearch]   = useState('')

  useEffect(() => {
    loadData().then(d => setPatterns(d.patterns))
  }, [])

  const visible = patterns.filter(p => {
    if (filter !== 'Tümü' && p.category !== filter) return false
    if (search && !p.pattern.toLowerCase().includes(search.toLowerCase()) && !p.meaning_tr.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleFlip = (i: number) =>
    setFlipped(f => { const n = new Set(f); n.has(i) ? n.delete(i) : n.add(i); return n })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black text-[#3C3C3C]">Kalıplar</h1>
        <span className="text-xs font-black text-[#AFAFAF] bg-white rounded-full px-3 py-1 border border-[#E5E5E5]">
          {visible.length} kalıp
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AFAFAF]">🔍</span>
        <input
          type="search"
          placeholder="Kalıp ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-[#E5E5E5] bg-white text-sm font-semibold focus:outline-none focus:border-[#58CC02] transition-colors"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATS.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-black border-2 transition-all ${
              filter === c
                ? 'bg-[#58CC02] text-white border-[#58CC02]'
                : 'bg-white text-[#AFAFAF] border-[#E5E5E5]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-xs font-bold text-[#AFAFAF] text-center">Karta dokun → örneği gör 👆</p>

      {/* Flashcards */}
      <div className="space-y-3 pb-2">
        {visible.map((p, i) => {
          const isFlipped = flipped.has(i)
          const c = CAT_COLORS[p.category] ?? { border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', bg: 'bg-gray-50' }
          return (
            <div key={i} className="flip-card" style={{ minHeight: isFlipped ? 'auto' : 100 }}>
              <button
                onClick={() => toggleFlip(i)}
                className={`card w-full text-left p-4 border-l-4 ${c.border} transition-all active:scale-[0.98] space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${c.badge}`}>
                    {p.category}
                  </span>
                  <span className={`text-lg transition-transform duration-300 ${isFlipped ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
                <p className="font-black text-[#3C3C3C] text-base">{p.pattern}</p>
                <p className="font-bold text-[#58CC02] text-sm">{p.meaning_tr}</p>

                {isFlipped && (
                  <div className={`mt-1 pt-3 border-t border-[#F0F0F0] space-y-1.5 rounded-xl p-3 -mx-1 ${c.bg} animate-slide-up`}>
                    <p className="text-sm font-semibold italic text-[#3C3C3C]/80">{p.example_en}</p>
                    <p className="text-sm text-[#AFAFAF] font-semibold">{p.example_tr}</p>
                    <Link
                      href={`/memory-card?word=${encodeURIComponent(p.pattern)}&meaning=${encodeURIComponent(p.meaning_tr)}`}
                      onClick={e => e.stopPropagation()}
                      className="inline-block mt-2 text-xs font-black bg-violet-500 text-white px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                    >
                      🧠 Hafıza Kartı
                    </Link>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-14">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[#AFAFAF] font-bold">Kalıp bulunamadı</p>
        </div>
      )}
    </div>
  )
}
