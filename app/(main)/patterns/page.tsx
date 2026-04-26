'use client'
import { useEffect, useState } from 'react'
import { loadData } from '@/lib/data'
import type { Pattern } from '@/lib/types'

const CAT_COLOR: Record<string, string> = {
  VOCAB: 'bg-violet-100 text-violet-700 border-violet-200',
  GRAMMAR: 'bg-blue-100 text-blue-700 border-blue-200',
  PREPOSITION: 'bg-amber-100 text-amber-700 border-amber-200',
  LINKER: 'bg-green-100 text-green-700 border-green-200',
  PHRASAL: 'bg-rose-100 text-rose-700 border-rose-200',
}

const CATS = ['Tümü', 'VOCAB', 'GRAMMAR', 'PREPOSITION', 'LINKER', 'PHRASAL']

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [filter, setFilter] = useState('Tümü')
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')

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
      <h1 className="text-2xl font-bold text-gray-900">Kalıplar</h1>

      {/* Search */}
      <input
        type="search"
        placeholder="Kalıp ara..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATS.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              filter === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">Karta dokun → örnek göster</p>

      {/* Cards */}
      <div className="space-y-3">
        {visible.map((p, i) => {
          const isFlipped = flipped.has(i)
          return (
            <button
              key={i}
              onClick={() => toggleFlip(i)}
              className={`card w-full text-left p-4 space-y-2 border-l-4 transition-all active:scale-98 ${CAT_COLOR[p.category] ?? 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CAT_COLOR[p.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {p.category}
                </span>
                <span className="text-gray-400 text-xs">{isFlipped ? '▲' : '▼'}</span>
              </div>
              <p className="font-bold text-gray-900 text-base">{p.pattern}</p>
              <p className="text-indigo-700 font-medium text-sm">{p.meaning_tr}</p>
              {isFlipped && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <p className="text-sm italic text-gray-700">{p.example_en}</p>
                  <p className="text-sm text-gray-500">{p.example_tr}</p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-10 text-gray-400">Kalıp bulunamadı</div>
      )}
    </div>
  )
}
