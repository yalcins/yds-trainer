'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loadData, pickQuizQuestions } from '@/lib/data'
import { getProgress, recordAnswer, finishRound } from '@/lib/store'
import type { Question } from '@/lib/types'

type Phase = 'loading' | 'question' | 'feedback' | 'results'

const CAT_BADGE: Record<string, string> = {
  VOCAB:                'bg-violet-100 text-violet-700',
  GRAMMAR:              'bg-blue-100 text-blue-700',
  PREPOSITION:          'bg-amber-100 text-amber-700',
  LINKER:               'bg-[#D7FFB8] text-[#46A302]',
  PHRASAL:              'bg-rose-100 text-rose-600',
  SENTENCE_COMPLETION:  'bg-sky-100 text-sky-700',
  CLOZE:                'bg-orange-100 text-orange-700',
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

function Confetti() {
  const colors = ['#58CC02', '#FFD900', '#FF4B4B', '#1CB0F6', '#CE82FF', '#FF9600']
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-40">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${(i * 2.5) % 100}%`,
            top: '-20px',
            width: i % 3 === 0 ? 10 : 7,
            height: i % 3 === 0 ? 10 : 7,
            borderRadius: i % 2 === 0 ? '50%' : '2px',
            background: colors[i % colors.length],
            animation: `confetti-fall ${1.2 + (i % 5) * 0.3}s ease-in ${(i % 10) * 0.1}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex]   = useState(0)
  const [phase, setPhase]   = useState<Phase>('loading')
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore]   = useState(0)
  const [hearts, setHearts] = useState(3)
  const [xpEarned, setXpEarned] = useState(0)
  const [showXP, setShowXP] = useState(false)
  const [optAnim, setOptAnim] = useState<Record<string, string>>({})

  const q = questions[index]

  const loadQuestions = () => {
    loadData().then(data => {
      const p = getProgress()
      const qs = pickQuizQuestions(data, 5, p.questionStats) as Question[]
      setQuestions(qs)
      setPhase('question')
    })
  }

  useEffect(() => { loadQuestions() }, [])

  const handleSelect = useCallback((opt: string) => {
    if (phase !== 'question') return
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
      setIndex(i => i + 1)
      setPhase('question')
    }
  }

  const restart = () => {
    setIndex(0); setScore(0); setHearts(3); setXpEarned(0)
    setSelected(null); setOptAnim({}); setPhase('loading')
    loadQuestions()
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8]">
        <div className="text-6xl animate-bounce">⚡</div>
      </div>
    )
  }

  if (phase === 'results') {
    const perfect = score === questions.length
    const good    = score >= Math.ceil(questions.length / 2)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-5 bg-[#F0F4F8] relative overflow-hidden">
        {perfect && <Confetti />}

        <div className="text-8xl animate-pop-in">{perfect ? '🏆' : good ? '🎉' : '💪'}</div>

        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-[#3C3C3C]">{score}/{questions.length} Doğru!</h2>
          <p className="text-[#AFAFAF] font-semibold">
            {perfect ? 'Mükemmel! Tüm soruları bitirdin!' : good ? 'İyi iş! Devam et!' : 'Endişelenme, tekrar dene!'}
          </p>
        </div>

        <div className="card px-8 py-5 text-center border-b-4 border-[#CE9B00]" style={{ background: '#FFD900' }}>
          <p className="text-4xl font-black text-[#3C3C3C] animate-xp-appear">+{xpEarned} XP</p>
          <p className="text-sm font-bold text-[#3C3C3C]/60 uppercase tracking-wide">kazandın!</p>
        </div>

        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={() => router.push('/')} className="btn-duo btn-duo-ghost flex-1">
            Ana Sayfa
          </button>
          <button onClick={restart} className="btn-duo flex-1">
            Tekrar ⚡
          </button>
        </div>
      </div>
    )
  }

  const opts      = Object.entries(q.options)
  const isCorrect = selected === q.correct_answer
  const progress  = ((index + (phase === 'feedback' ? 1 : 0)) / questions.length) * 100

  const optStyle = (k: string) => {
    const base = 'w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all border-2 border-b-4'
    if (phase === 'feedback') {
      if (k === q.correct_answer) return `${base} border-[#58CC02] bg-[#D7FFB8] text-[#46A302] border-b-[#46A302]`
      if (k === selected)         return `${base} border-[#FF4B4B] bg-red-50 text-[#FF4B4B] border-b-[#EA2B2B]`
      return `${base} border-[#E5E5E5] bg-white text-[#CCCCCC] border-b-[#E5E5E5]`
    }
    return `${base} border-[#E5E5E5] bg-white text-[#3C3C3C] border-b-[#CCCCCC] active:border-b-[#E5E5E5] active:translate-y-[2px]`
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F4F8]">
      {/* Top bar */}
      <div className="px-4 pt-10 pb-4 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button onClick={() => router.push('/')} className="text-[#AFAFAF] text-xl font-black p-1 leading-none">✕</button>
        <div className="flex-1 h-4 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#58CC02] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <Hearts count={hearts} />
      </div>

      {/* Question area */}
      <div className="flex-1 px-4 max-w-lg mx-auto w-full">
        {/* Category badge */}
        <span className={`inline-block text-xs font-black px-3 py-1 rounded-full mb-4 ${CAT_BADGE[q.category] ?? 'bg-gray-100 text-gray-600'}`}>
          {q.category}
        </span>

        {/* Question card */}
        <div className="card p-5 mb-5 border-b-4 border-[#E5E5E5]">
          {q.passage && (
            <div className="mb-3 p-3 bg-orange-50 rounded-xl border-l-4 border-orange-300 text-sm text-[#3C3C3C]/80 font-semibold leading-relaxed italic">
              {q.passage}
            </div>
          )}
          <p className="text-base font-bold leading-relaxed text-[#3C3C3C]">
            {q.question_text}
          </p>
        </div>

        {/* Options */}
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
      </div>

      {/* Floating XP */}
      {showXP && (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 text-3xl font-black text-[#58CC02] animate-float-up pointer-events-none z-50 drop-shadow-lg">
          +10 XP ⭐
        </div>
      )}

      {/* Feedback panel */}
      {phase === 'feedback' && (
        <div
          className={`px-4 pt-5 pb-6 safe-bottom animate-slide-up ${isCorrect ? 'bg-[#D7FFB8]' : 'bg-red-50'}`}
        >
          <div className="max-w-lg mx-auto space-y-2">
            <p className={`text-xl font-black ${isCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              {isCorrect
                ? '✓ Harika!'
                : `✗ Doğru: ${q.correct_answer}) ${q.options[q.correct_answer as keyof typeof q.options]}`}
            </p>
            {q.short_explanation && (
              <p className="text-sm font-semibold text-[#3C3C3C]/75">{q.short_explanation}</p>
            )}
            {q.trap && (
              <p className="text-xs text-[#3C3C3C]/55 font-semibold">💡 {q.trap}</p>
            )}
            <button
              onClick={handleNext}
              className={`btn-duo mt-3 ${isCorrect ? '' : 'btn-duo-red'}`}
            >
              {index + 1 >= questions.length ? 'SONUÇLARI GÖR 🏁' : 'DEVAM ET →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
