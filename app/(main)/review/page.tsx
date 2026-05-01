'use client'
import { useEffect, useState } from 'react'
import type { ExamData, ExamQuestion } from '@/lib/types'
import { getAdaptiveStore, recordAnswer, type Confidence } from '@/lib/adaptive-store'
import { getWordLabStore, recordWordAnswer, getWordReviewQueue } from '@/lib/patterns-engine'
import type { PatternItem } from '@/lib/patterns-engine'

export default function ReviewQueuePage() {
  const [exam, setExam]     = useState<ExamData | null>(null)
  const [patterns, setPatterns] = useState<PatternItem[]>([])
  const [tab, setTab]       = useState<'questions' | 'words'>('questions')

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then(setExam)
    fetch('/yds_patterns_db.json').then(r => r.json()).then(setPatterns)
  }, [])

  if (!exam || !patterns.length) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-4xl animate-bounce">🔄</div>
      </div>
    )
  }

  const store   = getAdaptiveStore()
  const today   = new Date().toISOString().slice(0, 10)

  // Questions due for review
  const questionQueue = Object.values(store.questionReviews)
    .filter(r => !r.mastered && r.nextReviewDate <= today && r.seenCount > 0)
    .sort((a, b) => {
      // dangerous misconceptions first (high conf + wrong)
      const aDA = store.attempts.filter(at => at.questionId === a.questionId && at.errorType === 'dangerous_misconception').length
      const bDA = store.attempts.filter(at => at.questionId === b.questionId && at.errorType === 'dangerous_misconception').length
      if (aDA !== bDA) return bDA - aDA
      return a.masteryScore - b.masteryScore
    })
    .map(r => exam.questions.find(q => q.question_number === r.questionId))
    .filter(Boolean) as ExamQuestion[]

  // Words due for review
  const wordQueue = getWordReviewQueue(patterns)

  return (
    <div className="space-y-4 pb-4">
      <div className="pt-1">
        <h1 className="text-2xl font-black text-[#3C3C3C]">🔄 Tekrar Kuyruğu</h1>
        <p className="text-xs font-bold text-[#AFAFAF]">Spaced repetition · Bugün çalışılacaklar</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`card p-4 text-center border-b-4 ${questionQueue.length > 0 ? 'border-[#FF4B4B]' : 'border-[#58CC02]'}`}>
          <div className={`text-2xl font-black ${questionQueue.length > 0 ? 'text-[#FF4B4B]' : 'text-[#58CC02]'}`}>
            {questionQueue.length}
          </div>
          <div className="text-[11px] font-bold text-[#AFAFAF] uppercase">Soru Bekliyor</div>
        </div>
        <div className={`card p-4 text-center border-b-4 ${wordQueue.length > 0 ? 'border-amber-400' : 'border-[#58CC02]'}`}>
          <div className={`text-2xl font-black ${wordQueue.length > 0 ? 'text-amber-600' : 'text-[#58CC02]'}`}>
            {wordQueue.length}
          </div>
          <div className="text-[11px] font-bold text-[#AFAFAF] uppercase">Kelime Bekliyor</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F0F0F0] rounded-xl p-1">
        {(['questions','words'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${tab === t ? 'bg-white text-[#3C3C3C] shadow-sm' : 'text-[#AFAFAF]'}`}>
            {t === 'questions' ? `Sorular (${questionQueue.length})` : `Kelimeler (${wordQueue.length})`}
          </button>
        ))}
      </div>

      {tab === 'questions' ? (
        <QuestionReviewList questions={questionQueue} exam={exam} />
      ) : (
        <WordReviewList words={wordQueue} />
      )}
    </div>
  )
}

// ── Question Review ───────────────────────────────────────────────────────────
function QuestionReviewList({ questions, exam }: { questions: ExamQuestion[]; exam: ExamData }) {
  const [idx, setIdx]        = useState<number | null>(null)
  const [storeVer, setStoreVer] = useState(0)

  if (questions.length === 0) {
    return (
      <div className="text-center py-14 space-y-3">
        <div className="text-4xl">✨</div>
        <p className="font-black text-[#58CC02]">Tüm sorular tamamlandı!</p>
        <p className="text-sm text-[#AFAFAF] font-semibold">Harika — bugün tekrar kuyruğu temiz.</p>
      </div>
    )
  }

  if (idx !== null && idx < questions.length) {
    return (
      <ReviewQuestion
        q={questions[idx]}
        total={questions.length}
        idx={idx}
        onNext={() => {
          setStoreVer(v => v+1)
          if (idx >= questions.length - 1) setIdx(null)
          else setIdx(i => (i ?? 0) + 1)
        }}
        onBack={() => setIdx(null)}
      />
    )
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setIdx(0)} className="btn-duo py-3">
        ⚡ {questions.length} SORUYU TEKRAR ET
      </button>
      {questions.map((q, i) => {
        const r   = getAdaptiveStore().questionReviews[q.question_number]
        const isDM = getAdaptiveStore().attempts.some(a => a.questionId === q.question_number && a.errorType === 'dangerous_misconception')
        return (
          <button
            key={q.question_number}
            onClick={() => setIdx(i)}
            className={`card p-4 w-full text-left space-y-2 border-l-4 ${isDM ? 'border-[#FF4B4B]' : 'border-[#E5E5E5]'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black bg-[#F0F0F0] text-[#AFAFAF] px-2 py-0.5 rounded-full">Q{q.question_number}</span>
                {isDM && <span className="text-[10px] font-black bg-red-100 text-[#FF4B4B] px-2 py-0.5 rounded-full">🚨 Tehlikeli</span>}
                <span className="text-[10px] font-bold text-[#AFAFAF]">{q.section_name}</span>
              </div>
              {r && (
                <span className="text-xs font-black text-[#AFAFAF]">{r.masteryScore}%</span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#3C3C3C] line-clamp-2">{q.question_text?.slice(0,80) ?? `Soru ${q.question_number}`}...</p>
          </button>
        )
      })}
    </div>
  )
}

function ReviewQuestion({ q, total, idx, onNext, onBack }: {
  q: ExamQuestion; total: number; idx: number
  onNext: () => void; onBack: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [conf, setConf]         = useState<Confidence | null>(null)
  const [revealed, setRevealed] = useState(false)

  const opts = Object.entries(q.options)

  function pick(opt: string) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
  }

  function submitConf(c: Confidence) {
    setConf(c)
    recordAnswer({
      questionId: q.question_number,
      sectionKey: q.section_key,
      selectedAnswer: selected!,
      correctAnswer: q.correct_answer,
      isCorrect: selected === q.correct_answer,
      confidence: c,
      patterns: q.common_patterns,
    })
    setTimeout(onNext, 800)
  }

  const optStyle = (opt: string) => {
    if (!revealed) return selected === opt ? 'border-[#1CB0F6] bg-blue-50' : 'border-[#E5E5E5] bg-white text-[#3C3C3C]'
    if (opt === q.correct_answer) return 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302] font-black'
    if (opt === selected) return 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
    return 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]'
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[#AFAFAF] text-xl font-black">‹</button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-black text-[#AFAFAF]">
            <span>Tekrar {idx+1}/{total}</span>
            <span>{q.section_name}</span>
          </div>
          <div className="h-2 bg-[#F0F0F0] rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#1CB0F6] rounded-full" style={{ width: `${((idx+1)/total)*100}%` }} />
          </div>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{q.question_text || `Soru ${q.question_number}`}</p>
      </div>

      <div className="space-y-2">
        {opts.length > 0 ? opts.map(([letter, text]) => (
          <button key={letter} onClick={() => pick(letter)}
            className={`w-full text-left p-3.5 rounded-2xl border-2 border-b-4 text-sm font-semibold transition-all active:translate-y-[2px] active:border-b-[1px] ${optStyle(letter)}`}>
            <span className="font-black mr-2">{letter})</span>{text}
          </button>
        )) : ['A','B','C','D','E'].map(l => (
          <button key={l} onClick={() => pick(l)}
            className={`w-full p-3.5 rounded-2xl border-2 border-b-4 font-black text-sm transition-all ${optStyle(l)}`}>{l})
          </button>
        ))}
      </div>

      {revealed && !conf && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <p className={`font-black ${selected === q.correct_answer ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
            {selected === q.correct_answer ? '✅ Doğru!' : `❌ Yanlış — Doğru: ${q.correct_answer})`}
          </p>
          <p className="text-xs font-black text-[#AFAFAF]">Güven?</p>
          <div className="grid grid-cols-3 gap-2">
            {([['low','😰','Düşük'],['medium','🤔','Orta'],['high','💪','Yüksek']] as const).map(([c,icon,label]) => (
              <button key={c} onClick={() => submitConf(c as Confidence)}
                className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 border-[#E5E5E5] border-b-4 bg-white active:translate-y-[2px] active:border-b-[1px] transition-all">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-black text-[#3C3C3C]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Word Review ───────────────────────────────────────────────────────────────
function WordReviewList({ words }: { words: PatternItem[] }) {
  const [idx, setIdx] = useState<number | null>(null)

  if (words.length === 0) {
    return (
      <div className="text-center py-14 space-y-3">
        <div className="text-4xl">🌟</div>
        <p className="font-black text-[#58CC02]">Tüm kelimeler taze!</p>
        <p className="text-sm text-[#AFAFAF] font-semibold">Kelime Tekrar kuyruğu boş.</p>
      </div>
    )
  }

  if (idx !== null && idx < words.length) {
    const p  = words[idx]
    const wp = getWordLabStore().progress[p.id]
    return (
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3 pt-1">
          <button onClick={() => setIdx(null)} className="text-[#AFAFAF] text-xl font-black">‹</button>
          <p className="text-xs font-black text-[#AFAFAF]">Kelime {idx+1}/{words.length}</p>
        </div>
        <div className="card p-6 text-center space-y-3 border-b-4 border-[#FFD900]">
          <p className="text-3xl font-black text-[#3C3C3C]">{p.pattern_text}</p>
          <p className="text-lg font-bold text-[#58CC02]">{p.meaning_tr}</p>
        </div>
        <div className="bg-[#FFF9DB] rounded-xl p-4">
          <p className="text-sm font-semibold text-[#3C3C3C]">{p.memory_trick}</p>
        </div>
        <div className="bg-[#F0F8FF] rounded-xl p-4">
          <p className="text-sm italic text-[#3C3C3C]/80">{p.example_en}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([['low','😰','Zayıf',false],['medium','🤔','Yakın',true],['high','💪','Bildim',true]] as const).map(([c,icon,label,correct]) => (
            <button key={c} onClick={() => { recordWordAnswer(p.id, correct, c, 'recall'); if (idx>=words.length-1) setIdx(null); else setIdx(i=>(i??0)+1) }}
              className={`p-4 rounded-2xl border-2 border-b-4 text-center transition-all active:translate-y-[2px] active:border-b-[1px] ${correct ? 'bg-[#F0FFF0] border-[#58CC02]' : 'bg-red-50 border-[#FF4B4B]'}`}>
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs font-black text-[#3C3C3C]">{label}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button onClick={() => setIdx(0)} className="btn-duo py-3">
        🔤 {words.length} KELİMEYİ TEKRAR ET
      </button>
      {words.map((p, i) => {
        const wp = getWordLabStore().progress[p.id]
        return (
          <button key={p.id} onClick={() => setIdx(i)}
            className="card p-4 w-full text-left flex items-center justify-between gap-3 border-l-4 border-amber-400">
            <div>
              <p className="font-black text-[#3C3C3C]">{p.pattern_text}</p>
              <p className="text-sm font-bold text-[#58CC02]">{p.meaning_tr.split('/')[0].trim()}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-black text-[#AFAFAF]">{wp?.memoryScore ?? 0}%</div>
              <div className="text-[10px] text-[#AFAFAF]">{p.category}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
