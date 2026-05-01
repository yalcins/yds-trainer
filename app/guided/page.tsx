'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadData } from '@/lib/data'
import GuidedSolve from '@/components/GuidedSolve'
import type { Question } from '@/lib/types'

const CAT_BADGE: Record<string, string> = {
  VOCAB:       'bg-violet-100 text-violet-700',
  GRAMMAR:     'bg-blue-100 text-blue-700',
  PREPOSITION: 'bg-amber-100 text-amber-700',
  LINKER:      'bg-[#D7FFB8] text-[#46A302]',
  PHRASAL:     'bg-rose-100 text-rose-600',
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export default function GuidedPage() {
  const router = useRouter()
  const [question, setQuestion] = useState<Question | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    loadData().then(data => {
      const qs = data.questions as Question[]
      setAllQuestions(qs)
      setQuestion(pickRandom(qs))
      setLoading(false)
    })
  }, [])

  const nextQuestion = () => {
    const pool = filter === 'ALL'
      ? allQuestions
      : allQuestions.filter(q => q.category === filter)
    if (pool.length === 0) return
    setDone(false)
    setQuestion(pickRandom(pool))
  }

  const handleFinish = () => setDone(true)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F4F8]">
        <div className="text-6xl animate-bounce">🔍</div>
      </div>
    )
  }

  const categories = ['ALL', 'VOCAB', 'GRAMMAR', 'PREPOSITION', 'LINKER', 'PHRASAL']

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F4F8]">
      {/* Top bar */}
      <div className="px-4 pt-10 pb-4 flex items-center gap-3 max-w-lg mx-auto w-full">
        <button
          onClick={() => router.push('/')}
          className="text-[#AFAFAF] text-xl font-black p-1 leading-none"
        >
          ✕
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black text-[#3C3C3C]">Rehberli Çözüm</h1>
          <p className="text-xs text-[#AFAFAF] font-semibold">Adım adım soru çözme</p>
        </div>
        {question && (
          <span className={`text-xs font-black px-3 py-1 rounded-full ${CAT_BADGE[question.category] ?? 'bg-gray-100 text-gray-600'}`}>
            {question.category}
          </span>
        )}
      </div>

      {/* Category filter */}
      <div className="px-4 max-w-lg mx-auto w-full mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-full border-2 transition-all
                ${filter === cat
                  ? 'border-[#58CC02] bg-[#58CC02] text-white'
                  : 'border-[#E5E5E5] bg-white text-[#AFAFAF]'
                }`}
            >
              {cat === 'ALL' ? 'Tümü' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 max-w-lg mx-auto w-full pb-8">
        {done ? (
          <div className="flex flex-col items-center gap-5 pt-10 animate-pop-in">
            <div className="text-7xl">🎓</div>
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-[#3C3C3C]">Harika!</h2>
              <p className="text-sm font-semibold text-[#AFAFAF]">Bu soruyu rehberli olarak çözdünüz.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => router.push('/')} className="btn-duo btn-duo-ghost flex-1">
                Ana Sayfa
              </button>
              <button onClick={nextQuestion} className="btn-duo flex-1">
                Sıradaki Soru →
              </button>
            </div>
          </div>
        ) : question ? (
          <GuidedSolve key={question.id} question={question} onFinish={handleFinish} />
        ) : null}
      </div>
    </div>
  )
}
