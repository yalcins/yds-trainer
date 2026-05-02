'use client'
import { useEffect, useState } from 'react'

interface Question {
  id: string
  question_number: number
  question_text: string
  options: Record<string, string>
  correct_answer: string
  section: string
  exam_id: string
}

export default function AllQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/all-questions')
      .then(r => r.json())
      .then((data: { questions: Question[] }) => {
        setQuestions(data.questions)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const q = questions[index]

  function handleSelect(opt: string) {
    if (selected !== null) return
    setSelected(opt)
  }

  function handleNext() {
    setSelected(null)
    setIndex(prev => (prev + 1) % questions.length)
  }

  if (loading || !q) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-5xl animate-bounce">📚</div>
      </div>
    )
  }

  const opts = Object.entries(q.options)
  const answered = selected !== null
  const isCorrect = selected === q.correct_answer

  function optStyle(k: string) {
    const base =
      'w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all border-2 border-b-4'
    if (answered) {
      if (k === q.correct_answer)
        return `${base} border-[#58CC02] bg-[#D7FFB8] text-[#46A302] border-b-[#46A302]`
      if (k === selected)
        return `${base} border-[#FF4B4B] bg-red-50 text-[#FF4B4B] border-b-[#EA2B2B]`
      return `${base} border-[#E5E5E5] bg-white text-[#CCCCCC] border-b-[#E5E5E5]`
    }
    return `${base} border-[#E5E5E5] bg-white text-[#3C3C3C] border-b-[#CCCCCC] active:border-b-[#E5E5E5] active:translate-y-[2px]`
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black px-3 py-1 rounded-full bg-violet-100 text-violet-700 uppercase tracking-wide">
          {q.section}
        </span>
        <span className="text-xs font-bold text-[#AFAFAF]">
          {index + 1} / {questions.length}
        </span>
      </div>

      {/* Question card */}
      <div className="card p-5 border-b-4 border-[#E5E5E5]">
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
            disabled={answered}
            className={optStyle(k)}
          >
            <span className="font-black text-base opacity-50 mr-3">{k}</span>
            {v}
          </button>
        ))}
      </div>

      {/* Feedback + Next */}
      {answered && (
        <div
          className={`rounded-2xl px-5 py-4 animate-slide-up ${
            isCorrect ? 'bg-[#D7FFB8]' : 'bg-red-50'
          }`}
        >
          <p
            className={`text-lg font-black mb-3 ${
              isCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'
            }`}
          >
            {isCorrect
              ? '✓ Correct!'
              : `✗ Correct answer: ${q.correct_answer}) ${q.options[q.correct_answer]}`}
          </p>
          <button
            onClick={handleNext}
            className={`btn-duo ${isCorrect ? '' : 'btn-duo-red'}`}
          >
            Next Question →
          </button>
        </div>
      )}
    </div>
  )
}
