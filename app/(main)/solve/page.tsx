'use client'
import { useEffect, useRef, useState } from 'react'
import type { ExamData, ExamQuestion } from '@/lib/types'
import {
  detectQuestionType, getMainStrategy, getKeyClues, buildThinkingSteps,
  analyzeAllOptions, generateMemoryCard, generateGolden5,
  generateSimilarQuestions, generateCritique, generatePracticeQuiz,
  type QuestionType, type FullOptionAnalysis, type MemoryCard,
  type GoldenItem, type SimilarQuestion, type PracticeItem,
} from '@/lib/solve-engine'

// ─── Type labels ───────────────────────────────────────────────────────────────
const TYPE_COLOR: Record<QuestionType, string> = {
  VOCAB: 'bg-violet-100 text-violet-800',
  LINKER: 'bg-blue-100 text-blue-800',
  GRAMMAR: 'bg-gray-100 text-gray-800',
  PREPOSITION: 'bg-rose-100 text-rose-800',
  SENTENCE_COMPLETION: 'bg-amber-100 text-amber-800',
  PARAGRAPH_COMPLETION: 'bg-teal-100 text-teal-800',
  CLOZE: 'bg-indigo-100 text-indigo-800',
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SolveWithMePage() {
  const [exam, setExam]     = useState<ExamData | null>(null)
  const [filter, setFilter] = useState<'wrong' | 'all'>('wrong')
  const [qIdx, setQIdx]     = useState(0)
  const [score, setScore]   = useState({ correct: 0, total: 0 })
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then(setExam)
  }, [])

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-4xl animate-bounce">🧠</div>
        <p className="font-bold text-[#AFAFAF]">Yükleniyor...</p>
      </div>
    )
  }

  const solvable = exam.questions.filter(q =>
    ['fill_blank_vocab','cloze','sentence_completion','paragraph_completion'].includes(q.section_key)
  )
  const questions = filter === 'wrong'
    ? solvable.filter(q => !q.is_correct)
    : solvable

  const q = questions[qIdx % Math.max(questions.length, 1)]

  function goNext() {
    setQIdx(i => i + 1)
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function onAnswer(correct: boolean) {
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
  }

  if (!q) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="text-4xl">🎉</div>
        <p className="font-black text-[#58CC02] text-lg">Tüm sorular tamamlandı!</p>
        <button onClick={() => { setFilter('all'); setQIdx(0) }} className="btn-duo py-3 px-6">
          Tüm Sorulara Geç →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8" ref={topRef}>
      {/* Header */}
      <div className="flex items-start justify-between pt-1 gap-3">
        <div>
          <h1 className="text-xl font-black text-[#3C3C3C]">🧠 Benimle Çöz</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">Adım adım düşünce öğretimi</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-black text-[#58CC02]">{score.correct}/{score.total}</div>
          <div className="text-[10px] text-[#AFAFAF]">Q{(qIdx % questions.length)+1}/{questions.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-[#F0F0F0] rounded-xl p-1">
        {(['wrong','all'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setQIdx(0) }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${filter===f ? 'bg-white text-[#3C3C3C] shadow-sm' : 'text-[#AFAFAF]'}`}>
            {f === 'wrong' ? `❌ Yanlışlar (${solvable.filter(x=>!x.is_correct).length})` : `📚 Tümü (${solvable.length})`}
          </button>
        ))}
      </div>

      {/* Main solver */}
      <SolveQuestion
        key={`${filter}-${qIdx}`}
        q={q}
        onNext={goNext}
        onAnswer={onAnswer}
      />
    </div>
  )
}

// ─── Core solve component ──────────────────────────────────────────────────────
function SolveQuestion({ q, onNext, onAnswer }: {
  q: ExamQuestion
  onNext: () => void
  onAnswer: (correct: boolean) => void
}) {
  const type      = detectQuestionType(q)
  const strategy  = getMainStrategy(type, q)
  const clues     = getKeyClues(q)
  const steps     = buildThinkingSteps(q)
  const analyses  = analyzeAllOptions(q)
  const card      = generateMemoryCard(q)
  const golden5   = generateGolden5(q)
  const similar   = generateSimilarQuestions(q)
  const practice  = generatePracticeQuiz(q)

  // Panel visibility
  const [stepsOpen, setStepsOpen]     = useState<number[]>([])
  const [stepsShown, setStepsShown]   = useState<Set<number>>(new Set())
  // Gate: options are hidden until the user engages with at least one step
  const [stepsEngaged, setStepsEngaged] = useState(false)
  const [optionOpen, setOptionOpen] = useState(false)
  const [chosen, setChosen]         = useState<string | null>(null)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [showSimilar, setShowSimilar] = useState(false)
  const [showPractice, setShowPractice] = useState(false)
  const [practiceIdx, setPracticeIdx]   = useState(0)
  const [practiceChosen, setPracticeChosen] = useState<string | null>(null)
  const [produceMode, setProduceMode]   = useState(false)
  const [produceInput, setProduceInput] = useState('')
  const [produceChecked, setProduceChecked] = useState(false)
  const [simChosen, setSimChosen]       = useState<Record<number, string>>({})
  const [addedReview, setAddedReview]   = useState(false)

  const answered   = chosen !== null
  const isCorrect  = chosen === q.correct_answer
  const critique   = chosen ? generateCritique(q, chosen) : ''

  function pickAnswer(letter: string) {
    if (chosen) return
    setChosen(letter)
    onAnswer(letter === q.correct_answer)
    setOptionOpen(true)
  }

  function revealStep(id: number) {
    setStepsShown(s => new Set([...s, id]))
  }

  function toggleStep(id: number) {
    setStepsOpen(arr =>
      arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]
    )
    revealStep(id)
    setStepsEngaged(true)   // first accordion open unlocks options
  }

  const optStyle = (letter: string) => {
    if (!answered)
      return chosen === letter
        ? 'border-[#1CB0F6] bg-blue-50 text-[#1CB0F6]'
        : 'border-[#E5E5E5] bg-white text-[#3C3C3C]'
    if (letter === q.correct_answer) return 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302] font-black'
    if (letter === chosen)           return 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
    return 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]'
  }

  return (
    <div className="space-y-4">
      {/* ① Type + Strategy banner */}
      <div className={`card p-4 border-l-4 space-y-2 ${strategy.color}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${TYPE_COLOR[type]}`}>
            {type}
          </span>
          <span className="text-sm font-black text-[#3C3C3C]">
            {strategy.icon} Strateji: {strategy.label}
          </span>
        </div>
        <p className="text-xs font-semibold text-[#3C3C3C]">{strategy.description}</p>
        <div className="bg-white/70 rounded-xl px-3 py-2">
          <p className="text-[10px] font-black text-[#1CB0F6] uppercase mb-0.5">Ana İpucu</p>
          <p className="text-xs font-bold text-[#3C3C3C]">{strategy.mainClue}</p>
        </div>
      </div>

      {/* ② Question + highlighted clues */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-[#AFAFAF] uppercase">
            Q{q.question_number} · {q.section_name}
          </span>
          {!q.is_correct && (
            <span className="text-[10px] font-black bg-red-100 text-[#FF4B4B] px-2 py-0.5 rounded-full shrink-0">
              ❌ Sınavda yanlış
            </span>
          )}
        </div>
        <HighlightedQuestion text={q.question_text ?? ''} clues={clues} />

        {/* Key clues chips */}
        {clues.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-[#AFAFAF] uppercase">Tespit edilen ipuçları:</p>
            <div className="flex flex-wrap gap-1.5">
              {clues.map((c, i) => (
                <div key={i} className="group relative">
                  <span className={`${c.color} text-xs font-black px-2 py-0.5 rounded-lg cursor-default`}>
                    {c.text}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-semibold text-[#AFAFAF]">
              {clues[0]?.explanation}
            </p>
          </div>
        )}
      </div>

      {/* ③ Step-by-step accordion */}
      <div className="card divide-y divide-[#F0F0F0] overflow-hidden">
        <div className="p-3 bg-[#F8F8F8]">
          <p className="text-xs font-black text-[#3C3C3C]">🧩 Adım Adım Düşün</p>
          <p className="text-[10px] font-semibold text-[#AFAFAF]">Her adımı önce kendin düşün, sonra cevabı gör</p>
        </div>
        {steps.map(s => {
          const isOpen  = stepsOpen.includes(s.id)
          const isShown = stepsShown.has(s.id)
          return (
            <div key={s.id}>
              <button
                className="w-full flex items-center justify-between p-3 text-left gap-3"
                onClick={() => toggleStep(s.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    isShown ? 'bg-[#58CC02] text-white' : 'bg-[#F0F0F0] text-[#AFAFAF]'
                  }`}>{s.id}</div>
                  <p className="text-xs font-black text-[#3C3C3C] truncate">{s.prompt}</p>
                </div>
                <span className={`text-[#AFAFAF] text-lg font-black shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-3 space-y-2 animate-slide-up">
                  <p className="text-[10px] font-semibold text-[#AFAFAF]">{s.subPrompt}</p>
                  {isShown ? (
                    <div className="bg-[#F0FFF0] rounded-xl p-3">
                      <p className="text-[10px] font-black text-[#46A302] uppercase mb-1">Cevap:</p>
                      <p className="text-xs font-semibold text-[#3C3C3C]">{s.answer}</p>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); revealStep(s.id) }}
                      className="text-xs font-black text-[#1CB0F6] underline"
                    >
                      Cevabı Göster ▼
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ④ Answer options — locked until user opens at least one step */}
      {!stepsEngaged ? (
        <div className="card p-5 text-center space-y-3 border-2 border-dashed border-[#E5E5E5]">
          <p className="text-sm font-black text-[#3C3C3C]">
            Önce adımları çalış
          </p>
          <p className="text-xs font-semibold text-[#AFAFAF]">
            Yukarıdaki adımlardan en az birini aç ve düşün — sonra seçenekler açılır.
          </p>
          <button
            onClick={() => setStepsEngaged(true)}
            className="text-[10px] font-black text-[#AFAFAF] underline"
          >
            Adımları atla →
          </button>
        </div>
      ) : (
      <div className="space-y-2">
        <p className="text-[10px] font-black text-[#AFAFAF] uppercase px-1">
          {answered ? '📊 Seçenek Analizi' : '🎯 Cevabını seç'}
        </p>
        {analyses.map(a => (
          <button
            key={a.letter}
            onClick={() => pickAnswer(a.letter)}
            disabled={!!chosen}
            className={`w-full text-left p-3.5 rounded-2xl border-2 border-b-4 text-sm font-semibold transition-all active:translate-y-[2px] active:border-b-[1px] ${optStyle(a.letter)}`}
          >
            <div className="flex items-start gap-2">
              <span className="font-black shrink-0">{a.letter})</span>
              <div className="flex-1 min-w-0">
                <span>{a.text}</span>
                {answered && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[10px] font-black text-inherit opacity-80">
                      {a.meaning_tr}
                    </p>
                    {a.letter === q.correct_answer ? (
                      <p className="text-[10px] font-semibold text-[#46A302]">✓ {a.whyFits}</p>
                    ) : (
                      <p className="text-[10px] font-semibold text-[#FF4B4B]">✗ {a.whyNot}</p>
                    )}
                    {a.trapAlert && (
                      <p className="text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg inline-block">
                        🚨 {a.trapAlert}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      )}  {/* end stepsEngaged gate */}

      {/* ⑤ Post-answer panels */}
      {answered && (
        <div className="space-y-3 animate-slide-up">
          {/* Result + critique */}
          <div className={`card p-4 border-l-4 ${isCorrect ? 'border-[#58CC02]' : 'border-[#FF4B4B]'}`}>
            <p className={`font-black text-sm mb-2 ${isCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              {isCorrect ? '✅ Doğru!' : `❌ Doğru cevap: ${q.correct_answer}) ${q.options[q.correct_answer]}`}
            </p>
            {!isCorrect && (
              <div className="space-y-1.5 mt-2">
                {critique.split('\n\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs font-semibold text-[#3C3C3C]">{line}</p>
                ))}
              </div>
            )}
          </div>

          {/* Memory Card */}
          <MemoryCardPanel card={card} flipped={cardFlipped} onFlip={() => setCardFlipped(f => !f)} />

          {/* Golden 5 */}
          <Golden5Panel items={golden5} />

          {/* Action buttons row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowSimilar(v => !v)}
              className={`card p-3 text-center border-b-4 text-xs font-black transition-all active:translate-y-[2px] active:border-b-[1px] ${
                showSimilar ? 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302]' : 'border-[#E5E5E5] text-[#3C3C3C]'
              }`}
            >
              🔀 Benzer Sorular
            </button>
            <button
              onClick={() => setProduceMode(v => !v)}
              className={`card p-3 text-center border-b-4 text-xs font-black transition-all active:translate-y-[2px] active:border-b-[1px] ${
                produceMode ? 'border-[#1CB0F6] bg-blue-50 text-[#1CB0F6]' : 'border-[#E5E5E5] text-[#3C3C3C]'
              }`}
            >
              ✍️ Üretim Modu
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowPractice(v => !v)}
              className={`card p-3 text-center border-b-4 text-xs font-black transition-all active:translate-y-[2px] active:border-b-[1px] ${
                showPractice ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-[#E5E5E5] text-[#3C3C3C]'
              }`}
            >
              🔤 Bu 5 Kelime Quiz
            </button>
            <button
              onClick={() => {
                if (!addedReview) {
                  try {
                    const key = 'yds_solve_review'
                    const existing: number[] = JSON.parse(localStorage.getItem(key) ?? '[]')
                    if (!existing.includes(q.question_number)) {
                      existing.push(q.question_number)
                      localStorage.setItem(key, JSON.stringify(existing))
                    }
                  } catch {}
                  setAddedReview(true)
                }
              }}
              className={`card p-3 text-center border-b-4 text-xs font-black transition-all active:translate-y-[2px] active:border-b-[1px] ${
                addedReview ? 'border-[#FFD900] bg-[#FFF9DB] text-amber-700' : 'border-[#E5E5E5] text-[#3C3C3C]'
              }`}
            >
              {addedReview ? '✅ Kuyruğa Eklendi' : '🔄 Tekrara Ekle'}
            </button>
          </div>

          {/* Produce mode */}
          {produceMode && (
            <ProduceMode q={q} card={card} />
          )}

          {/* Practice quiz */}
          {showPractice && practice.length > 0 && (
            <PracticePanel items={practice} />
          )}

          {/* Similar questions */}
          {showSimilar && similar.length > 0 && (
            <SimilarQsPanel questions={similar} origOpts={q.options} />
          )}

          {/* How to solve tips */}
          {q.how_to_solve_this_type?.length > 0 && (
            <div className="card p-4 space-y-2">
              <p className="text-[10px] font-black text-[#AFAFAF] uppercase">Bu Tip İçin Kurallar</p>
              {q.how_to_solve_this_type.slice(0, 3).map((rule, i) => (
                <p key={i} className="text-xs font-semibold text-[#3C3C3C]">
                  <span className="text-[#58CC02] font-black">{i+1}. </span>{rule}
                </p>
              ))}
            </div>
          )}

          {/* Next question */}
          <button onClick={onNext} className="btn-duo py-3">
            SONRAKİ SORU →
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Highlighted question ──────────────────────────────────────────────────────
function HighlightedQuestion({ text, clues }: { text: string; clues: ReturnType<typeof getKeyClues> }) {
  if (!clues.length) {
    return <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{text}</p>
  }

  const escaped  = clues.map(c => c.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const combined = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts: Array<{ text: string; clue?: (typeof clues)[0] }> = []
  let last = 0
  let match: RegExpExecArray | null

  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    const clue = clues.find(c => c.text.toLowerCase() === match![0].toLowerCase())
    parts.push({ text: match[0], clue })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })

  return (
    <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">
      {parts.map((p, i) =>
        p.clue ? (
          <span key={i} className={`${p.clue.color} px-1 rounded font-black`}>{p.text}</span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  )
}

// ─── Memory card ───────────────────────────────────────────────────────────────
function MemoryCardPanel({ card, flipped, onFlip }: { card: MemoryCard; flipped: boolean; onFlip: () => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black text-[#AFAFAF] uppercase px-1">🃏 Hafıza Kartı</p>
      {/* Flip card */}
      <div
        className="cursor-pointer select-none"
        onClick={onFlip}
        style={{ perspective: 1000 }}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'none',
            minHeight: 160,
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 card p-5 flex flex-col items-center justify-center gap-2 border-b-4 border-[#FFD900] bg-[#FFF9DB]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-3xl font-black text-[#3C3C3C]">{card.word}</p>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide">Türkçe anlamı nedir?</p>
            <p className="text-[10px] text-[#AFAFAF] font-semibold">Dokunarak çevir</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 card p-4 space-y-2 border-b-4 border-[#58CC02]"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="text-lg font-black text-[#58CC02]">{card.meaning_tr}</p>
            <div className="bg-[#FFF9DB] rounded-xl p-2">
              <p className="text-[10px] font-black text-amber-700 uppercase mb-0.5">Hafıza Hilesi</p>
              <p className="text-xs font-semibold text-[#3C3C3C]">{card.memory_trick}</p>
            </div>
            {card.collocations.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-[#AFAFAF] uppercase mb-1">Kalıplar</p>
                <div className="flex flex-wrap gap-1">
                  {card.collocations.slice(0, 3).map(c => (
                    <span key={c} className="text-[10px] font-black bg-[#F0F0F0] text-[#3C3C3C] px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {card.trap_words.length > 0 && (
              <p className="text-[10px] font-black text-[#FF4B4B]">
                🚨 Tuzak: karıştırma "{card.trap_words[0]}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mini story */}
      <div className="bg-[#F0F8FF] rounded-xl p-3">
        <p className="text-[10px] font-black text-[#1CB0F6] uppercase mb-1">Mini Hikaye</p>
        <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{card.mini_story}</p>
      </div>

      {/* Example */}
      {card.example_sentence && (
        <div className="bg-[#F8F8F8] rounded-xl p-3">
          <p className="text-[10px] font-black text-[#AFAFAF] uppercase mb-1">Örnek Cümle</p>
          <p className="text-xs italic text-[#3C3C3C]">{card.example_sentence}</p>
        </div>
      )}
    </div>
  )
}

// ─── Golden 5 ──────────────────────────────────────────────────────────────────
function Golden5Panel({ items }: { items: GoldenItem[] }) {
  return (
    <div className="card p-4 space-y-2">
      <p className="text-[10px] font-black text-[#AFAFAF] uppercase">⭐ Golden 5 — Bu Sorudan Öğrendiklerin</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-lg shrink-0">{item.icon}</span>
          <div className="min-w-0">
            <span className="text-xs font-black text-[#3C3C3C]">{item.label}</span>
            {item.label !== item.value && (
              <span className="text-xs font-semibold text-[#AFAFAF]"> → {item.value}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Similar questions ─────────────────────────────────────────────────────────
function SimilarQsPanel({ questions, origOpts }: { questions: SimilarQuestion[]; origOpts: Record<string, string> }) {
  const [chosen, setChosen] = useState<Record<number, string>>({})
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-[#AFAFAF] uppercase px-1">🔀 Benzer Sorular</p>
      {questions.map((sq, i) => {
        const picked  = chosen[i]
        const correct = picked === sq.correct
        return (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                sq.type === 'same_pattern' ? 'bg-[#D7FFB8] text-[#46A302]' :
                sq.type === 'trap_question' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-800'
              }`}>{sq.title.split('—')[0].trim()}</span>
            </div>
            <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{sq.question}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.entries(sq.options).map(([l, v]) => {
                const isPicked  = picked === l
                const isCorrect = picked && l === sq.correct
                const isWrong   = picked && isPicked && !isCorrect
                return (
                  <button key={l} onClick={() => !picked && setChosen(c => ({ ...c, [i]: l }))}
                    className={`text-left p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                      isCorrect ? 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302]' :
                      isWrong   ? 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]' :
                      isPicked  ? 'border-[#1CB0F6] bg-blue-50' :
                      'border-[#E5E5E5] bg-white'
                    }`}>
                    <span className="font-black mr-1">{l})</span>{v}
                  </button>
                )
              })}
            </div>
            {picked && (
              <div className={`rounded-xl p-2 text-xs font-semibold ${correct ? 'bg-[#D7FFB8] text-[#46A302]' : 'bg-red-50 text-[#FF4B4B]'}`}>
                {correct ? '✅' : '❌'} {sq.explanation}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Practice quiz ─────────────────────────────────────────────────────────────
function PracticePanel({ items }: { items: PracticeItem[] }) {
  const [idx, setIdx]       = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const item = items[idx]
  if (!item) return null

  const opts = Object.entries(item.options)
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-[#AFAFAF] uppercase">🔤 Mini Quiz {idx+1}/{items.length}</p>
        {chosen && idx < items.length - 1 && (
          <button onClick={() => { setIdx(i => i+1); setChosen(null) }}
            className="text-xs font-black text-[#1CB0F6]">Sonraki →</button>
        )}
      </div>
      <p className="text-sm font-semibold text-[#3C3C3C]">{item.question}</p>
      <div className="space-y-1.5">
        {opts.map(([l, v]) => {
          const isPicked  = chosen === l
          const isCorrect = chosen && l === item.correct
          const isWrong   = chosen && isPicked && l !== item.correct
          return (
            <button key={l} onClick={() => !chosen && setChosen(l)}
              className={`w-full text-left p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                isCorrect ? 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302] font-black' :
                isWrong   ? 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]' :
                isPicked  ? 'border-[#1CB0F6] bg-blue-50' :
                'border-[#E5E5E5]'
              }`}>
              <span className="font-black mr-1">{l})</span>{v}
            </button>
          )
        })}
      </div>
      {chosen && (
        <p className={`text-xs font-semibold ${chosen === item.correct ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
          {chosen === item.correct ? '✅' : '❌'} {item.explanation}
        </p>
      )}
    </div>
  )
}

// ─── Produce mode ──────────────────────────────────────────────────────────────
function ProduceMode({ q, card }: { q: ExamQuestion; card: MemoryCard }) {
  const [input, setInput]     = useState('')
  const [checked, setChecked] = useState(false)
  const correct = q.options[q.correct_answer] ?? ''
  const isClose = input.toLowerCase().trim() === correct.toLowerCase().trim()
  const isPartial = correct.toLowerCase().includes(input.toLowerCase().trim()) && input.trim().length > 2

  const questionWithBlank = q.question_text?.replace('----', '_______') ?? ''

  return (
    <div className="card p-4 space-y-3 border-l-4 border-[#1CB0F6]">
      <p className="text-[10px] font-black text-[#1CB0F6] uppercase">✍️ Üretim Modu — Seçenek Yok!</p>
      <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{questionWithBlank}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={checked}
          placeholder="Cevabı yaz..."
          className="flex-1 border-2 border-[#E5E5E5] rounded-xl px-3 py-2 text-sm font-semibold focus:border-[#1CB0F6] outline-none"
          onKeyDown={e => e.key === 'Enter' && !checked && input.trim() && setChecked(true)}
        />
        {!checked && input.trim() && (
          <button onClick={() => setChecked(true)} className="btn-duo px-4 py-2 text-sm">
            Kontrol
          </button>
        )}
      </div>

      {checked && (
        <div className={`rounded-xl p-3 animate-slide-up ${isClose ? 'bg-[#D7FFB8]' : isPartial ? 'bg-[#FFF9DB]' : 'bg-red-50'}`}>
          <p className={`text-sm font-black ${isClose ? 'text-[#46A302]' : isPartial ? 'text-amber-700' : 'text-[#FF4B4B]'}`}>
            {isClose ? '✅ Tam isabet!' : isPartial ? '🔶 Yakın, ama eksik!' : `❌ Doğru: ${correct}`}
          </p>
          {!isClose && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-semibold text-[#3C3C3C]">💡 {card.memory_trick}</p>
              <p className="text-xs font-semibold text-[#AFAFAF] italic">{card.mini_story}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
