'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loadData, pickQuizQuestions } from '@/lib/data'
import { getProgress, recordAnswer, finishRound } from '@/lib/store'
import type { Question } from '@/lib/types'

type LogicType = 'contrast' | 'cause' | 'result' | 'continuation'
type Direction  = 'same' | 'opposite' | 'result'
type Phase = 'loading' | 'logic-type' | 'direction' | 'options' | 'feedback' | 'results'

const LOGIC_OPTS: { value: LogicType; label: string; icon: string; desc: string }[] = [
  { value: 'contrast',     label: 'Zıtlık',    icon: '↩️', desc: 'Karşıt / beklenmedik bilgi' },
  { value: 'cause',        label: 'Neden',     icon: '🔍', desc: 'Bir şeyin gerekçesi/nedeni' },
  { value: 'result',       label: 'Sonuç',     icon: '➡️', desc: 'Önceki bilginin çıkarımı' },
  { value: 'continuation', label: 'Devam',     icon: '➕', desc: 'Ek bilgi / aynı yönde' },
]

const DIR_OPTS: { value: Direction; label: string; icon: string; desc: string }[] = [
  { value: 'opposite', label: 'Zıt Yön',        icon: '↩️', desc: 'İkinci cümle birincinin tersine gider' },
  { value: 'result',   label: 'Neden → Sonuç',  icon: '⚡', desc: 'Cümleler arasında neden-sonuç ilişkisi' },
  { value: 'same',     label: 'Aynı Yön',        icon: '↔️', desc: 'Aynı yönde ek bilgi sunar' },
]

function getCorrectLogicType(pattern: string): LogicType {
  const p = pattern.toLowerCase()
  if (p.includes('result') || p.includes('consequence') || p.includes('otherwise')) return 'result'
  if (p.includes('caus') || p.includes('because')) return 'cause'
  if (
    p.includes('contrast') || p.includes('concess') || p.includes('adversat') ||
    p.includes('substitut') || p.includes('prefer') || p.includes('rather')
  ) return 'contrast'
  return 'continuation'
}

function getCorrectDirection(logicType: LogicType): Direction {
  if (logicType === 'contrast') return 'opposite'
  if (logicType === 'cause' || logicType === 'result') return 'result'
  return 'same'
}

function logicInfo(t: LogicType) { return LOGIC_OPTS.find(o => o.value === t) ?? LOGIC_OPTS[0] }
function dirInfo(d: Direction)   { return DIR_OPTS.find(o => o.value === d) ?? DIR_OPTS[0] }

function getMismatchMsg(userLogic: LogicType, correctLogic: LogicType): string {
  if (userLogic === correctLogic) return ''
  const cl = logicInfo(correctLogic).label
  const ul = logicInfo(userLogic).label
  const map: Partial<Record<string, string>> = {
    'contrast_result':      `"${ul}" seçtin ama cümle "Sonuç" gerektiriyor — ikinci cümle birincinin mantıksal çıkarımı.`,
    'contrast_cause':       `"${ul}" seçtin ama cümle "Neden" gerektiriyor — ikinci cümle birincinin gerekçesini açıklıyor.`,
    'contrast_continuation':`"${ul}" seçtin ama cümle "Devam" gerektiriyor — iki cümle aynı yönde ilerliyor.`,
    'cause_contrast':       `"${ul}" seçtin ama cümle "Zıtlık" gerektiriyor — ikinci cümle beklenmedik/karşıt bir bilgi sunuyor.`,
    'cause_result':         `"${ul}" seçtin ama cümle "Sonuç" gerektiriyor — ikinci cümle nedenin çıkarımıdır.`,
    'cause_continuation':   `"${ul}" seçtin ama cümle "Devam" gerektiriyor — iki cümle aynı yönde ilerliyor.`,
    'result_contrast':      `"${ul}" seçtin ama cümle "Zıtlık" gerektiriyor — ikinci cümle birincinin tersine gidiyor.`,
    'result_cause':         `"${ul}" seçtin ama cümle "Neden" gerektiriyor — ikinci cümle birincinin nedenini açıklıyor.`,
    'result_continuation':  `"${ul}" seçtin ama cümle "Devam" gerektiriyor — ikinci cümle ek bilgi sunuyor.`,
    'continuation_contrast':`"${ul}" seçtin ama cümle "Zıtlık" gerektiriyor — iki cümle arasında bir karşıtlık var.`,
    'continuation_cause':   `"${ul}" seçtin ama cümle "Neden" gerektiriyor — ikinci cümle birincinin nedenini veriyor.`,
    'continuation_result':  `"${ul}" seçtin ama cümle "Sonuç" gerektiriyor — ikinci cümle birincinin mantıksal çıkarımı.`,
  }
  return map[`${userLogic}_${correctLogic}`] ?? `"${ul}" seçtin ama cümle "${cl}" gerektiriyor.`
}

function Hearts({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map(i => (
        <span key={i} className={`text-xl leading-none transition-all duration-300 ${i >= count ? 'opacity-25 grayscale' : ''}`}>
          ❤️
        </span>
      ))}
    </div>
  )
}

interface ChoiceButtonProps {
  label: string
  icon: string
  desc: string
  onClick: () => void
}

function ChoiceButton({ label, icon, desc, onClick }: ChoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-2xl border-2 border-b-4 font-bold transition-all border-[#E5E5E5] border-b-[#CCCCCC] bg-white text-[#3C3C3C] active:translate-y-[2px] active:border-b-[2px]"
    >
      <span className="mr-2">{icon}</span>
      <span className="text-sm">{label}</span>
      <span className="block text-xs font-semibold opacity-60 mt-0.5 ml-6">{desc}</span>
    </button>
  )
}

export default function LinkerPage() {
  const router = useRouter()
  const [questions, setQuestions]         = useState<Question[]>([])
  const [index, setIndex]                 = useState(0)
  const [phase, setPhase]                 = useState<Phase>('loading')
  const [userLogic, setUserLogic]         = useState<LogicType | null>(null)
  const [userDirection, setUserDirection] = useState<Direction | null>(null)
  const [selected, setSelected]           = useState<string | null>(null)
  const [score, setScore]                 = useState(0)
  const [hearts, setHearts]               = useState(3)
  const [xpEarned, setXpEarned]           = useState(0)
  const [showXP, setShowXP]               = useState(false)
  const [optAnim, setOptAnim]             = useState<Record<string, string>>({})

  const q = questions[index]

  const loadQuestions = useCallback(() => {
    loadData().then(data => {
      const p = getProgress()
      const linkerOnly = {
        ...data,
        questions: data.questions.filter(q => q.category === 'LINKER'),
        generated_questions: data.generated_questions.filter(g => g.category === 'LINKER'),
      }
      const qs = pickQuizQuestions(linkerOnly, 5, p.questionStats) as Question[]
      setQuestions(qs)
      setPhase('logic-type')
    })
  }, [])

  useEffect(() => { loadQuestions() }, [loadQuestions])

  const handleLogicPick = (choice: LogicType) => {
    setUserLogic(choice)
    setPhase('direction')
  }

  const handleDirectionPick = (choice: Direction) => {
    setUserDirection(choice)
    setPhase('options')
  }

  const handleSelect = useCallback((opt: string) => {
    if (phase !== 'options') return
    setSelected(opt)
    setPhase('feedback')
    const correct = opt === q.correct_answer
    recordAnswer(q.id, correct)
    if (correct) {
      setScore(s => s + 1)
      setXpEarned(x => x + 10)
      setOptAnim({ [opt]: 'animate-bounce-in' })
      setShowXP(true)
      setTimeout(() => setShowXP(false), 1100)
    } else {
      setHearts(h => Math.max(0, h - 1))
      setOptAnim({ [opt]: 'animate-shake' })
    }
  }, [phase, q])

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      finishRound()
      setPhase('results')
    } else {
      setSelected(null)
      setOptAnim({})
      setUserLogic(null)
      setUserDirection(null)
      setIndex(i => i + 1)
      setPhase('logic-type')
    }
  }

  const restart = () => {
    setIndex(0)
    setScore(0)
    setHearts(3)
    setXpEarned(0)
    setSelected(null)
    setOptAnim({})
    setUserLogic(null)
    setUserDirection(null)
    setPhase('loading')
    loadQuestions()
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8]">
        <div className="text-6xl animate-bounce">🔗</div>
      </div>
    )
  }

  if (phase === 'results') {
    const perfect = score === questions.length
    const good    = score >= Math.ceil(questions.length / 2)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 bg-[#F0F4F8]">
        <div className="text-8xl animate-pop-in">{perfect ? '🏆' : good ? '🎉' : '💪'}</div>
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-[#3C3C3C]">{score}/{questions.length} Doğru!</h2>
          <p className="text-[#AFAFAF] font-semibold">
            {perfect ? 'Mükemmel! Tüm bağlaçları çözdün!' : good ? 'İyi iş! Devam et!' : 'Endişelenme, tekrar dene!'}
          </p>
        </div>
        <div className="card px-8 py-5 text-center border-b-4 border-[#CE9B00]" style={{ background: '#FFD900' }}>
          <p className="text-4xl font-black text-[#3C3C3C] animate-xp-appear">+{xpEarned} XP</p>
          <p className="text-sm font-bold text-[#3C3C3C]/60 uppercase tracking-wide">kazandın!</p>
        </div>
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={() => router.push('/')} className="btn-duo btn-duo-ghost flex-1">Ana Sayfa</button>
          <button onClick={restart} className="btn-duo flex-1">Tekrar 🔗</button>
        </div>
      </div>
    )
  }

  const opts         = Object.entries(q.options)
  const isCorrect    = selected === q.correct_answer
  const progress     = ((index + (phase === 'feedback' ? 1 : 0)) / questions.length) * 100
  const correctLogic = getCorrectLogicType(q.pattern)
  const correctDir   = getCorrectDirection(correctLogic)

  const optStyle = (k: string) => {
    const base = 'w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all border-2 border-b-4'
    if (phase === 'feedback') {
      if (k === q.correct_answer) return `${base} border-[#58CC02] bg-[#D7FFB8] text-[#46A302] border-b-[#46A302]`
      if (k === selected)         return `${base} border-[#FF4B4B] bg-red-50 text-[#FF4B4B] border-b-[#EA2B2B]`
      return `${base} border-[#E5E5E5] bg-white text-[#CCCCCC] border-b-[#E5E5E5]`
    }
    return `${base} border-[#E5E5E5] bg-white text-[#3C3C3C] border-b-[#CCCCCC] active:border-b-[#E5E5E5] active:translate-y-[2px]`
  }

  const logicMatch  = userLogic === correctLogic
  const dirMatch    = userDirection === correctDir
  const mismatchMsg = userLogic ? getMismatchMsg(userLogic, correctLogic) : ''

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F4F8]">
      {/* Top bar */}
      <div className="px-4 pt-10 pb-4 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={() => router.push('/')} className="text-[#AFAFAF] text-xl font-black p-1 leading-none">✕</button>
        <div className="flex-1 h-4 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div className="h-full bg-[#58CC02] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <Hearts count={hearts} />
      </div>

      {/* Question area */}
      <div className="flex-1 px-4 max-w-lg mx-auto w-full">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block text-xs font-black px-3 py-1 rounded-full bg-[#D7FFB8] text-[#46A302]">
            LINKER
          </span>
          {phase === 'logic-type' && (
            <span className="text-xs font-bold text-[#AFAFAF]">Adım 1/3 — Mantık Türü</span>
          )}
          {phase === 'direction' && (
            <span className="text-xs font-bold text-[#AFAFAF]">Adım 2/3 — Yön</span>
          )}
          {(phase === 'options' || phase === 'feedback') && (
            <span className="text-xs font-bold text-[#AFAFAF]">Adım 3/3 — Seçenek</span>
          )}
        </div>

        {/* Question card */}
        <div className="card p-5 mb-5 border-b-4 border-[#E5E5E5]">
          <p className="text-base font-bold leading-relaxed text-[#3C3C3C]">
            {q.question_text}
          </p>
        </div>

        {/* Phase: logic-type */}
        {phase === 'logic-type' && (
          <div className="space-y-3">
            <p className="text-sm font-black text-[#3C3C3C] mb-2">❓ Bu cümlede hangi mantık türü gerekiyor?</p>
            {LOGIC_OPTS.map(o => (
              <ChoiceButton
                key={o.value}
                label={o.label}
                icon={o.icon}
                desc={o.desc}
                onClick={() => handleLogicPick(o.value)}
              />
            ))}
          </div>
        )}

        {/* Phase: direction */}
        {phase === 'direction' && (
          <div className="space-y-3">
            <div className="card px-4 py-2 mb-3 flex items-center gap-2">
              <span className="text-xs font-bold text-[#AFAFAF]">Mantık türü tahminin:</span>
              <span className="text-sm font-black text-[#3C3C3C]">
                {logicInfo(userLogic!).icon} {logicInfo(userLogic!).label}
              </span>
            </div>
            <p className="text-sm font-black text-[#3C3C3C] mb-2">↕️ Boşluk hangi yönü gösteriyor?</p>
            {DIR_OPTS.map(o => (
              <ChoiceButton
                key={o.value}
                label={o.label}
                icon={o.icon}
                desc={o.desc}
                onClick={() => handleDirectionPick(o.value)}
              />
            ))}
          </div>
        )}

        {/* Phase: options */}
        {(phase === 'options' || phase === 'feedback') && (
          <div className="space-y-3">
            {opts.map(([k, v]) => (
              <button
                key={k}
                onClick={() => handleSelect(k)}
                disabled={phase === 'feedback'}
                className={`${optStyle(k)} ${optAnim[k] ?? ''}`}
              >
                <span className="font-black text-base opacity-50 mr-3">{k}</span>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating XP */}
      {showXP && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 text-3xl font-black text-[#58CC02] animate-float-up pointer-events-none z-50 drop-shadow-lg">
          +10 XP ⭐
        </div>
      )}

      {/* Feedback panel */}
      {phase === 'feedback' && (
        <div className={`px-4 pt-5 pb-6 safe-bottom animate-slide-up ${isCorrect ? 'bg-[#D7FFB8]' : 'bg-red-50'}`}>
          <div className="max-w-lg mx-auto space-y-3">
            {/* Answer result */}
            <p className={`text-xl font-black ${isCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              {isCorrect
                ? '✓ Harika!'
                : `✗ Doğru: ${q.correct_answer}) ${q.options[q.correct_answer as keyof typeof q.options]}`}
            </p>

            {/* Logic analysis card */}
            <div className="card p-3 space-y-2">
              <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">📊 Mantık Analizi</p>

              {/* Logic type comparison */}
              <div className="flex items-start gap-2">
                <span className={`text-base leading-tight ${logicMatch ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
                  {logicMatch ? '✓' : '✗'}
                </span>
                <div>
                  <span className="text-xs font-bold text-[#AFAFAF]">Mantık türü: </span>
                  <span className="text-xs font-black text-[#3C3C3C]">
                    {logicInfo(userLogic!).icon} {logicInfo(userLogic!).label}
                    {!logicMatch && (
                      <span className="text-[#FF4B4B]">
                        {' → doğru: '}{logicInfo(correctLogic).icon} {logicInfo(correctLogic).label}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Direction comparison */}
              <div className="flex items-start gap-2">
                <span className={`text-base leading-tight ${dirMatch ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
                  {dirMatch ? '✓' : '✗'}
                </span>
                <div>
                  <span className="text-xs font-bold text-[#AFAFAF]">Yön: </span>
                  <span className="text-xs font-black text-[#3C3C3C]">
                    {dirInfo(userDirection!).icon} {dirInfo(userDirection!).label}
                    {!dirMatch && (
                      <span className="text-[#FF4B4B]">
                        {' → doğru: '}{dirInfo(correctDir).icon} {dirInfo(correctDir).label}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Mismatch explanation */}
              {!logicMatch && mismatchMsg && (
                <p className="text-xs font-semibold text-[#FF4B4B] bg-red-50 rounded-xl px-3 py-2">
                  💡 {mismatchMsg}
                </p>
              )}
            </div>

            {q.short_explanation && (
              <p className="text-xs font-semibold text-[#3C3C3C]/75">{q.short_explanation}</p>
            )}
            {q.trap && (
              <p className="text-xs text-[#3C3C3C]/55 font-semibold">🪤 {q.trap}</p>
            )}

            <button
              onClick={handleNext}
              className={`btn-duo mt-1 ${isCorrect ? '' : 'btn-duo-red'}`}
            >
              {index + 1 >= questions.length ? 'SONUÇLARI GÖR 🏁' : 'DEVAM ET →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
