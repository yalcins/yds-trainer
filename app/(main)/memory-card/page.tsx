'use client'
import { useCallback, useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { MemoryCard } from '@/lib/types'

function MemoryCardContent() {
  const params = useSearchParams()
  const word = params.get('word') ?? ''
  const meaning = params.get('meaning') ?? ''

  const [card, setCard] = useState<MemoryCard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = useCallback(async (w: string, m: string) => {
    setLoading(true)
    setError('')
    setCard(null)
    try {
      const res = await fetch('/api/memory-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: w, meaning_tr: m }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`${data.error ?? 'Bilinmeyen hata'} (HTTP ${res.status})`)
      setCard(data.card)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!word) return
    generate(word, meaning)
  }, [word, meaning, generate])

  if (!word) {
    return (
      <div className="text-center py-14">
        <div className="text-4xl mb-3">🃏</div>
        <p className="text-[#AFAFAF] font-bold">Kelime belirtilmedi</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C]">Hafıza Kartı</h1>
          <p className="text-sm text-[#AFAFAF] font-semibold">{word}</p>
        </div>
        <button
          onClick={() => generate(word, meaning)}
          disabled={loading}
          className="btn-duo text-sm px-4 py-2 disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'} Yenile
        </button>
      </div>

      {loading && (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3 animate-bounce">🧠</div>
          <p className="text-[#AFAFAF] font-bold">Kart oluşturuluyor...</p>
        </div>
      )}

      {error && (
        <div className="card p-4 border-l-4 border-rose-400">
          <p className="text-rose-500 font-bold text-sm">Hata: {error}</p>
        </div>
      )}

      {card && (
        <div className="space-y-3">
          {/* Word + Meaning */}
          <div className="card p-5 border-l-4 border-violet-400 space-y-1">
            <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Kelime</p>
            <p className="text-xl font-black text-[#3C3C3C]">{card.word}</p>
            <p className="text-base font-bold text-violet-500">{card.meaning_tr}</p>
          </div>

          {/* Memory Trick */}
          <div className="card p-5 border-l-4 border-amber-400 space-y-2">
            <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">💡 Bellek İpucu</p>
            <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{card.memory_trick}</p>
          </div>

          {/* Mini Story */}
          <div className="card p-5 border-l-4 border-[#58CC02] space-y-2">
            <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">📖 Mini Hikaye</p>
            <p className="text-sm font-semibold italic text-[#3C3C3C]/80 leading-relaxed">{card.mini_story}</p>
          </div>

          {/* Example Sentence */}
          <div className="card p-5 border-l-4 border-[#1CB0F6] space-y-2">
            <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">📝 Örnek Cümle</p>
            <p className="text-sm font-semibold italic text-[#3C3C3C] leading-relaxed">{card.example_sentence}</p>
          </div>

          {/* Trap Words */}
          {card.trap_words?.length > 0 && (
            <div className="card p-5 border-l-4 border-rose-400 space-y-2">
              <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">⚠️ Karışan Kelimeler</p>
              <div className="flex flex-wrap gap-2">
                {card.trap_words.map((w, i) => (
                  <span key={i} className="bg-rose-100 text-rose-600 text-xs font-black px-3 py-1 rounded-full">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MemoryCardPage() {
  return (
    <Suspense fallback={
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3 animate-bounce">🧠</div>
        <p className="text-[#AFAFAF] font-bold">Yükleniyor...</p>
      </div>
    }>
      <MemoryCardContent />
    </Suspense>
  )
}
