'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ExamData } from '@/lib/types'
import { getAdaptiveStore, getUserLevel, getLevelProgress, getTodaySession } from '@/lib/adaptive-store'
import type { AdaptiveStore } from '@/lib/adaptive-store'
import { getWrongQuestionIds } from '@/lib/store'

const SECTION_ICON: Record<string, string> = {
  fill_blank_vocab: '📝', cloze: '🔗', sentence_completion: '🧩',
  translation: '🌍', reading: '📖', paragraph_completion: '🔀', paragraph_questions: '💡',
}

const PRIORITY_BADGE: Record<string, string> = {
  HIGH:   'bg-red-100 text-[#FF4B4B]',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW:    'bg-[#D7FFB8] text-[#46A302]',
}

export default function Dashboard() {
  const [exam, setExam]   = useState<ExamData | null>(null)
  const [store, setStore] = useState<AdaptiveStore | null>(null)
  const [wrongCount, setWrongCount] = useState(0)

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then(setExam)
    setStore(getAdaptiveStore())
    setWrongCount(getWrongQuestionIds().length)
  }, [])

  if (!exam || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-5xl animate-bounce">🎯</div>
        <p className="font-bold text-[#AFAFAF]">Yükleniyor...</p>
      </div>
    )
  }

  const meta = exam.meta
  const { level, next: nextLevel, pct: levelPct } = getLevelProgress(store.totalXp)
  const todaySession = getTodaySession(store)
  const todayDone    = !!todaySession?.completed
  const todayAns     = todaySession ? Object.keys(todaySession.answers).length : 0
  const todayCorrect = todaySession ? Object.values(todaySession.answers).filter((a: any) => a.correct).length : 0

  const totalAttempts = store.attempts.length
  const totalCorrectAttempts = store.attempts.filter(a => a.isCorrect).length
  const overallAcc = totalAttempts ? Math.round((totalCorrectAttempts / totalAttempts) * 100) : 0

  const weakSections = Object.entries(exam.section_analysis)
    .sort((a, b) => a[1].accuracy_pct - b[1].accuracy_pct)
    .slice(0, 3)

  const trainBonus  = Math.floor(totalCorrectAttempts * 0.25)
  const estCorrect  = Math.min(80, meta.total_correct + trainBonus)
  const estScore    = Math.round(estCorrect * 1.25 * 10) / 10
  const scorePct    = Math.min(100, Math.round((estCorrect / meta.target_correct_needed) * 100))

  const dayRec = (() => {
    const sections = Object.entries(exam.section_analysis).sort((a, b) => a[1].accuracy_pct - b[1].accuracy_pct)
    const [, sec] = sections[new Date().getDay() % sections.length]
    return `Bugün odak: ${sec.section_name} — ${sec.study_advice.slice(0, 70)}...`
  })()

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C]">Merhaba! 👋</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">YDS 55 hedefine devam et</p>
        </div>
        <div className="bg-white rounded-2xl px-3 py-2 border-2 border-[#E5E5E5] text-center">
          <div className="text-lg">🔥</div>
          <div className="text-xs font-black text-[#AFAFAF]">{store.streak} gün</div>
        </div>
      </div>

      {/* Level bar */}
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <div>
              <p className="text-sm font-black text-[#3C3C3C]">Seviye {level.level} — {level.name}</p>
              <p className="text-xs font-bold text-[#AFAFAF]">{level.description}</p>
            </div>
          </div>
          <span className="text-sm font-black text-[#58CC02]">{store.totalXp} XP</span>
        </div>
        <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div className="h-full bg-[#FFD900] rounded-full transition-all duration-700" style={{ width: `${levelPct}%` }} />
        </div>
        {nextLevel && (
          <p className="text-[10px] font-bold text-[#AFAFAF] text-right">
            Seviye {nextLevel.level}: {nextLevel.xpRequired - store.totalXp} XP kaldı
          </p>
        )}
      </div>

      {/* Score tracker */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Puan Takibi</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${estScore >= 55 ? 'bg-[#D7FFB8] text-[#46A302]' : 'bg-red-100 text-[#FF4B4B]'}`}>
            {estScore >= 55 ? '🎯 Hedefe ulaştın!' : `${meta.additional_correct_needed} doğru daha lazım`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { val: meta.yds_score, label: 'SINAV',   bg: 'bg-[#F8F8F8]',   text: 'text-[#3C3C3C]' },
            { val: estScore,       label: 'TAHMİNİ', bg: 'bg-[#D7FFB8]',   text: 'text-[#46A302]' },
            { val: 55,             label: 'HEDEF',   bg: 'bg-[#FFF9DB]',   text: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
              <div className={`text-xl font-black ${s.text}`}>{s.val}</div>
              <div className="text-[10px] font-bold text-[#AFAFAF]">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-[#AFAFAF]">
            <span>İlerleme: {estCorrect}/{meta.target_correct_needed} doğru</span>
            <span>{scorePct}%</span>
          </div>
          <div className="h-4 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${scorePct}%`, background: scorePct >= 100 ? '#58CC02' : scorePct >= 70 ? '#FFD900' : '#FF4B4B' }}
            />
          </div>
        </div>
      </div>

      {/* Daily Practice CTA */}
      <div className={`card p-4 border-b-4 space-y-3 ${todayDone ? 'border-[#58CC02]' : 'border-[#1CB0F6]'}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{todayDone ? '✅' : '⚡'}</span>
          <div>
            <p className="text-sm font-black text-[#3C3C3C]">{todayDone ? 'Günlük antrenman tamam!' : 'Günlük Antrenman'}</p>
            <p className="text-xs font-bold text-[#AFAFAF]">
              {todayDone ? `${todayCorrect}/${todayAns} doğru · +${todaySession?.xpEarned ?? 0} XP` : '15 adaptif soru · ~15 dakika'}
            </p>
          </div>
        </div>
        <Link href="/practice" className="btn-duo block text-center py-3">
          {todayDone ? '🔄 TEKRAR ÇÖZ' : '🎯 ANTRENMANA BAŞLA'}
        </Link>
      </div>

      {/* Daily recommendation */}
      <div className="card p-4 border-l-4 border-[#FFD900] space-y-1">
        <p className="text-xs font-black text-amber-700 uppercase tracking-wide">📌 Bugünkü Tavsiye</p>
        <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{dayRec}</p>
      </div>

      {/* Weakest sections */}
      <div className="space-y-2">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">En Zayıf Bölümler</p>
        {weakSections.map(([key, sec]) => (
          <div key={key} className="card p-3 flex items-center gap-3">
            <span className="text-2xl">{SECTION_ICON[key] ?? '📌'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#3C3C3C] truncate">{sec.section_name}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ml-2 shrink-0 ${PRIORITY_BADGE[sec.priority]}`}>
                  {sec.priority}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sec.accuracy_pct < 35 ? 'bg-[#FF4B4B]' : sec.accuracy_pct < 60 ? 'bg-amber-400' : 'bg-[#58CC02]'}`}
                    style={{ width: `${sec.accuracy_pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[#AFAFAF] shrink-0">{sec.accuracy_pct}%</span>
              </div>
            </div>
          </div>
        ))}
        <Link href="/train" className="block text-center text-xs font-black text-[#1CB0F6] py-1">
          Tüm bölümleri gör →
        </Link>
      </div>

      {/* Quick links grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/mistakes',    icon: '❌', label: 'Hata Bankası',      sub: `${store.attempts.filter(a => !a.isCorrect).length} hata` },
          { href: '/progress',    icon: '📈', label: 'İlerleme',          sub: totalAttempts ? `${overallAcc}% doğruluk` : 'Başlamadı' },
          { href: '/patterns',    icon: '📚', label: 'Kalıplar',          sub: 'İpuçları + örnekler' },
          { href: '/chat',        icon: '🤖', label: 'AI Asistan',        sub: 'Soru sor' },
          { href: '/wrong-quiz',  icon: '🔁', label: 'Yanlış Sorular',    sub: wrongCount > 0 ? `${wrongCount} soru` : 'Henüz yok' },
        ].map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="card p-4 flex items-center gap-3 border-b-4 border-[#E5E5E5] active:translate-y-[2px] active:border-b-[1px] transition-all"
          >
            <span className="text-2xl">{l.icon}</span>
            <div>
              <p className="text-sm font-black text-[#3C3C3C]">{l.label}</p>
              <p className="text-xs font-bold text-[#AFAFAF]">{l.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
