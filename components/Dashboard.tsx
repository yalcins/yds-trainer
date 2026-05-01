'use client'
import { useEffect, useMemo, useState } from 'react'
import { getProgress } from '@/lib/store'
import type { UserProgress, YDSData } from '@/lib/types'

const CAT_BAR: Record<string, string> = {
  VOCAB:       'bg-violet-400',
  GRAMMAR:     'bg-[#1CB0F6]',
  PREPOSITION: 'bg-amber-400',
  LINKER:      'bg-[#58CC02]',
  PHRASAL:     'bg-rose-400',
}

const CAT_BADGE: Record<string, string> = {
  VOCAB:       'bg-violet-100 text-violet-700',
  GRAMMAR:     'bg-blue-100 text-blue-700',
  PREPOSITION: 'bg-amber-100 text-amber-700',
  LINKER:      'bg-[#D7FFB8] text-[#46A302]',
  PHRASAL:     'bg-rose-100 text-rose-600',
}

interface DashboardProps {
  data: YDSData
}

export default function Dashboard({ data }: DashboardProps) {
  const [progress, setProgress] = useState<UserProgress>(() => getProgress())

  useEffect(() => {
    setProgress(getProgress())
  }, [])

  const { totalCorrect, totalWrong, score, catStats } = useMemo(() => {
    const stats = progress.questionStats
    const totalCorrect = Object.values(stats).reduce((a, s) => a + s.correct, 0)
    const totalSeen    = Object.values(stats).reduce((a, s) => a + s.seen, 0)
    const totalWrong   = totalSeen - totalCorrect
    const score        = totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0

    const catMap: Record<string, { correct: number; total: number }> = {}
    data.questions.forEach(q => {
      const s = stats[q.id]
      if (!catMap[q.category]) catMap[q.category] = { correct: 0, total: 0 }
      if (s) {
        catMap[q.category].correct += s.correct
        catMap[q.category].total   += s.seen
      }
    })

    const catStats = Object.entries(catMap)
      .map(([cat, v]) => ({
        cat,
        correct: v.correct,
        total:   v.total,
        pct:     v.total > 0 ? Math.round((v.correct / v.total) * 100) : -1,
      }))

    return { totalCorrect, totalWrong, score, catStats }
  }, [progress, data])

  const attempted = catStats.filter(c => c.total > 0).sort((a, b) => a.pct - b.pct)
  const weakest   = attempted.slice(0, 3)
  const strongest = [...attempted].reverse().slice(0, 3)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-[#3C3C3C] pt-1">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '✅', val: totalCorrect, label: 'Doğru',    color: 'border-[#58CC02]' },
          { icon: '❌', val: totalWrong,   label: 'Yanlış',   color: 'border-[#FF4B4B]' },
          { icon: '🎯', val: `${score}%`,  label: 'Puan',     color: 'border-[#1CB0F6]' },
        ].map(s => (
          <div key={s.label} className={`card p-4 text-center border-b-4 ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-black text-[#3C3C3C]">{s.val}</div>
            <div className="text-[11px] font-bold text-[#AFAFAF] uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* All categories */}
      <div className="card p-4 space-y-4">
        <h2 className="font-black text-sm text-[#AFAFAF] uppercase tracking-wide">Kategoriye Göre</h2>
        {catStats.map(({ cat, correct, total, pct }) => (
          <div key={cat}>
            <div className="flex justify-between items-center mb-1.5">
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${CAT_BADGE[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                {cat}
              </span>
              <span className="text-xs font-bold text-[#AFAFAF]">
                {total > 0 ? `${correct}/${total} · ${pct}%` : 'Başlanmadı'}
              </span>
            </div>
            <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${CAT_BAR[cat] ?? 'bg-gray-400'}`}
                style={{ width: `${Math.max(0, pct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Weakest & Strongest side by side */}
      {attempted.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {/* Weakest */}
          <div className="card p-4 space-y-2">
            <h2 className="font-black text-xs text-[#AFAFAF] uppercase tracking-wide">En Zayıf</h2>
            {weakest.map(({ cat, pct }) => (
              <div key={cat} className="flex items-center justify-between gap-2">
                <span className={`text-xs font-black px-2 py-0.5 rounded-full truncate ${CAT_BADGE[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </span>
                <span className="text-xs font-black text-[#FF4B4B] shrink-0">{pct}%</span>
              </div>
            ))}
          </div>

          {/* Strongest */}
          <div className="card p-4 space-y-2">
            <h2 className="font-black text-xs text-[#AFAFAF] uppercase tracking-wide">En Güçlü</h2>
            {strongest.map(({ cat, pct }) => (
              <div key={cat} className="flex items-center justify-between gap-2">
                <span className={`text-xs font-black px-2 py-0.5 rounded-full truncate ${CAT_BADGE[cat] ?? 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </span>
                <span className="text-xs font-black text-[#58CC02] shrink-0">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {attempted.length === 0 && (
        <div className="card p-6 text-center text-[#AFAFAF] font-bold text-sm">
          Henüz hiç soru cevaplanmadı. Quiz başlat! ⚡
        </div>
      )}
    </div>
  )
}
