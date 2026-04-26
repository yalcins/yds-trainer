'use client'
import { useEffect, useState } from 'react'
import { getProgress, resetProgress } from '@/lib/store'
import { loadData } from '@/lib/data'
import type { UserProgress, YDSData } from '@/lib/types'

const CAT_COLOR: Record<string, string> = {
  VOCAB: 'bg-violet-500',
  GRAMMAR: 'bg-blue-500',
  PREPOSITION: 'bg-amber-500',
  LINKER: 'bg-green-500',
  PHRASAL: 'bg-rose-500',
}

export default function StatsPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [data, setData] = useState<YDSData | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    setProgress(getProgress())
    loadData().then(setData)
  }, [])

  if (!progress || !data) return <div className="text-center py-20 text-gray-400">Yükleniyor…</div>

  // Per-category stats
  const catMap: Record<string, { correct: number; total: number; name: string }> = {}
  data.questions.forEach(q => {
    const s = progress.questionStats[q.id]
    if (!catMap[q.category]) catMap[q.category] = { correct: 0, total: 0, name: q.category }
    if (s) { catMap[q.category].correct += s.correct; catMap[q.category].total += s.seen }
  })

  const totalSeen = Object.values(progress.questionStats).reduce((a, s) => a + s.seen, 0)
  const totalCorrect = Object.values(progress.questionStats).reduce((a, s) => a + s.correct, 0)
  const overallAcc = totalSeen > 0 ? Math.round((totalCorrect / totalSeen) * 100) : 0

  // Weakest questions
  const weak = Object.entries(progress.questionStats)
    .filter(([, s]) => s.seen >= 2)
    .map(([id, s]) => ({ id, acc: Math.round((s.correct / s.seen) * 100), seen: s.seen }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5)

  const weakQs = weak.map(w => ({
    ...w,
    q: data.questions.find(q => q.id === w.id),
  })).filter(w => w.q)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">İstatistikler</h1>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Toplam Cevap', value: totalSeen, icon: '📝' },
          { label: 'Doğruluk', value: `${overallAcc}%`, icon: '🎯' },
          { label: 'XP', value: progress.xp, icon: '⭐' },
          { label: 'Seri', value: `${progress.streak} gün`, icon: '🔥' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Category bars */}
      <div className="card p-4 space-y-4">
        <h2 className="font-semibold text-gray-700">Kategoriye Göre</h2>
        {Object.values(catMap).map(c => {
          const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0
          return (
            <div key={c.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{c.name}</span>
                <span className="text-gray-500">{c.total > 0 ? `${c.correct}/${c.total} (${pct}%)` : 'Başlanmadı'}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${CAT_COLOR[c.name] ?? 'bg-gray-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Weak questions */}
      {weakQs.length > 0 && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">En Zayıf Sorular</h2>
          {weakQs.map(({ q, acc, seen }) => q && (
            <div key={q.id} className="border border-red-100 rounded-xl p-3 bg-red-50">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm text-gray-800 flex-1 line-clamp-2">{q.question_text.slice(0, 80)}…</p>
                <span className="shrink-0 text-xs font-bold text-red-600 bg-white border border-red-200 px-2 py-0.5 rounded-full">
                  {acc}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{q.pattern} · {seen} deneme</p>
            </div>
          ))}
        </div>
      )}

      {/* Reset */}
      {!confirmReset ? (
        <button onClick={() => setConfirmReset(true)} className="w-full text-sm text-red-400 py-3 underline">
          İlerlemeyi Sıfırla
        </button>
      ) : (
        <div className="card p-4 space-y-3 border border-red-200">
          <p className="text-sm text-red-700 font-medium">Tüm ilerleme silinecek. Emin misin?</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmReset(false)} className="flex-1 py-2 border border-gray-300 rounded-xl text-sm">
              İptal
            </button>
            <button
              onClick={() => { resetProgress(); setProgress(getProgress()); setConfirmReset(false) }}
              className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold"
            >
              Sıfırla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
