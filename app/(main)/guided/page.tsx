'use client'
import { useEffect, useState } from 'react'
import { loadData, pickQuizQuestions } from '@/lib/data'
import { getProgress, recordAnswer } from '@/lib/store'
import type { Question } from '@/lib/types'

type Step = 'context' | 'hint' | 'answer' | 'analysis'

const CAT_BADGE: Record<string, string> = {
  VOCAB:               'bg-violet-100 text-violet-700',
  GRAMMAR:             'bg-blue-100 text-blue-700',
  PREPOSITION:         'bg-amber-100 text-amber-700',
  LINKER:              'bg-[#D7FFB8] text-[#46A302]',
  PHRASAL:             'bg-rose-100 text-rose-600',
  SENTENCE_COMPLETION: 'bg-sky-100 text-sky-700',
  CLOZE:               'bg-orange-100 text-orange-700',
}

const GUIDED_QUESTION_COUNT = 8

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div
      className={`w-3 h-3 rounded-full transition-all ${
        done ? 'bg-[#58CC02]' : active ? 'bg-[#1CB0F6] scale-125' : 'bg-[#E5E5E5]'
      }`}
    />
  )
}

function GuidedQuestion({ q, onNext }: { q: Question; onNext: () => void }) {
  const [step, setStep] = useState<Step>('context')
  const [selected, setSelected] = useState<string | null>(null)
  const isCorrect = selected === q.correct_answer

  const steps: Step[] = ['context', 'hint', 'answer', 'analysis']
  const stepIdx = steps.indexOf(step)

  function handleSelect(opt: string) {
    if (step !== 'answer') return
    setSelected(opt)
    recordAnswer(q.id, opt === q.correct_answer)
    setStep('analysis')
  }

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <StepDot active={i === stepIdx} done={i < stepIdx} />
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 transition-all ${i < stepIdx ? 'bg-[#58CC02]' : 'bg-[#E5E5E5]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Category badge */}
      <span className={`inline-block text-xs font-black px-3 py-1 rounded-full ${CAT_BADGE[q.category] ?? 'bg-gray-100 text-gray-600'}`}>
        {q.category.replace('_', ' ')}
      </span>

      {/* CLOZE passage */}
      {q.passage && (
        <div className="card p-4 border-l-4 border-orange-300 bg-orange-50 text-sm text-[#3C3C3C]/80 font-semibold leading-relaxed italic">
          {q.passage}
        </div>
      )}

      {/* Step 1: Context */}
      {step === 'context' && (
        <div className="card p-5 space-y-3 border-b-4 border-[#1CB0F6]">
          <p className="text-xs font-black text-[#1CB0F6] uppercase tracking-wide">Adım 1 — Soruyu Oku</p>
          <p className="text-base font-bold text-[#3C3C3C] leading-relaxed">{q.question_text}</p>
          <p className="text-xs font-semibold text-[#AFAFAF]">
            Soruyu dikkatlice oku. Hangi bilgiyi aradığını anla.
          </p>
          <button onClick={() => setStep('hint')} className="btn-duo">
            İpucunu Gör →
          </button>
        </div>
      )}

      {/* Step 2: Hint */}
      {step === 'hint' && (
        <div className="card p-5 space-y-3 border-b-4 border-[#FFD900]">
          <p className="text-xs font-black text-[#CE9B00] uppercase tracking-wide">Adım 2 — İpucu</p>
          <div className="space-y-2">
            {q.pattern && (
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-xs font-black text-[#CE9B00] mb-1">Kalıp</p>
                <p className="font-black text-[#3C3C3C]">{q.pattern}</p>
                <p className="text-sm font-semibold text-[#AFAFAF]">{q.meaning_tr}</p>
              </div>
            )}
            {q.example_en && (
              <div className="bg-white rounded-xl p-3 border border-[#E5E5E5]">
                <p className="text-xs font-black text-[#AFAFAF] mb-1">Örnek</p>
                <p className="text-sm font-semibold italic text-[#3C3C3C]">{q.example_en}</p>
                <p className="text-xs text-[#AFAFAF] font-semibold mt-1">{q.example_tr}</p>
              </div>
            )}
          </div>
          <button onClick={() => setStep('answer')} className="btn-duo">
            Cevapla →
          </button>
        </div>
      )}

      {/* Step 3: Answer */}
      {step === 'answer' && (
        <div className="space-y-3">
          <div className="card p-4 border-b-4 border-[#E5E5E5]">
            <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide mb-3">Adım 3 — Cevabını Seç</p>
            <p className="text-base font-bold text-[#3C3C3C] leading-relaxed">{q.question_text}</p>
          </div>
          {Object.entries(q.options).map(([k, v]) => (
            <button
              key={k}
              onClick={() => handleSelect(k)}
              className="w-full text-left px-5 py-4 rounded-2xl font-bold text-sm border-2 border-b-4 border-[#E5E5E5] bg-white text-[#3C3C3C] border-b-[#CCCCCC] active:translate-y-[2px] transition-all"
            >
              <span className="font-black text-base opacity-50 mr-3">{k}</span>
              {v}
            </button>
          ))}
        </div>
      )}

      {/* Step 4: Analysis */}
      {step === 'analysis' && (
        <div className="space-y-3">
          {/* Answer review */}
          <div className={`card p-4 space-y-3 border-b-4 ${isCorrect ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-[#FF4B4B] bg-red-50'}`}>
            <p className={`text-xs font-black uppercase tracking-wide ${isCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              Adım 4 — Analiz
            </p>
            <p className={`text-lg font-black ${isCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              {isCorrect ? '✓ Doğru!' : `✗ Yanlış — Doğru: ${q.correct_answer}) ${q.options[q.correct_answer]}`}
            </p>
          </div>

          {/* All options explained */}
          <div className="card p-4 space-y-2">
            {Object.entries(q.options).map(([k, v]) => {
              const isRight = k === q.correct_answer
              const isPicked = k === selected
              return (
                <div
                  key={k}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold border-2 ${
                    isRight
                      ? 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302]'
                      : isPicked && !isRight
                      ? 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
                      : 'border-[#E5E5E5] bg-white text-[#AFAFAF]'
                  }`}
                >
                  <span className="font-black mr-2">{k})</span>
                  {v}
                  {isRight && <span className="ml-2 text-xs font-black">✓</span>}
                </div>
              )
            })}
          </div>

          {/* Explanation */}
          <div className="card p-4 space-y-2">
            {q.short_explanation && (
              <p className="text-sm font-semibold text-[#3C3C3C]">{q.short_explanation}</p>
            )}
            {q.trap && (
              <p className="text-xs font-semibold text-[#AFAFAF]">💡 {q.trap}</p>
            )}
          </div>

          <button onClick={onNext} className="btn-duo w-full">
            Sonraki Soru →
          </button>
        </div>
      )}
    </div>
  )
}

export default function GuidedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    loadData().then(data => {
      const p = getProgress()
      // Pick 5 weak questions; ensure coverage of categories if possible
      const qs = pickQuizQuestions(data, GUIDED_QUESTION_COUNT, p.questionStats) as Question[]
      setQuestions(qs)
    })
  }, [])

  function handleNext() {
    if (index + 1 >= questions.length) {
      setFinished(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-5xl animate-bounce">🧭</div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        <div className="text-7xl">🎓</div>
        <h2 className="text-2xl font-black text-[#3C3C3C]">Tamamlandı!</h2>
        <p className="text-[#AFAFAF] font-semibold text-center">Tüm soruları adım adım çözdün.</p>
        <button
          onClick={() => { setIndex(0); setFinished(false); }}
          className="btn-duo"
        >
          Tekrar Başla
        </button>
      </div>
    )
  }

  const q = questions[index]

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black text-[#3C3C3C]">Rehberli Çözüm</h1>
        <span className="text-xs font-black text-[#AFAFAF] bg-white rounded-full px-3 py-1 border border-[#E5E5E5]">
          {index + 1} / {questions.length}
        </span>
      </div>
      <div className="h-2 bg-[#E5E5E5] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1CB0F6] rounded-full transition-all duration-500"
          style={{ width: `${((index) / questions.length) * 100}%` }}
        />
      </div>
      <GuidedQuestion key={q.id} q={q} onNext={handleNext} />
    </div>
  )
}
