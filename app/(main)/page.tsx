'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProgress } from '@/lib/store'
import { loadData } from '@/lib/data'
import type { UserProgress, YDSData } from '@/lib/types'

const CAT_COLOR: Record<string, string> = {
  VOCAB: 'bg-violet-100 text-violet-700',
  GRAMMAR: 'bg-blue-100 text-blue-700',
  PREPOSITION: 'bg-amber-100 text-amber-700',
  LINKER: 'bg-green-100 text-green-700',
  PHRASAL: 'bg-rose-100 text-rose-700',
}

export default function Home() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [data, setData] = useState<YDSData | null>(null)

  useEffect(() => {
    setProgress(getProgress())
    loadData().then(setData)
  }, [])

  const catStats = () => {
    if (!data || !progress) return []
    const map: Record<string, { correct: number; total: number }> = {}
    data.questions.forEach(q => {
      const s = progress.questionStats[q.id]
      if (!map[q.category]) map[q.category] = { correct: 0, total: 0 }
      if (s) {
        map[q.category].correct += s.correct
        map[q.category].total += s.seen
      }
    })
    return Object.entries(map).map(([cat, v]) => ({
      cat,
      pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : null,
    }))
  }

  const totalSeen = progress
    ? Object.values(progress.questionStats).reduce((a, s) => a + s.seen, 0)
    : 0
  const totalCorrect = progress
    ? Object.values(progress.questionStats).reduce((a, s) => a + s.correct, 0)
    : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">YDS Trainer</h1>
          <p className="text-sm text-gray-500">Günlük pratik yap, kalıpları öğren</p>
        </div>
        <div className="flex flex-col items-center bg-amber-50 rounded-2xl px-3 py-2">
          <span className="text-2xl">🔥</span>
          <span className="text-sm font-bold text-amber-600">{progress?.streak ?? 0} gün</span>
        </div>
      </div>

      {/* XP + rounds */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'XP', value: progress?.xp ?? 0, icon: '⭐' },
          { label: 'Tur', value: progress?.completedRounds ?? 0, icon: '🎯' },
          {
            label: 'Doğruluk',
            value: totalSeen > 0 ? `${Math.round((totalCorrect / totalSeen) * 100)}%` : '—',
            icon: '✅',
          },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <div className="text-xl">{s.icon}</div>
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Start Quiz CTA */}
      <Link
        href="/quiz"
        className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-semibold text-lg py-4 rounded-2xl shadow-lg shadow-indigo-200"
      >
        ⚡ Quiz Başlat
      </Link>

      {/* Category breakdown */}
      {data && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Kategori Durumu</h2>
          {catStats().map(({ cat, pct }) => (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </span>
                <span className="text-xs text-gray-500">{pct !== null ? `${pct}%` : 'Başlanmadı'}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <Link href="/patterns" className="card p-4 flex items-center gap-3 active:scale-95 transition-transform">
          <span className="text-2xl">📚</span>
          <div>
            <div className="font-semibold text-sm">Kalıplar</div>
            <div className="text-xs text-gray-500">{data?.patterns.length ?? 0} kalıp</div>
          </div>
        </Link>
        <Link href="/stats" className="card p-4 flex items-center gap-3 active:scale-95 transition-transform">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-semibold text-sm">İstatistik</div>
            <div className="text-xs text-gray-500">{totalSeen} cevap</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
