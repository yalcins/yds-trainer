'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProgress } from '@/lib/store'
import { loadData } from '@/lib/data'
import type { UserProgress, YDSData } from '@/lib/types'

const CAT_COLOR: Record<string, { bar: string; badge: string }> = {
  VOCAB:       { bar: 'bg-violet-400', badge: 'bg-violet-100 text-violet-700' },
  GRAMMAR:     { bar: 'bg-[#1CB0F6]',  badge: 'bg-blue-100 text-blue-700' },
  PREPOSITION: { bar: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700' },
  LINKER:      { bar: 'bg-[#58CC02]',  badge: 'bg-[#D7FFB8] text-[#46A302]' },
  PHRASAL:     { bar: 'bg-rose-400',   badge: 'bg-rose-100 text-rose-600' },
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
      if (s) { map[q.category].correct += s.correct; map[q.category].total += s.seen }
    })
    return Object.entries(map).map(([cat, v]) => ({
      cat,
      pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      started: v.total > 0,
    }))
  }

  const totalSeen    = progress ? Object.values(progress.questionStats).reduce((a, s) => a + s.seen, 0) : 0
  const totalCorrect = progress ? Object.values(progress.questionStats).reduce((a, s) => a + s.correct, 0) : 0
  const accuracy     = totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0

  const xp     = progress?.xp ?? 0
  const streak = progress?.streak ?? 0
  const rounds = progress?.completedRounds ?? 0

  const DAILY_GOAL = 50
  const goalPct = Math.min(100, Math.round((xp % DAILY_GOAL) / DAILY_GOAL * 100))

  return (
    <div className="space-y-5 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C] leading-tight">YDS Trainer</h1>
          <p className="text-sm text-[#AFAFAF] font-semibold">Günlük pratik yap, kalıpları öğren</p>
        </div>
        {/* Streak */}
        <div className="flex flex-col items-center bg-orange-50 rounded-2xl px-3 py-2 border-b-2 border-orange-200">
          <span className="text-2xl leading-none">🔥</span>
          <span className="text-sm font-black text-orange-500">{streak}</span>
          <span className="text-[10px] text-orange-400 font-bold">GÜN</span>
        </div>
      </div>

      {/* Daily goal bar */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Günlük Hedef</span>
          <span className="text-xs font-black text-[#58CC02]">{xp % DAILY_GOAL} / {DAILY_GOAL} XP</span>
        </div>
        <div className="h-4 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#58CC02] rounded-full transition-all duration-700"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '⭐', val: xp, label: 'XP', color: 'text-[#FFD900]' },
          { icon: '🎯', val: rounds, label: 'Tur', color: 'text-[#1CB0F6]' },
          { icon: '✓', val: totalSeen > 0 ? `${accuracy}%` : '—', label: 'Doğruluk', color: 'text-[#58CC02]' },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center border-b-4 border-[#E5E5E5]">
            <div className={`text-xl font-black ${s.color}`}>{s.icon}</div>
            <div className="text-lg font-black text-[#3C3C3C]">{s.val}</div>
            <div className="text-[11px] font-bold text-[#AFAFAF] uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Big CTA */}
      <div className="flex gap-3">
        <Link href="/quiz" className="btn-duo text-center no-underline text-lg tracking-widest flex-1">
          ⚡ QUIZ
        </Link>
        <Link href="/typing" className="btn-duo btn-duo-yellow text-center no-underline text-lg tracking-widest flex-1">
          ✍️ YAZARAK
        </Link>
      </div>

      {/* Category breakdown */}
      {data && (
        <div className="card p-4 space-y-3">
          <h2 className="font-black text-sm text-[#AFAFAF] uppercase tracking-wide">Kategori Durumu</h2>
          {catStats().map(({ cat, pct, started }) => (
            <div key={cat} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${CAT_COLOR[cat]?.badge ?? 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </span>
                <span className="text-xs font-bold text-[#AFAFAF]">{started ? `${pct}%` : 'Başlanmadı'}</span>
              </div>
              <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${CAT_COLOR[cat]?.bar ?? 'bg-gray-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/patterns" className="card p-4 flex items-center gap-3 active:scale-95 transition-transform border-b-4 border-[#E5E5E5]">
          <span className="text-2xl">📚</span>
          <div>
            <div className="font-black text-sm text-[#3C3C3C]">Kalıplar</div>
            <div className="text-xs text-[#AFAFAF] font-semibold">{data?.patterns.length ?? 0} kalıp</div>
          </div>
        </Link>
        <Link href="/stats" className="card p-4 flex items-center gap-3 active:scale-95 transition-transform border-b-4 border-[#E5E5E5]">
          <span className="text-2xl">📊</span>
          <div>
            <div className="font-black text-sm text-[#3C3C3C]">İstatistik</div>
            <div className="text-xs text-[#AFAFAF] font-semibold">{totalSeen} cevap</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
