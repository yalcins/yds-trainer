'use client'
import { useEffect, useState, useRef } from 'react'
import type { ExamData, ExamQuestion } from '@/lib/types'
import {
  getAdaptiveStore, recordAnswer, startSession, finishSession,
  getUserLevel, classifyError, getErrorTypeLabel,
  type Confidence, type AdaptiveStore,
} from '@/lib/adaptive-store'
import { buildDailySession, buildWhyNot, xpForAnswer } from '@/lib/adaptive-engine'

// ── Types ──────────────────────────────────────────────────────────────────────
type Screen = 'intro' | 'question' | 'result'

// ── Component ──────────────────────────────────────────────────────────────────
export default function PracticePage() {
  const [exam, setExam]       = useState<ExamData | null>(null)
  const [store, setStore]     = useState<AdaptiveStore | null>(null)
  const [screen, setScreen]   = useState<Screen>('intro')
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [goldenFive, setGoldenFive] = useState<string[]>([])
  const [idx, setIdx]         = useState(0)
  const [answers, setAnswers] = useState<Record<number, { answer: string; correct: boolean; confidence: Confidence }>>({})

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then((d: ExamData) => {
      setExam(d)
      const s = getAdaptiveStore()
      setStore(s)
    })
  }, [])

  function buildSession(examData: ExamData, s: AdaptiveStore) {
    const { questionIds, goldenFive: gf } = buildDailySession(examData, s)
    const qs = questionIds
      .map(id => examData.questions.find(q => q.question_number === id))
      .filter(Boolean) as ExamQuestion[]
    setQuestions(qs)
    setGoldenFive(gf)
    startSession(questionIds, gf)
    setIdx(0)
    setAnswers({})
    setScreen('question')
  }

  function onAnswer(questionId: number, answer: string, correct: boolean, confidence: Confidence) {
    const q = questions[idx]
    const newStore = recordAnswer({
      questionId,
      sectionKey: q.section_key,
      selectedAnswer: answer,
      correctAnswer: q.correct_answer,
      isCorrect: correct,
      confidence,
      patterns: q.common_patterns,
    })
    setStore(newStore)
    setAnswers(prev => ({ ...prev, [questionId]: { answer, correct, confidence } }))
  }

  function onNext() {
    if (idx >= questions.length - 1) {
      finishSession()
      setScreen('result')
    } else {
      setIdx(i => i + 1)
    }
  }

  if (!exam || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-5xl animate-bounce">⚡</div>
        <p className="font-bold text-[#AFAFAF]">Hazırlanıyor...</p>
      </div>
    )
  }

  if (screen === 'intro') {
    return <IntroScreen exam={exam} store={store} onStart={() => buildSession(exam, store)} />
  }

  if (screen === 'result') {
    const allAnswers = Object.values(answers)
    return (
      <ResultScreen
        exam={exam}
        questions={questions}
        answers={answers}
        goldenFive={goldenFive}
        onRetry={() => buildSession(exam, store)}
      />
    )
  }

  const q = questions[idx]
  if (!q) return null

  return (
    <QuestionScreen
      question={q}
      idx={idx}
      total={questions.length}
      sessionAnswers={answers}
      onAnswer={onAnswer}
      onNext={onNext}
    />
  )
}

// ── Intro Screen ───────────────────────────────────────────────────────────────
function IntroScreen({ exam, store, onStart }: { exam: ExamData; store: AdaptiveStore; onStart: () => void }) {
  const meta = exam.meta
  const weakSections = Object.entries(exam.section_analysis)
    .sort((a, b) => a[1].accuracy_pct - b[1].accuracy_pct)
    .slice(0, 3)

  const reviewCount = Object.values(store.questionReviews).filter(r => {
    const t = new Date().toISOString().slice(0, 10)
    return !r.mastered && r.nextReviewDate <= t
  }).length

  return (
    <div className="space-y-5 pb-4">
      <div className="pt-1">
        <h1 className="text-2xl font-black text-[#3C3C3C]">⚡ Günlük Antrenman</h1>
        <p className="text-xs font-bold text-[#AFAFAF]">Adaptif 15 soru · hedef: 55 puan</p>
      </div>

      {/* Session preview */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Bu oturumda</p>
        {[
          { icon: '🧩', label: '5 soru', sub: 'Zayıf bölümlerden (öncelikli)', color: 'text-[#FF4B4B]' },
          { icon: '❌', label: '4 soru', sub: 'Önceki yanlışlardan', color: 'text-orange-500' },
          { icon: '📝', label: '3 soru', sub: 'Kelime / kalıp pratiği', color: 'text-[#1CB0F6]' },
          { icon: '🔄', label: '3 soru', sub: `Tekrar kuyruğu (${reviewCount} bekliyor)`, color: 'text-[#58CC02]' },
        ].map(r => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="text-xl w-7">{r.icon}</span>
            <div className="flex-1">
              <span className={`text-sm font-black ${r.color}`}>{r.label}</span>
              <span className="text-sm font-semibold text-[#AFAFAF]"> — {r.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Confidence guide */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Güven Sistemi</p>
        <p className="text-xs font-semibold text-[#AFAFAF]">Her sorudan sonra ne kadar emin olduğunu belirt:</p>
        {[
          { c: '😰', label: 'Düşük',  sub: 'Tahmin ettim / emin değildim' },
          { c: '🤔', label: 'Orta',   sub: 'Aklımda birkaç seçenek vardı' },
          { c: '💪', label: 'Yüksek', sub: 'Eminidim, kalıbı biliyorum' },
        ].map(g => (
          <div key={g.label} className="flex items-center gap-3">
            <span className="text-xl">{g.c}</span>
            <div>
              <span className="text-sm font-black text-[#3C3C3C]">{g.label} </span>
              <span className="text-sm font-semibold text-[#AFAFAF]">— {g.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Weakest focus */}
      <div className="card p-4 space-y-2 border-l-4 border-[#FF4B4B]">
        <p className="text-xs font-black text-[#FF4B4B] uppercase tracking-wide">Odak Alanları</p>
        {weakSections.map(([k, s]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#3C3C3C]">{s.section_name}</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${s.accuracy_pct < 35 ? 'bg-red-100 text-[#FF4B4B]' : 'bg-amber-100 text-amber-600'}`}>
              {s.accuracy_pct}%
            </span>
          </div>
        ))}
      </div>

      <button onClick={onStart} className="btn-duo py-4 text-base">
        🎯 ANTRENMANA BAŞLA
      </button>
    </div>
  )
}

// ── Question Screen ────────────────────────────────────────────────────────────
function QuestionScreen({
  question: q, idx, total, sessionAnswers, onAnswer, onNext,
}: {
  question: ExamQuestion
  idx: number
  total: number
  sessionAnswers: Record<number, any>
  onAnswer: (qId: number, answer: string, correct: boolean, conf: Confidence) => void
  onNext: () => void
}) {
  const [selected, setSelected]   = useState<string | null>(null)
  const [confidence, setConf]     = useState<Confidence | null>(null)
  const [revealed, setRevealed]   = useState(false)
  const [showWhyNot, setShowWhy]  = useState(false)
  const [xpAnim, setXpAnim]       = useState(false)
  const [shake, setShake]         = useState(false)

  // Reset on question change
  useEffect(() => {
    setSelected(null)
    setConf(null)
    setRevealed(false)
    setShowWhy(false)
  }, [idx])

  const opts    = Object.entries(q.options)
  const isWrong = !q.is_correct  // was wrong in original exam

  function pick(opt: string) {
    if (revealed) return
    setSelected(opt)
  }

  function confirmAnswer() {
    if (!selected || revealed) return
    const correct = selected === q.correct_answer
    setRevealed(true)
    if (correct) {
      setXpAnim(true)
      setTimeout(() => setXpAnim(false), 1500)
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  function submitConfidence(c: Confidence) {
    if (!selected) return
    setConf(c)
    const correct = selected === q.correct_answer
    onAnswer(q.question_number, selected, correct, c)
  }

  const whyNot = revealed && selected ? buildWhyNot(q, selected) : null

  const optStyle = (opt: string) => {
    if (!revealed) {
      return selected === opt
        ? 'border-[#1CB0F6] bg-blue-50 text-[#1CB0F6]'
        : 'border-[#E5E5E5] bg-white text-[#3C3C3C]'
    }
    if (opt === q.correct_answer) return 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302]'
    if (opt === selected && opt !== q.correct_answer) return 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
    return 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]'
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-[#AFAFAF]">Soru {idx + 1}/{total}</span>
            <div className="flex items-center gap-2">
              {isWrong && (
                <span className="text-[10px] font-black bg-red-100 text-[#FF4B4B] px-2 py-0.5 rounded-full">
                  ❌ Sınavda yanlış
                </span>
              )}
              <span className="text-xs font-black text-[#AFAFAF]">{q.section_name}</span>
            </div>
          </div>
          <div className="h-2 bg-[#F0F0F0] rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* XP float */}
      {xpAnim && (
        <div className="fixed top-16 right-4 z-50 animate-float-up pointer-events-none">
          <span className="text-base font-black text-[#58CC02] bg-white rounded-2xl px-3 py-1.5 border-2 border-[#58CC02] shadow-lg">
            +15 XP ⭐
          </span>
        </div>
      )}

      {/* Question card */}
      <div className={`card p-5 space-y-1 ${shake ? 'animate-shake' : ''}`}>
        <span className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wide">
          Soru {q.question_number}
        </span>
        <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">
          {q.question_text || '(Soru metni yükleniyor...)'}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {opts.length > 0 ? opts.map(([letter, text]) => (
          <button
            key={letter}
            onClick={() => pick(letter)}
            className={`w-full text-left p-4 rounded-2xl border-2 border-b-4 text-sm font-semibold transition-all active:translate-y-[2px] active:border-b-[1px] ${optStyle(letter)}`}
          >
            <span className="font-black mr-2">{letter})</span>{text}
          </button>
        )) : ['A','B','C','D','E'].map(letter => (
          <button
            key={letter}
            onClick={() => pick(letter)}
            className={`w-full text-left p-4 rounded-2xl border-2 border-b-4 text-sm font-semibold transition-all ${optStyle(letter)}`}
          >
            <span className="font-black">{letter})</span>
          </button>
        ))}
      </div>

      {/* Confirm button (before reveal) */}
      {!revealed && selected && (
        <button onClick={confirmAnswer} className="btn-duo py-3 animate-pop-in">
          ✓ CEVABI ONAYLA
        </button>
      )}

      {/* After reveal: confidence + feedback */}
      {revealed && (
        <div className={`card p-4 space-y-4 animate-slide-up border-l-4 ${selected === q.correct_answer ? 'border-[#58CC02]' : 'border-[#FF4B4B]'}`}>
          {/* Result */}
          <div className={`text-base font-black ${selected === q.correct_answer ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
            {selected === q.correct_answer ? '✅ Doğru!' : `❌ Yanlış — Doğru cevap: ${q.correct_answer})`}
          </div>

          {/* Confidence buttons (before submitting) */}
          {!confidence && (
            <div className="space-y-2">
              <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Ne kadar emindın?</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { c: 'low'    as Confidence, icon: '😰', label: 'Düşük' },
                  { c: 'medium' as Confidence, icon: '🤔', label: 'Orta'  },
                  { c: 'high'   as Confidence, icon: '💪', label: 'Yüksek'},
                ] as const).map(({ c, icon, label }) => (
                  <button
                    key={c}
                    onClick={() => submitConfidence(c)}
                    className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 border-[#E5E5E5] border-b-4 active:translate-y-[2px] active:border-b-[1px] bg-white transition-all"
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-xs font-black text-[#3C3C3C]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error type badge after confidence */}
          {confidence && (() => {
            const et = classifyError(confidence, selected === q.correct_answer)
            const { label, color, icon } = getErrorTypeLabel(et)
            return (
              <div className={`flex items-center gap-2 text-sm font-black ${color}`}>
                <span>{icon}</span> {label}
              </div>
            )
          })()}

          {/* Why Not? */}
          {confidence && (
            <div className="space-y-2">
              <button
                onClick={() => setShowWhy(v => !v)}
                className="text-xs font-black text-[#1CB0F6] underline"
              >
                {showWhyNot ? '▲ Gizle' : '▼ Neden bu cevap? (Why Not?)'}
              </button>
              {showWhyNot && whyNot && (
                <div className="space-y-2 animate-slide-up">
                  {whyNot.wrong && (
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{whyNot.wrong}</p>
                    </div>
                  )}
                  <div className="bg-[#F0FFF0] rounded-xl p-3">
                    <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{whyNot.correct}</p>
                  </div>
                  <div className="bg-[#FFF9DB] rounded-xl p-3">
                    <p className="text-[10px] font-black text-amber-700 uppercase mb-1">Karar Kuralı</p>
                    <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{whyNot.rule}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips (always show 1) */}
          {confidence && q.how_to_solve_this_type?.[0] && (
            <div className="bg-[#F8F8F8] rounded-xl p-3">
              <p className="text-[10px] font-black text-[#AFAFAF] uppercase mb-1">💡 İpucu</p>
              <p className="text-xs font-semibold text-[#3C3C3C]">{q.how_to_solve_this_type[0]}</p>
            </div>
          )}

          {/* Next button */}
          {confidence && (
            <button onClick={onNext} className="btn-duo py-3 animate-bounce-in">
              {idx < 14 ? 'DEVAM →' : '🏁 SONUCU GÖR'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Result Screen ──────────────────────────────────────────────────────────────
function ResultScreen({
  exam, questions, answers, goldenFive, onRetry,
}: {
  exam: ExamData
  questions: ExamQuestion[]
  answers: Record<number, { answer: string; correct: boolean; confidence: Confidence }>
  goldenFive: string[]
  onRetry: () => void
}) {
  const total   = questions.length
  const correct = Object.values(answers).filter(a => a.correct).length
  const acc     = total ? Math.round((correct / total) * 100) : 0
  const xp      = Object.entries(answers).reduce((sum, [id, a]) => {
    return sum + xpForAnswer(a.correct, a.confidence, !questions.find(q => q.question_number === Number(id))?.is_correct)
  }, 0)

  // Dangerous misconceptions this session
  const dangerous = Object.entries(answers)
    .filter(([, a]) => !a.correct && a.confidence === 'high')
    .map(([id]) => questions.find(q => q.question_number === Number(id)))
    .filter(Boolean) as ExamQuestion[]

  // Section breakdown
  const sectionBreakdown: Record<string, { correct: number; total: number }> = {}
  for (const q of questions) {
    const a = answers[q.question_number]
    if (!sectionBreakdown[q.section_key]) sectionBreakdown[q.section_key] = { correct: 0, total: 0 }
    sectionBreakdown[q.section_key].total += 1
    if (a?.correct) sectionBreakdown[q.section_key].correct += 1
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Big result */}
      <div className="text-center space-y-2 pt-2">
        <div className="text-5xl animate-bounce-in">{acc >= 80 ? '🏆' : acc >= 60 ? '💪' : acc >= 40 ? '📚' : '🔄'}</div>
        <h1 className="text-2xl font-black text-[#3C3C3C]">Antrenman Bitti!</h1>
      </div>

      {/* Stats */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-black text-[#58CC02]">{correct}</div>
            <div className="text-[10px] font-black text-[#AFAFAF] uppercase">Doğru</div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#FF4B4B]">{total - correct}</div>
            <div className="text-[10px] font-black text-[#AFAFAF] uppercase">Yanlış</div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-500">{acc}%</div>
            <div className="text-[10px] font-black text-[#AFAFAF] uppercase">Başarı</div>
          </div>
        </div>
        <div className="h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div className="h-full bg-[#58CC02] rounded-full transition-all duration-1000" style={{ width: `${acc}%` }} />
        </div>
        <div className="flex items-center justify-center gap-2 py-2 bg-[#FFF9DB] rounded-2xl">
          <span className="text-2xl">⭐</span>
          <span className="text-xl font-black text-amber-600">+{xp} XP kazandın!</span>
        </div>
      </div>

      {/* Dangerous misconceptions alert */}
      {dangerous.length > 0 && (
        <div className="card p-4 space-y-3 border-l-4 border-[#FF4B4B]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <p className="text-sm font-black text-[#FF4B4B]">
              {dangerous.length} Tehlikeli Yanılgı — yüksek güvenle yanlış!
            </p>
          </div>
          {dangerous.map(q => (
            <div key={q.question_number} className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-[#3C3C3C] line-clamp-2">{q.question_text?.slice(0, 80)}...</p>
              <p className="text-[10px] font-black text-[#FF4B4B] mt-1">
                Doğru: {q.correct_answer}) {q.options[q.correct_answer] ?? q.correct_option_text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Section breakdown */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Bu Oturumda Bölümler</p>
        {Object.entries(sectionBreakdown).map(([key, s]) => {
          const secName = (exam.section_analysis as Record<string, any>)[key]?.section_name ?? key
          const pct = Math.round((s.correct / s.total) * 100)
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-[#3C3C3C]">
                <span>{secName}</span>
                <span className={pct >= 60 ? 'text-[#58CC02]' : 'text-[#FF4B4B]'}>{s.correct}/{s.total}</span>
              </div>
              <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${pct >= 60 ? 'bg-[#58CC02]' : pct >= 40 ? 'bg-amber-400' : 'bg-[#FF4B4B]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Golden 5 */}
      {goldenFive.length > 0 && (
        <div className="card p-4 space-y-3 border-b-4 border-[#FFD900]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <p className="text-sm font-black text-[#3C3C3C]">Altın 5 — Bugün bunları ezberle!</p>
          </div>
          <div className="space-y-2">
            {goldenFive.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#FFF9DB] rounded-xl px-3 py-2">
                <span className="text-sm font-black text-amber-600">{i + 1}.</span>
                <span className="text-sm font-semibold text-[#3C3C3C]">{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback message */}
      <div className="card p-4 border-l-4 border-[#1CB0F6]">
        <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">
          {acc >= 80
            ? '🔥 Mükemmel! Bu hızla gidersen 55 puanı yakında alacaksın.'
            : acc >= 60
            ? '💪 İyi ilerliyorsun. Yanlışlarını Hata Bankasından tekrar gözden geçir.'
            : '📚 Henüz düşük ama bu normal — hatalı sorular tekrar karşına çıkacak. Devam et!'}
        </p>
      </div>

      <div className="flex gap-3">
        <a href="/" className="btn-duo btn-duo-ghost flex-1 py-3 text-center block">
          🏠 ANA EKRAN
        </a>
        <button onClick={onRetry} className="btn-duo flex-1 py-3">
          🔄 YENİ OTURUM
        </button>
      </div>
    </div>
  )
}
