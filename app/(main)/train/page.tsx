'use client'
import { useEffect, useState, useRef } from 'react'
import type { ExamData, ExamQuestion, SectionKey, SectionAnalysis } from '@/lib/types'
import {
  getTrainingProgress, recordTrainingAnswer, markTipsViewed, getTodayLog, getLast7DaysLogs,
} from '@/lib/store'

// ── Constants ──────────────────────────────────────────────────────────────────

const SECTION_ORDER: SectionKey[] = [
  'sentence_completion',
  'cloze',
  'reading',
  'fill_blank_vocab',
  'paragraph_completion',
  'paragraph_questions',
  'translation',
]

const PRIORITY_COLOR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  HIGH:   { bg: 'bg-red-50',    text: 'text-[#FF4B4B]', border: 'border-[#FF4B4B]', label: 'ÖNCELİKLİ' },
  MEDIUM: { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-400',  label: 'ORTA'       },
  LOW:    { bg: 'bg-[#F0FFF0]', text: 'text-[#46A302]',  border: 'border-[#58CC02]',  label: 'İYİ'        },
}

const SECTION_ICON: Record<string, string> = {
  fill_blank_vocab:     '📝',
  cloze:                '🔗',
  sentence_completion:  '🧩',
  translation:          '🌍',
  reading:              '📖',
  paragraph_completion: '🔀',
  paragraph_questions:  '💡',
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Screen = 'home' | 'tips' | 'practice' | 'result' | 'daily_stats'

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TrainPage() {
  const [examData, setExamData]     = useState<ExamData | null>(null)
  const [screen, setScreen]         = useState<Screen>('home')
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [refresh, setRefresh]       = useState(0)

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then(setExamData)
  }, [])

  if (!examData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-4xl animate-bounce">🎯</div>
        <p className="text-[#AFAFAF] font-bold">Eğitim verisi yükleniyor...</p>
      </div>
    )
  }

  const tp = getTrainingProgress()

  if (screen === 'tips' && activeSection) {
    return (
      <TipsScreen
        sectionKey={activeSection}
        analysis={examData.section_analysis[activeSection]}
        onDone={() => {
          markTipsViewed(activeSection)
          setScreen('practice')
        }}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'practice' && activeSection) {
    return (
      <PracticeScreen
        sectionKey={activeSection}
        examData={examData}
        onDone={() => { setRefresh(r => r + 1); setScreen('home') }}
        onBack={() => setScreen('home')}
      />
    )
  }

  if (screen === 'daily_stats') {
    return <DailyStatsScreen examData={examData} onBack={() => setScreen('home')} />
  }

  // ── Home ────────────────────────────────────────────────────────────────────
  const meta    = examData.meta
  const todayLog = getTodayLog()
  const todayQ  = todayLog?.questionsAnswered ?? 0
  const todayC  = todayLog?.correct ?? 0

  // How far toward 55 target
  const totalTrainCorrect = Object.values(tp.sectionStats).reduce((a, s) => a + s.correct, 0)
  const baseCorrect       = meta.total_correct  // 35 from exam
  const estimatedCorrect  = Math.min(80, baseCorrect + Math.floor(totalTrainCorrect * 0.3))
  const progressPct       = Math.min(100, Math.round((estimatedCorrect / meta.target_correct_needed) * 100))

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C]">Eğitim</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">55 puan hedefi · {meta.additional_correct_needed} doğru daha lazım</p>
        </div>
        <button
          onClick={() => setScreen('daily_stats')}
          className="flex flex-col items-center gap-0.5 bg-white rounded-2xl px-3 py-2 border-2 border-[#E5E5E5] border-b-4 active:translate-y-[2px] active:border-b-[1px] transition-all"
        >
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-black text-[#AFAFAF]">İSTATİSTİK</span>
        </button>
      </div>

      {/* Target progress bar */}
      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">55 Puan Hedefi</span>
          <span className="text-xs font-black text-[#58CC02]">{estimatedCorrect}/{meta.target_correct_needed} doğru</span>
        </div>
        <div className="h-4 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#58CC02] rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold text-[#AFAFAF]">
          <span>Sınav: {meta.yds_score} puan</span>
          <span>Hedef: 55 puan</span>
        </div>
      </div>

      {/* Today summary */}
      {todayQ > 0 && (
        <div className="card p-3 border-l-4 border-[#58CC02] flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div className="flex-1">
            <p className="text-sm font-black text-[#3C3C3C]">Bugün: {todayQ} soru · {todayC} doğru</p>
            <p className="text-xs font-bold text-[#AFAFAF]">Devam et, hedefe yaklaşıyorsun!</p>
          </div>
          <span className="text-xs font-black text-[#58CC02] bg-[#D7FFB8] px-2 py-1 rounded-full">
            +{todayLog?.xpEarned ?? 0} XP
          </span>
        </div>
      )}

      {/* Section list - ordered weakest to strongest */}
      <div className="space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">
          En zayıftan en güçlüye → önce bunları çalış
        </p>

        {SECTION_ORDER.map((secKey, idx) => {
          const sec       = examData.section_analysis[secKey]
          if (!sec) return null
          const pc        = PRIORITY_COLOR[sec.priority]
          const icon      = SECTION_ICON[secKey] ?? '📌'
          const trainStat = tp.sectionStats[secKey]
          const tipsOk    = tp.tipsViewed[secKey]
          const trainAcc  = trainStat && trainStat.attempts > 0
            ? Math.round((trainStat.correct / trainStat.attempts) * 100)
            : null

          return (
            <div key={secKey} className={`card p-4 border-l-4 ${pc.border} space-y-3`}>
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${pc.bg} flex items-center justify-center text-xl shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-[#3C3C3C]">{sec.section_name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pc.bg} ${pc.text}`}>
                      {pc.label}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#FFD900]/30 text-amber-700">
                        BURADAN BAŞLA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-bold text-[#AFAFAF]">Sınav: {sec.correct}/{sec.total} ({sec.accuracy_pct}%)</span>
                    {trainAcc !== null && (
                      <span className="text-xs font-bold text-[#58CC02]">Antrenman: {trainAcc}%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Accuracy bar */}
              <div className="space-y-1">
                <div className="h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sec.accuracy_pct < 35 ? 'bg-[#FF4B4B]' : sec.accuracy_pct < 60 ? 'bg-amber-400' : 'bg-[#58CC02]'}`}
                    style={{ width: `${sec.accuracy_pct}%` }}
                  />
                </div>
                {trainStat && (
                  <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1CB0F6] rounded-full" style={{ width: `${trainAcc}%` }} />
                  </div>
                )}
              </div>

              {/* Advice */}
              <p className="text-xs font-semibold text-[#AFAFAF] leading-relaxed line-clamp-2">
                {sec.study_advice}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setActiveSection(secKey); setScreen(tipsOk ? 'practice' : 'tips') }}
                  className="btn-duo flex-1 py-2.5 text-sm"
                >
                  {tipsOk ? '⚡ ANTRENMAN' : '📖 İPUÇLARI + ANTRENMAN'}
                </button>
                {tipsOk && (
                  <button
                    onClick={() => { setActiveSection(secKey); setScreen('tips') }}
                    className="px-3 py-2.5 rounded-xl border-2 border-[#E5E5E5] text-xs font-black text-[#AFAFAF] border-b-4 active:translate-y-[2px] active:border-b-[1px] transition-all"
                  >
                    📖
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tips Screen ────────────────────────────────────────────────────────────────
function TipsScreen({
  sectionKey, analysis, onDone, onBack
}: {
  sectionKey: SectionKey
  analysis: SectionAnalysis
  onDone: () => void
  onBack: () => void
}) {
  const [step, setStep] = useState(0)
  const tips = analysis.how_to_solve
  const total = tips.length

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onBack} className="text-[#AFAFAF] text-xl font-black">‹</button>
        <div>
          <h1 className="text-xl font-black text-[#3C3C3C]">{SECTION_ICON[sectionKey]} {analysis.section_name}</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">Nasıl çözülür? · {total} ipucu</p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center">
        {tips.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-[#58CC02]' : i < step ? 'w-2 bg-[#D7FFB8]' : 'w-2 bg-[#E5E5E5]'}`}
          />
        ))}
      </div>

      {/* Tip card */}
      <div className="card p-6 min-h-[200px] flex flex-col justify-center space-y-4 border-b-4 border-[#58CC02] animate-pop-in">
        <div className="w-12 h-12 rounded-2xl bg-[#D7FFB8] flex items-center justify-center text-2xl">
          {['🔍','💡','🎯','⚡','🧠','📌','✅','🔑'][step % 8]}
        </div>
        <p className="text-base font-bold text-[#3C3C3C] leading-relaxed">{tips[step]}</p>
      </div>

      {/* Pattern chips */}
      {step === tips.length - 1 && (
        <div className="card p-4 space-y-2 animate-slide-up">
          <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Sık çıkan tipler</p>
          <div className="flex flex-wrap gap-2">
            {analysis.common_patterns.map((p, i) => (
              <span key={i} className="text-xs font-bold bg-[#D7FFB8] text-[#46A302] px-3 py-1 rounded-full">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Study advice */}
      <div className="bg-amber-50 rounded-2xl p-4 border-l-4 border-amber-400">
        <p className="text-xs font-black text-amber-700 uppercase tracking-wide mb-1">Çalışma Tavsiyesi</p>
        <p className="text-sm font-semibold text-amber-900 leading-relaxed">{analysis.study_advice}</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-2xl border-2 border-[#E5E5E5] font-black text-[#AFAFAF] border-b-4 active:translate-y-[2px] active:border-b-[1px] transition-all"
          >
            ← GERİ
          </button>
        )}
        {step < total - 1 ? (
          <button onClick={() => setStep(s => s + 1)} className="btn-duo flex-1 py-3">
            İLERİ →
          </button>
        ) : (
          <button onClick={onDone} className="btn-duo flex-1 py-3">
            ⚡ ANTRENMANA BAŞLA
          </button>
        )}
      </div>
    </div>
  )
}

// ── Practice Screen ────────────────────────────────────────────────────────────
function PracticeScreen({
  sectionKey, examData, onDone, onBack
}: {
  sectionKey: SectionKey
  examData: ExamData
  onDone: () => void
  onBack: () => void
}) {
  const sectionQs = examData.questions.filter(q => q.section_key === sectionKey)
  // Wrong questions first, then all
  const wrongFirst = [
    ...sectionQs.filter(q => !q.is_correct),
    ...sectionQs.filter(q => q.is_correct),
  ]

  const [idx, setIdx]           = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, total: 0 })
  const [xpAnim, setXpAnim]     = useState(false)
  const [done, setDone]         = useState(false)

  const q = wrongFirst[idx]
  if (!q) return null

  const opts = Object.entries(q.options)
  const isLast = idx === wrongFirst.length - 1

  function answer(opt: string) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
    const correct = opt === q.correct_answer
    recordTrainingAnswer(sectionKey, correct)
    setSessionStats(s => ({
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
      total: s.total + 1,
    }))
    if (correct) {
      setXpAnim(true)
      setTimeout(() => setXpAnim(false), 1500)
    }
  }

  function next() {
    if (isLast) { setDone(true); return }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  if (done) {
    const acc = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0
    const xp  = sessionStats.correct * 15
    return (
      <div className="space-y-5 pb-4 pt-1">
        <div className="text-center space-y-2">
          <div className="text-5xl animate-bounce-in">{acc >= 70 ? '🏆' : acc >= 50 ? '💪' : '📚'}</div>
          <h2 className="text-2xl font-black text-[#3C3C3C]">Bölüm Tamamlandı!</h2>
        </div>
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-black text-[#58CC02]">{sessionStats.correct}</div>
              <div className="text-[10px] font-black text-[#AFAFAF] uppercase">Doğru</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FF4B4B]">{sessionStats.wrong}</div>
              <div className="text-[10px] font-black text-[#AFAFAF] uppercase">Yanlış</div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FFD900]">{acc}%</div>
              <div className="text-[10px] font-black text-[#AFAFAF] uppercase">Başarı</div>
            </div>
          </div>
          <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all duration-700" style={{ width: `${acc}%` }} />
          </div>
          <div className="flex items-center justify-center gap-2 py-2 bg-[#FFF9DB] rounded-2xl">
            <span className="text-2xl">⭐</span>
            <span className="text-xl font-black text-amber-600">+{xp} XP kazandın!</span>
          </div>
        </div>

        {/* Feedback */}
        <div className="card p-4 border-l-4 border-[#1CB0F6] space-y-2">
          <p className="text-xs font-black text-[#1CB0F6] uppercase tracking-wide">Nasıldı?</p>
          <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">
            {acc >= 80
              ? '🔥 Harika! Bu bölüm artık güçlü tarafın. Bir üst bölüme geç.'
              : acc >= 60
              ? '💪 İyi ilerliyorsun. Yanlışlarını tekrar gözden geçir.'
              : '📚 Bu bölümde biraz daha çalışmak lazım. İpuçlarını tekrar oku, sonra tekrar dene.'}
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onBack} className="btn-duo btn-duo-ghost flex-1 py-3">
            ← ANA EKRAN
          </button>
          <button onClick={() => { setIdx(0); setSelected(null); setRevealed(false); setSessionStats({correct:0,wrong:0,total:0}); setDone(false) }}
            className="btn-duo flex-1 py-3">
            🔄 TEKRAR
          </button>
        </div>
      </div>
    )
  }

  const optionStyle = (opt: string) => {
    if (!revealed) return 'border-[#E5E5E5] bg-white text-[#3C3C3C]'
    if (opt === q.correct_answer) return 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302]'
    if (opt === selected && opt !== q.correct_answer) return 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
    return 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]'
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onBack} className="text-[#AFAFAF] text-xl font-black">‹</button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#AFAFAF] uppercase">{SECTION_ICON[sectionKey]} Soru {idx + 1}/{wrongFirst.length}</span>
            <span className="text-xs font-black text-[#58CC02]">✓ {sessionStats.correct} · ✗ {sessionStats.wrong}</span>
          </div>
          <div className="h-2 bg-[#F0F0F0] rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all" style={{ width: `${(idx / wrongFirst.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Wrong marker */}
      {!q.is_correct && idx < sectionQs.filter(q => !q.is_correct).length && (
        <div className="flex items-center gap-2 text-xs font-black text-[#FF4B4B] bg-red-50 px-3 py-1.5 rounded-xl w-fit">
          ❌ Sınavda yanlış yaptığın soru
        </div>
      )}

      {/* XP float */}
      {xpAnim && (
        <div className="fixed top-20 right-6 z-50 animate-float-up pointer-events-none">
          <span className="text-lg font-black text-[#58CC02] bg-white rounded-2xl px-3 py-1.5 border-2 border-[#58CC02] shadow-lg">
            +15 XP ⭐
          </span>
        </div>
      )}

      {/* Question */}
      <div className="card p-5 space-y-2">
        <span className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wide">
          Soru {q.question_number} · {q.section_name}
        </span>
        <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">
          {q.question_text || '(Soru metni yüklenemedi — seçeneklerden cevabı seç)'}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {opts.length > 0 ? opts.map(([letter, text]) => (
          <button
            key={letter}
            onClick={() => answer(letter)}
            className={`w-full text-left p-4 rounded-2xl border-2 border-b-4 font-semibold text-sm transition-all active:translate-y-[2px] active:border-b-[1px] ${optionStyle(letter)} ${!revealed ? 'active:scale-[0.99]' : ''}`}
          >
            <span className="font-black mr-2">{letter})</span> {text}
          </button>
        )) : (
          ['A','B','C','D','E'].map(letter => (
            <button
              key={letter}
              onClick={() => answer(letter)}
              className={`w-full text-left p-4 rounded-2xl border-2 border-b-4 font-semibold text-sm transition-all ${optionStyle(letter)}`}
            >
              <span className="font-black">{letter})</span>
            </button>
          ))
        )}
      </div>

      {/* Explanation (after answer) */}
      {revealed && (
        <div className={`card p-4 space-y-3 border-l-4 animate-slide-up ${selected === q.correct_answer ? 'border-[#58CC02] bg-[#F0FFF0]' : 'border-[#FF4B4B] bg-red-50'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{selected === q.correct_answer ? '✅' : '❌'}</span>
            <span className={`font-black text-sm ${selected === q.correct_answer ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              {selected === q.correct_answer ? 'Doğru!' : `Yanlış — Cevap: ${q.correct_answer}) ${q.correct_option_text ?? ''}`}
            </span>
          </div>

          {/* Tips reminder */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wide">Bu Tip İçin İpuçları:</p>
            {q.how_to_solve_this_type.slice(0, 2).map((tip, i) => (
              <p key={i} className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">
                <span className="text-[#58CC02] font-black">{i + 1}. </span>{tip}
              </p>
            ))}
          </div>

          <button onClick={next} className="btn-duo w-full py-2.5 text-sm">
            {isLast ? '🏁 SONUCU GÖR' : 'DEVAM →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Daily Stats Screen ─────────────────────────────────────────────────────────
function DailyStatsScreen({ examData, onBack }: { examData: ExamData; onBack: () => void }) {
  const tp       = getTrainingProgress()
  const todayLog = getTodayLog()
  const last7    = getLast7DaysLogs()
  const meta     = examData.meta

  const totalAttempts = Object.values(tp.sectionStats).reduce((a, s) => a + s.attempts, 0)
  const totalCorrect  = Object.values(tp.sectionStats).reduce((a, s) => a + s.correct, 0)
  const overallAcc    = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  const dayLabels = last7.map(l => {
    const d = new Date(l.date + 'T00:00:00')
    return ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'][d.getDay()]
  })
  const maxQ = Math.max(...last7.map(l => l.questionsAnswered), 1)

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onBack} className="text-[#AFAFAF] text-xl font-black">‹</button>
        <h1 className="text-xl font-black text-[#3C3C3C]">📊 İstatistikler</h1>
      </div>

      {/* Exam baseline */}
      <div className="card p-4 border-b-4 border-[#1CB0F6] space-y-2">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">YDS 2026 Sınav 1 — Başlangıç Noktası</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xl font-black text-[#3C3C3C]">{meta.yds_score}</div>
            <div className="text-[10px] font-black text-[#AFAFAF]">PUAN</div>
          </div>
          <div>
            <div className="text-xl font-black text-[#3C3C3C]">{meta.total_correct}/80</div>
            <div className="text-[10px] font-black text-[#AFAFAF]">DOĞRU</div>
          </div>
          <div>
            <div className="text-xl font-black text-[#FF4B4B]">{meta.additional_correct_needed}</div>
            <div className="text-[10px] font-black text-[#AFAFAF]">EKSİK</div>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="card p-4 border-b-4 border-[#58CC02] space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Bugün</p>
        {todayLog ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { icon: '📝', val: todayLog.questionsAnswered, label: 'Soru' },
              { icon: '✅', val: todayLog.correct,          label: 'Doğru' },
              { icon: '❌', val: todayLog.wrong,            label: 'Yanlış' },
              { icon: '⭐', val: todayLog.xpEarned,        label: 'XP' },
            ].map(s => (
              <div key={s.label} className="space-y-0.5">
                <div className="text-lg">{s.icon}</div>
                <div className="text-base font-black text-[#3C3C3C]">{s.val}</div>
                <div className="text-[10px] font-bold text-[#AFAFAF]">{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-[#AFAFAF] text-center py-2">Bugün henüz antrenman yapmadın 💤</p>
        )}
        {todayLog?.sectionsStudied && todayLog.sectionsStudied.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {todayLog.sectionsStudied.map(s => (
              <span key={s} className="text-xs font-bold bg-[#D7FFB8] text-[#46A302] px-2 py-0.5 rounded-full">
                {SECTION_ICON[s]} {examData.section_analysis[s as SectionKey]?.section_name ?? s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 7-day bar chart */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Son 7 Gün — Soru Sayısı</p>
        <div className="flex items-end gap-2 h-20">
          {last7.map((l, i) => {
            const h = l.questionsAnswered > 0 ? Math.max(8, Math.round((l.questionsAnswered / maxQ) * 72)) : 4
            const isToday = i === 6
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${l.questionsAnswered > 0 ? (isToday ? 'bg-[#58CC02]' : 'bg-[#1CB0F6]') : 'bg-[#F0F0F0]'}`}
                  style={{ height: h }}
                />
                <span className={`text-[9px] font-black ${isToday ? 'text-[#58CC02]' : 'text-[#AFAFAF]'}`}>
                  {dayLabels[i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Overall training stats */}
      {totalAttempts > 0 && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Toplam Antrenman</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-black text-[#3C3C3C]">{totalAttempts}</div>
              <div className="text-[10px] font-black text-[#AFAFAF]">SORU</div>
            </div>
            <div>
              <div className="text-xl font-black text-[#58CC02]">{overallAcc}%</div>
              <div className="text-[10px] font-black text-[#AFAFAF]">DOĞRULUK</div>
            </div>
            <div>
              <div className="text-xl font-black text-[#FFD900]">{tp.totalTrainingXp}</div>
              <div className="text-[10px] font-black text-[#AFAFAF]">XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Per-section training progress */}
      <div className="card p-4 space-y-4">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Bölüm Bazında İlerleme</p>
        {SECTION_ORDER.map(key => {
          const sec  = examData.section_analysis[key]
          if (!sec) return null
          const stat = tp.sectionStats[key]
          const trainAcc = stat && stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : null

          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#3C3C3C]">
                  {SECTION_ICON[key]} {sec.section_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#AFAFAF]">Sınav: {sec.accuracy_pct}%</span>
                  {trainAcc !== null && (
                    <span className={`text-xs font-black ${trainAcc > sec.accuracy_pct ? 'text-[#58CC02]' : 'text-amber-500'}`}>
                      Antrenman: {trainAcc}%
                      {trainAcc > sec.accuracy_pct ? ' ↑' : ''}
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
              {trainAcc !== null && (
                <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1CB0F6] rounded-full transition-all" style={{ width: `${trainAcc}%` }} />
                </div>
              )}
              {stat && (
                <p className="text-[10px] font-bold text-[#AFAFAF]">
                  {stat.attempts} deneme · {stat.correct} doğru
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Study priority reminder */}
      <div className="card p-4 space-y-2 border-l-4 border-[#FFD900]">
        <p className="text-xs font-black text-amber-700 uppercase tracking-wide">55 Puan Planı</p>
        {meta.study_priority_order.map((item, i) => (
          <p key={i} className="text-xs font-semibold text-[#3C3C3C]">{item}</p>
        ))}
      </div>
    </div>
  )
}
