'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getProgress, recordAnswer } from '@/lib/store'
import { loadData } from '@/lib/data'
import type { Question, UserProgress, YDSData } from '@/lib/types'

const CAT_BADGE: Record<string, string> = {
  VOCAB:               'bg-violet-100 text-violet-700',
  GRAMMAR:             'bg-blue-100 text-blue-700',
  PREPOSITION:         'bg-amber-100 text-amber-700',
  LINKER:              'bg-[#D7FFB8] text-[#46A302]',
  PHRASAL:             'bg-rose-100 text-rose-600',
  SENTENCE_COMPLETION: 'bg-sky-100 text-sky-700',
  CLOZE:               'bg-orange-100 text-orange-700',
}

interface MistakeEntry {
  q: Question
  acc: number
  seen: number
  correct: number
}

function PracticeModal({ entry, onClose }: { entry: MistakeEntry; onClose: (answeredCorrect: boolean) => void }) {
  const { q } = entry
  const [selected, setSelected] = useState<string | null>(null)
  const isAnswered = selected !== null
  const isCorrect = selected === q.correct_answer

  function handleSelect(opt: string) {
    if (isAnswered) return
    setSelected(opt)
    recordAnswer(q.id, opt === q.correct_answer)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-6 px-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-black px-3 py-1 rounded-full ${CAT_BADGE[q.category] ?? 'bg-gray-100 text-gray-600'}`}>
            {q.category.replace('_', ' ')}
          </span>
          <button onClick={() => onClose(false)} className="text-[#AFAFAF] text-xl font-black">✕</button>
        </div>

        {q.passage && (
          <div className="p-3 bg-orange-50 rounded-xl border-l-4 border-orange-300 text-sm text-[#3C3C3C]/80 font-semibold leading-relaxed italic">
            {q.passage}
          </div>
        )}

        <p className="font-bold text-[#3C3C3C] leading-relaxed">{q.question_text}</p>

        <div className="space-y-2">
          {Object.entries(q.options).map(([k, v]) => {
            let style = 'border-[#E5E5E5] bg-white text-[#3C3C3C] border-b-[#CCCCCC]'
            if (isAnswered) {
              if (k === q.correct_answer) style = 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302] border-b-[#46A302]'
              else if (k === selected) style = 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B] border-b-[#EA2B2B]'
              else style = 'border-[#E5E5E5] bg-white text-[#CCCCCC]'
            }
            return (
              <button
                key={k}
                onClick={() => handleSelect(k)}
                disabled={isAnswered}
                className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-sm border-2 border-b-4 transition-all ${style}`}
              >
                <span className="font-black opacity-50 mr-2">{k}</span>{v}
              </button>
            )
          })}
        </div>

        {isAnswered && (
          <div className={`rounded-2xl p-3 space-y-1 ${isCorrect ? 'bg-[#D7FFB8]' : 'bg-red-50'}`}>
            <p className={`font-black ${isCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              {isCorrect ? '✓ Doğru!' : `✗ Doğru: ${q.correct_answer}) ${q.options[q.correct_answer]}`}
            </p>
            {q.short_explanation && (
              <p className="text-sm font-semibold text-[#3C3C3C]/75">{q.short_explanation}</p>
            )}
            {q.trap && (
              <p className="text-xs text-[#3C3C3C]/55 font-semibold">💡 {q.trap}</p>
            )}
            <button onClick={() => onClose(isCorrect)} className={`btn-duo mt-2 ${isCorrect ? '' : 'btn-duo-red'}`}>
              Kapat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MistakesPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [data, setData] = useState<YDSData | null>(null)
  const [practicing, setPracticing] = useState<MistakeEntry | null>(null)

  useEffect(() => {
    setProgress(getProgress())
    loadData().then(setData)
  }, [])

  function refresh() {
    setProgress(getProgress())
  }

  if (!progress || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">🔖</div>
      </div>
    )
  }

  const mistakes: MistakeEntry[] = data.questions
    .map(q => {
      const s = progress.questionStats[q.id]
      if (!s || s.seen === 0) return null
      // Only include questions that have at least one wrong answer
      const wrong = s.seen - s.correct
      if (wrong === 0) return null
      return { q, acc: Math.round((s.correct / s.seen) * 100), seen: s.seen, correct: s.correct }
    })
    .filter((x): x is MistakeEntry => x !== null)
    .sort((a, b) => a.acc - b.acc)

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black text-[#3C3C3C]">Hata Bankası</h1>
        <span className="text-xs font-black text-[#FF4B4B] bg-red-50 rounded-full px-3 py-1 border border-red-200">
          {mistakes.length} soru
        </span>
      </div>

      {mistakes.length === 0 ? (
        <div className="text-center py-14 space-y-3">
          <div className="text-5xl">🎉</div>
          <p className="font-black text-[#3C3C3C]">Henüz hata yok!</p>
          <p className="text-sm text-[#AFAFAF] font-semibold">Quiz yaptıkça hataların burada görünür.</p>
          <Link href="/quiz" className="btn-duo inline-block mt-2">
            Quiz Başlat ⚡
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {mistakes.map(entry => (
            <div
              key={entry.q.id}
              className="card p-4 border-l-4 border-[#FF4B4B] space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`shrink-0 text-xs font-black px-2 py-0.5 rounded-full ${CAT_BADGE[entry.q.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {entry.q.category.replace('_', ' ')}
                </span>
                <span className="text-xs font-black text-[#FF4B4B] bg-white border-2 border-[#FF4B4B] px-2 py-0.5 rounded-full shrink-0">
                  {entry.acc}%
                </span>
              </div>
              <p className="text-sm font-semibold text-[#3C3C3C] line-clamp-2">
                {entry.q.question_text}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#AFAFAF]">
                  {entry.q.pattern} · {entry.correct}/{entry.seen} doğru
                </p>
                <button
                  onClick={() => setPracticing(entry)}
                  className="text-xs font-black text-white bg-[#FF4B4B] px-3 py-1.5 rounded-xl border-b-2 border-[#EA2B2B] active:translate-y-[1px] transition-all"
                >
                  Tekrar Çöz
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {practicing && (
        <PracticeModal
          entry={practicing}
          onClose={(answeredCorrect) => {
            setPracticing(null)
            if (answeredCorrect) refresh()
          }}
        />
      )}
    </div>
  )
}
