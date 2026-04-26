'use client'
import { useEffect, useState } from 'react'
import { getProgress, resetProgress } from '@/lib/store'
import { loadData } from '@/lib/data'
import type { UserProgress, YDSData } from '@/lib/types'

const CAT_BAR: Record<string, string> = {
  VOCAB:       'bg-violet-400',
  GRAMMAR:     'bg-[#1CB0F6]',
  PREPOSITION: 'bg-amber-400',
  LINKER:      'bg-[#58CC02]',
  PHRASAL:     'bg-rose-400',
}

export default function StatsPage() {
  const [progress, setProgress]       = useState<UserProgress | null>(null)
  const [data, setData]               = useState<YDSData | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setProgress(getProgress())
    loadData().then(setData)
  }, [])

  if (!progress || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    )
  }

  const catMap: Record<string, { correct: number; total: number }> = {}
  data.questions.forEach(q => {
    const s = progress.questionStats[q.id]
    if (!catMap[q.category]) catMap[q.category] = { correct: 0, total: 0 }
    if (s) { catMap[q.category].correct += s.correct; catMap[q.category].total += s.seen }
  })

  const totalSeen    = Object.values(progress.questionStats).reduce((a, s) => a + s.seen, 0)
  const totalCorrect = Object.values(progress.questionStats).reduce((a, s) => a + s.correct, 0)
  const overallAcc   = totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0

  const weak = Object.entries(progress.questionStats)
    .filter(([, s]) => s.seen >= 2)
    .map(([id, s]) => ({ id, acc: Math.round((s.correct / s.seen) * 100), seen: s.seen }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5)
    .map(w => ({ ...w, q: data.questions.find(q => q.id === w.id) }))
    .filter(w => w.q)

  return (
    <div className="space-y-5 pb-2">
      <h1 className="text-2xl font-black text-[#3C3C3C] pt-1">İstatistikler</h1>

      {/* Big stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📝', val: totalSeen,           label: 'Toplam Cevap', color: 'border-[#1CB0F6]' },
          { icon: '🎯', val: `${overallAcc}%`,     label: 'Doğruluk',     color: 'border-[#58CC02]' },
          { icon: '⭐', val: progress.xp,          label: 'XP',           color: 'border-[#FFD900]' },
          { icon: '🔥', val: `${progress.streak} gün`, label: 'Seri',    color: 'border-orange-400' },
        ].map(s => (
          <div key={s.label} className={`card p-4 text-center border-b-4 ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-black text-[#3C3C3C]">{s.val}</div>
            <div className="text-[11px] font-bold text-[#AFAFAF] uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category bars */}
      <div className="card p-4 space-y-4">
        <h2 className="font-black text-sm text-[#AFAFAF] uppercase tracking-wide">Kategoriye Göre</h2>
        {Object.entries(catMap).map(([name, c]) => {
          const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0
          return (
            <div key={name}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-black text-sm text-[#3C3C3C]">{name}</span>
                <span className="text-xs font-bold text-[#AFAFAF]">
                  {c.total > 0 ? `${c.correct}/${c.total} · ${pct}%` : 'Başlanmadı'}
                </span>
              </div>
              <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${CAT_BAR[name] ?? 'bg-gray-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Weak questions */}
      {weak.length > 0 && (
        <div className="card p-4 space-y-3">
          <h2 className="font-black text-sm text-[#AFAFAF] uppercase tracking-wide">En Zayıf Sorular</h2>
          {weak.map(({ q, acc, seen }) => q && (
            <div key={q.id} className="rounded-2xl p-3 bg-red-50 border-l-4 border-[#FF4B4B]">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm font-semibold text-[#3C3C3C] flex-1 line-clamp-2">{q.question_text.slice(0, 80)}…</p>
                <span className="shrink-0 text-xs font-black text-[#FF4B4B] bg-white border-2 border-[#FF4B4B] px-2 py-0.5 rounded-full">
                  {acc}%
                </span>
              </div>
              <p className="text-xs font-bold text-[#AFAFAF] mt-1">{q.pattern} · {seen} deneme</p>
            </div>
          ))}
        </div>
      )}

      {/* Reset */}
      {!confirmReset ? (
        <button
          onClick={() => setConfirmReset(true)}
          className="w-full py-3 text-sm font-bold text-[#AFAFAF] underline"
        >
          İlerlemeyi Sıfırla
        </button>
      ) : (
        <div className="card p-4 space-y-3 border-2 border-[#FF4B4B]">
          <p className="text-sm font-black text-[#FF4B4B] text-center">Tüm ilerleme silinecek. Emin misin?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmReset(false)}
              className="btn-duo btn-duo-ghost flex-1"
            >
              İptal
            </button>
            <button
              onClick={() => { resetProgress(); setProgress(getProgress()); setConfirmReset(false) }}
              className="btn-duo btn-duo-red flex-1"
            >
              Sıfırla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
