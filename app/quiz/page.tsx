'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loadData, pickQuizQuestions } from '@/lib/data'
import { getProgress, recordAnswer, finishRound } from '@/lib/store'
import type { Question } from '@/lib/types'

type Phase = 'loading' | 'question' | 'feedback' | 'results'

const CAT_COLOR: Record<string, string> = {
  VOCAB: 'bg-violet-100 text-violet-700',
  GRAMMAR: 'bg-blue-100 text-blue-700',
  PREPOSITION: 'bg-amber-100 text-amber-700',
  LINKER: 'bg-green-100 text-green-700',
  PHRASAL: 'bg-rose-100 text-rose-700',
}

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [wrongIds, setWrongIds] = useState<string[]>([])

  const q = questions[index]

  useEffect(() => {
    loadData().then(data => {
      const p = getProgress()
      const qs = pickQuizQuestions(data, 5, p.questionStats) as Question[]
      setQuestions(qs)
      setPhase('question')
    })
  }, [])

  const handleSelect = useCallback((opt: string) => {
    if (phase !== 'question') return
    setSelected(opt)
    setPhase('feedback')
    const correct = opt === q.correct_answer
    recordAnswer(q.id, correct)
    if (correct) setScore(s => s + 1)
    else setWrongIds(w => [...w, q.id])
  }, [phase, q])

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      finishRound()
      setPhase('results')
    } else {
      setSelected(null)
      setIndex(i => i + 1)
      setPhase('question')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-bounce">⚡</div>
      </div>
    )
  }

  if (phase === 'results') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
        <div className="text-6xl">{score === 5 ? '🏆' : score >= 3 ? '🎉' : '💪'}</div>
        <h2 className="text-2xl font-bold text-gray-900">
          {score} / {questions.length} doğru
        </h2>
        <p className="text-gray-500 text-center">
          {score === 5 ? 'Mükemmel! Tüm soruları doğru yanıtladın.' : score >= 3 ? 'İyi iş! Biraz daha pratik yapalım.' : 'Endişelenme, tekrar dene!'}
        </p>
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold"
          >
            Ana Sayfa
          </button>
          <button
            onClick={() => { setIndex(0); setScore(0); setWrongIds([]); setSelected(null); setPhase('loading');
              loadData().then(data => {
                const p = getProgress()
                const qs = pickQuizQuestions(data, 5, p.questionStats) as Question[]
                setQuestions(qs)
                setPhase('question')
              })
            }}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            Tekrar ⚡
          </button>
        </div>
      </div>
    )
  }

  const opts = Object.entries(q.options)
  const isCorrect = selected === q.correct_answer

  const optClass = (key: string) => {
    const base = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all'
    if (phase === 'feedback') {
      if (key === q.correct_answer) return `${base} border-green-500 bg-green-50 text-green-800`
      if (key === selected) return `${base} border-red-400 bg-red-50 text-red-700`
      return `${base} border-gray-200 bg-gray-50 text-gray-400`
    }
    return `${base} border-gray-200 bg-white active:scale-98 hover:border-indigo-300 hover:bg-indigo-50 text-gray-800`
  }

  return (
    <div className="min-h-screen flex flex-col pb-4">
      {/* Progress */}
      <div className="max-w-lg mx-auto w-full px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/')} className="text-gray-400 text-xl">✕</button>
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${((index + (phase === 'feedback' ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-500">{index + 1}/{questions.length}</span>
        </div>

        {/* Category badge */}
        <div className="mb-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${CAT_COLOR[q.category] ?? 'bg-gray-100 text-gray-600'}`}>
            {q.category} · Zorluk {q.difficulty}
          </span>
        </div>

        {/* Question */}
        <div className="card p-5 mb-5">
          <p className="text-base leading-relaxed text-gray-900">
            {q.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {opts.map(([k, v]) => (
            <button key={k} className={optClass(k)} onClick={() => handleSelect(k)} disabled={phase === 'feedback'}>
              <span className="font-bold text-indigo-500 mr-2">{k})</span> {v}
            </button>
          ))}
        </div>

        {/* Feedback panel */}
        {phase === 'feedback' && (
          <div className={`mt-5 rounded-2xl p-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`font-bold text-base mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✅ Doğru!' : `❌ Yanlış — Doğru cevap: ${q.correct_answer}) ${q.options[q.correct_answer]}`}
            </p>
            {q.short_explanation && (
              <p className="text-sm text-gray-700 mt-1">{q.short_explanation}</p>
            )}
            {q.trap && (
              <p className="text-xs text-gray-500 mt-2">💡 <span className="font-semibold">Tuzak:</span> {q.trap}</p>
            )}
            {q.example_en && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs italic text-gray-600">{q.example_en}</p>
                <p className="text-xs text-gray-500 mt-0.5">{q.example_tr}</p>
              </div>
            )}
          </div>
        )}

        {phase === 'feedback' && (
          <button
            onClick={handleNext}
            className="mt-4 w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl text-base active:scale-95 transition-transform"
          >
            {index + 1 >= questions.length ? 'Sonuçları Gör 🏁' : 'Devam Et →'}
          </button>
        )}
      </div>
    </div>
  )
}
