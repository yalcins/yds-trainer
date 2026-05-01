'use client'
import { useEffect, useState } from 'react'
import type { ExamData } from '@/lib/types'
import {
  getAdaptiveStore, getLevelProgress, getWeakQuestions, getDangerousMisconceptions,
  getSectionAccuracy, getReviewQueue, type AdaptiveStore,
} from '@/lib/adaptive-store'

const SECTION_ICON: Record<string, string> = {
  fill_blank_vocab:'📝', cloze:'🔗', sentence_completion:'🧩',
  translation:'🌍', reading:'📖', paragraph_completion:'🔀', paragraph_questions:'💡',
}

const LEVEL_ICONS = ['🥚','🐣','🐦','🦅','🏆']

export default function ProgressPage() {
  const [exam, setExam]   = useState<ExamData | null>(null)
  const [store, setStore] = useState<AdaptiveStore | null>(null)

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then(setExam)
    setStore(getAdaptiveStore())
  }, [])

  if (!exam || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-4xl animate-bounce">📈</div>
        <p className="font-bold text-[#AFAFAF]">Yükleniyor...</p>
      </div>
    )
  }

  const { level, next: nextLevel, pct: levelPct } = getLevelProgress(store.totalXp)
  const weakQs      = getWeakQuestions(store, 5)
  const dangerous   = getDangerousMisconceptions(store)
  const reviewQueue = getReviewQueue(store)
  const meta        = exam.meta

  // Overall training stats
  const totalAttempts = store.attempts.length
  const totalCorrect  = store.attempts.filter(a => a.isCorrect).length
  const overallAcc    = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  // Sessions
  const sessionCount    = store.dailySessions.length
  const masteredCount   = Object.values(store.questionReviews).filter(r => r.mastered).length

  // Estimated score
  const trainBonus  = Math.floor(totalCorrect * 0.25)
  const estCorrect  = Math.min(80, meta.total_correct + trainBonus)
  const estScore    = Math.round(estCorrect * 1.25 * 10) / 10

  // Last 7 days activity
  const today = new Date().toISOString().slice(0, 10)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10)
    const dayAttempts = store.attempts.filter(a => a.timestamp.startsWith(d))
    return {
      date: d,
      label: ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'][new Date(d + 'T00:00:00').getDay()],
      count: dayAttempts.length,
      correct: dayAttempts.filter(a => a.isCorrect).length,
      isToday: d === today,
    }
  })
  const maxCount = Math.max(...last7.map(d => d.count), 1)

  // Error type breakdown
  const errorBreakdown = store.attempts.reduce((acc, a) => {
    acc[a.errorType] = (acc[a.errorType] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-5 pb-4">
      <div className="pt-1">
        <h1 className="text-2xl font-black text-[#3C3C3C]">📈 İlerleme</h1>
        <p className="text-xs font-bold text-[#AFAFAF]">Seviye sistemi · Spaced repetition · Detaylı analiz</p>
      </div>

      {/* Level card */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF9DB] border-2 border-[#FFD900] flex items-center justify-center text-3xl">
            {LEVEL_ICONS[level.level - 1] ?? '⭐'}
          </div>
          <div className="flex-1">
            <p className="text-xl font-black text-[#3C3C3C]">Seviye {level.level}</p>
            <p className="text-sm font-black text-amber-600">{level.name}</p>
            <p className="text-xs font-bold text-[#AFAFAF]">{level.description}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-[#58CC02]">{store.totalXp}</div>
            <div className="text-[10px] font-bold text-[#AFAFAF]">TOPLAM XP</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-4 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#FFD900] rounded-full transition-all duration-700" style={{ width: `${levelPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-[#AFAFAF]">
            <span>{level.name}</span>
            {nextLevel ? (
              <span>{nextLevel.xpRequired - store.totalXp} XP → Seviye {nextLevel.level}: {nextLevel.name}</span>
            ) : <span>MAX SEVİYE!</span>}
          </div>
        </div>

        {/* Mini level road */}
        <div className="flex items-center justify-between pt-1">
          {LEVEL_ICONS.map((icon, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xl border-2 ${i < level.level ? 'border-[#FFD900] bg-[#FFF9DB]' : 'border-[#E5E5E5] bg-white opacity-40'}`}>
                {icon}
              </div>
              <span className="text-[9px] font-black text-[#AFAFAF]">Sv.{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score progress */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Puan Tahmini</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { val: meta.yds_score, label: 'Sınav',    bg: 'bg-[#F8F8F8]', tc: 'text-[#3C3C3C]' },
            { val: estScore,        label: 'Tahmin',   bg: 'bg-[#D7FFB8]', tc: 'text-[#46A302]' },
            { val: 55,              label: 'Hedef',    bg: 'bg-[#FFF9DB]', tc: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
              <div className={`text-xl font-black ${s.tc}`}>{s.val}</div>
              <div className="text-[10px] font-bold text-[#AFAFAF]">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, Math.round((estCorrect / meta.target_correct_needed) * 100))}%`,
              background: estScore >= 55 ? '#58CC02' : '#1CB0F6'
            }}
          />
        </div>
      </div>

      {/* Overall stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: '📝', val: totalAttempts,  label: 'Toplam Deneme', color: 'border-[#1CB0F6]' },
          { icon: '🎯', val: `${overallAcc}%`, label: 'Doğruluk',   color: 'border-[#58CC02]' },
          { icon: '📅', val: sessionCount,   label: 'Oturum',       color: 'border-[#FFD900]' },
          { icon: '⭐', val: masteredCount,  label: 'Ezber',        color: 'border-violet-400' },
        ].map(s => (
          <div key={s.label} className={`card p-4 text-center border-b-4 ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-black text-[#3C3C3C]">{s.val}</div>
            <div className="text-[11px] font-bold text-[#AFAFAF] uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 7-day activity chart */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Son 7 Gün</p>
        <div className="flex items-end gap-2 h-24">
          {last7.map((d, i) => {
            const h = d.count > 0 ? Math.max(10, Math.round((d.count / maxCount) * 80)) : 4
            const acc = d.count ? Math.round((d.correct / d.count) * 100) : 0
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {d.count > 0 && (
                  <span className="text-[9px] font-black text-[#AFAFAF]">{acc}%</span>
                )}
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    d.count > 0
                      ? (d.isToday ? 'bg-[#58CC02]' : acc >= 70 ? 'bg-[#1CB0F6]' : 'bg-amber-400')
                      : 'bg-[#F0F0F0]'
                  }`}
                  style={{ height: h }}
                />
                <span className={`text-[9px] font-black ${d.isToday ? 'text-[#58CC02]' : 'text-[#AFAFAF]'}`}>
                  {d.label}
                </span>
                <span className="text-[9px] font-bold text-[#AFAFAF]">{d.count || ''}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section accuracy: exam vs training */}
      <div className="card p-4 space-y-4">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Bölüm Karşılaştırma</p>
        <div className="flex gap-4 text-[10px] font-bold text-[#AFAFAF]">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#E5E5E5] inline-block" />Sınav</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[#1CB0F6] inline-block" />Antrenman</span>
        </div>
        {Object.entries(exam.section_analysis).map(([key, sec]) => {
          const trainStat = getSectionAccuracy(store, key)
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#3C3C3C]">
                  {SECTION_ICON[key]} {sec.section_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#AFAFAF]">{sec.accuracy_pct}%</span>
                  {trainStat.attempts > 0 && (
                    <span className={`text-xs font-black ${trainStat.pct > sec.accuracy_pct ? 'text-[#58CC02]' : 'text-amber-500'}`}>
                      → {trainStat.pct}% {trainStat.pct > sec.accuracy_pct ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </div>
              {/* Exam bar */}
              <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sec.accuracy_pct < 35 ? 'bg-[#FF4B4B]' : sec.accuracy_pct < 60 ? 'bg-amber-400' : 'bg-[#58CC02]'}`}
                  style={{ width: `${sec.accuracy_pct}%` }}
                />
              </div>
              {/* Training bar */}
              {trainStat.attempts > 0 && (
                <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1CB0F6] rounded-full transition-all" style={{ width: `${trainStat.pct}%` }} />
                </div>
              )}
              {trainStat.attempts > 0 && (
                <p className="text-[10px] font-bold text-[#AFAFAF]">{trainStat.attempts} deneme</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Error type breakdown */}
      {totalAttempts > 0 && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Hata Tipi Analizi</p>
          {[
            { key: 'dangerous_misconception', label: '🚨 Tehlikeli Yanılgı', color: 'bg-[#FF4B4B]' },
            { key: 'weak_knowledge',           label: '📚 Zayıf Bilgi',       color: 'bg-amber-400' },
            { key: 'normal_wrong',             label: '❌ Normal Yanlış',     color: 'bg-orange-300' },
            { key: 'lucky_correct',            label: '🍀 Şanslı Doğru',     color: 'bg-[#1CB0F6]' },
            { key: 'normal_correct',           label: '✅ Normal Doğru',      color: 'bg-[#58CC02]' },
            { key: 'mastered',                 label: '⭐ Öğrenildi',         color: 'bg-[#FFD900]' },
          ].filter(e => errorBreakdown[e.key] > 0).map(e => {
            const count = errorBreakdown[e.key] ?? 0
            const pct   = Math.round((count / totalAttempts) * 100)
            return (
              <div key={e.key} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-[#3C3C3C]">
                  <span>{e.label}</span>
                  <span className="text-[#AFAFAF]">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${e.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Spaced repetition queue */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">🔄 Tekrar Kuyruğu</p>
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${reviewQueue.length > 0 ? 'bg-red-100 text-[#FF4B4B]' : 'bg-[#D7FFB8] text-[#46A302]'}`}>
            {reviewQueue.length} soru bekliyor
          </span>
        </div>
        {reviewQueue.length === 0 ? (
          <p className="text-sm font-semibold text-[#AFAFAF] text-center py-2">✨ Tüm tekrarlar tamam!</p>
        ) : (
          <div className="space-y-2">
            {reviewQueue.slice(0, 5).map(id => {
              const q = exam.questions.find(q => q.question_number === id)
              const r = store.questionReviews[id]
              if (!q) return null
              return (
                <div key={id} className="bg-[#F8F8F8] rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#3C3C3C] line-clamp-1">{q.question_text?.slice(0, 60) ?? `Soru ${id}`}...</p>
                    <p className="text-[10px] font-bold text-[#AFAFAF]">{q.section_name} · {r?.wrongCount ?? 0}× yanlış</p>
                  </div>
                  <span className="text-[10px] font-black text-[#FF4B4B] shrink-0">Bugün!</span>
                </div>
              )
            })}
            {reviewQueue.length > 5 && (
              <p className="text-xs font-bold text-[#AFAFAF] text-center">+{reviewQueue.length - 5} daha...</p>
            )}
          </div>
        )}
      </div>

      {/* Dangerous misconceptions */}
      {dangerous.length > 0 && (
        <div className="card p-4 space-y-3 border-l-4 border-[#FF4B4B]">
          <p className="text-xs font-black text-[#FF4B4B] uppercase tracking-wide">
            🚨 Tehlikeli Yanılgılar ({dangerous.length})
          </p>
          <p className="text-xs font-semibold text-[#AFAFAF]">
            Yüksek güvenle yanlış yaptığın sorular — bunlar en tehlikeli!
          </p>
          {dangerous.slice(0, 3).map(a => {
            const q = exam.questions.find(qq => qq.question_number === a.questionId)
            if (!q) return null
            return (
              <div key={a.id} className="bg-red-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-[#3C3C3C] line-clamp-2">{q.question_text?.slice(0, 80)}...</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold text-[#FF4B4B]">Sen: {a.selectedAnswer})</span>
                  <span className="text-[10px] font-bold text-[#58CC02]">Doğru: {a.correctAnswer})</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Study plan reminder */}
      <div className="card p-4 space-y-2 border-l-4 border-[#FFD900]">
        <p className="text-xs font-black text-amber-700 uppercase tracking-wide">🎯 55 Puan Planı</p>
        {meta.study_priority_order.map((item, i) => (
          <p key={i} className="text-xs font-semibold text-[#3C3C3C]">{item}</p>
        ))}
      </div>
    </div>
  )
}
