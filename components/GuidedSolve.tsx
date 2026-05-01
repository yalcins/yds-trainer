'use client'
import { useState, useMemo } from 'react'
import type { Question } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5 | 6

interface MissingQ {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CAT_META: Record<string, { emoji: string; title: string; desc: string; clueHint: string }> = {
  VOCAB: {
    emoji: '📗',
    title: 'Kelime Sorusu',
    desc: 'Bağlama uygun doğru kelimeyi seçmeniz gerekiyor.',
    clueHint: 'Boşluğun etrafındaki kelimeler anlam ipuçları verir. Olumlu/olumsuz bağlam, eşanlamlılar ve zıt anlamlılara dikkat edin.',
  },
  GRAMMAR: {
    emoji: '📘',
    title: 'Dilbilgisi Sorusu',
    desc: 'Cümleye uygun zaman veya yapıyı seçmeniz gerekiyor.',
    clueHint: 'Zaman zarfları ve bağlaçlar (since, when, if...) hangi yapıyı kullanmanız gerektiğini gösterir.',
  },
  PREPOSITION: {
    emoji: '🔗',
    title: 'Edat Sorusu',
    desc: 'Fiil veya sıfatla kullanılan doğru edatı seçmeniz gerekiyor.',
    clueHint: 'Boşluktan önceki fiil veya sıfat, hangi edatı alacağını belirler. Bu kombinasyonlar ezberlenmelidir.',
  },
  LINKER: {
    emoji: '🔀',
    title: 'Bağlaç Sorusu',
    desc: 'İki cümle/ifade arasındaki mantıksal ilişkiyi kuran bağlacı seçmeniz gerekiyor.',
    clueHint: 'İki yan cümle arasındaki anlam ilişkisine bakın: karşıtlık mı, ekleme mi, sebep-sonuç mu?',
  },
  PHRASAL: {
    emoji: '⚙️',
    title: 'Eylem Öbeği Sorusu',
    desc: 'Bağlama uygun doğru eylem öbeğini (phrasal verb) seçmeniz gerekiyor.',
    clueHint: 'Fiilin ardından gelen edatın cümlenin anlamını nasıl değiştirdiğine dikkat edin.',
  },
}

const CAT_BADGE: Record<string, string> = {
  VOCAB:       'bg-violet-100 text-violet-700',
  GRAMMAR:     'bg-blue-100 text-blue-700',
  PREPOSITION: 'bg-amber-100 text-amber-700',
  LINKER:      'bg-[#D7FFB8] text-[#46A302]',
  PHRASAL:     'bg-rose-100 text-rose-600',
}

// ─── Clue word lists by category ──────────────────────────────────────────────

const CLUE_WORDS: Record<string, string[]> = {
  GRAMMAR: [
    'since', 'when', 'by the time', 'before', 'after', 'while', 'as soon as',
    'recently', 'already', 'yet', 'still', 'just', 'so far', 'lately',
    'if', 'unless', 'would', 'could', 'should', 'must', 'might',
    'has been', 'have been', 'had been', 'will have', 'used to',
    'always', 'often', 'never', 'every', 'each', 'neither', 'either',
  ],
  LINKER: [
    'but', 'although', 'though', 'even though', 'despite', 'in spite of',
    'however', 'nevertheless', 'nonetheless', 'on the other hand', 'whereas',
    'moreover', 'furthermore', 'in addition', 'besides', 'not only',
    'therefore', 'thus', 'hence', 'consequently', 'as a result', 'accordingly',
    'because', 'since', 'as', 'due to', 'owing to',
    'if', 'unless', 'provided that', 'as long as',
  ],
  PREPOSITION: [
    'interested', 'depend', 'responsible', 'aware', 'capable',
    'result', 'consist', 'belong', 'believe', 'suffer',
    'concentrate', 'insist', 'look forward', 'accuse', 'approve',
  ],
  VOCAB: [],
  PHRASAL: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClueWords(q: Question): string[] {
  const text = q.question_text.toLowerCase()
  const words = CLUE_WORDS[q.category] ?? []
  return words.filter(w => text.includes(w))
}

function detectLinkerType(q: Question): string {
  const combined = ((q.options[q.correct_answer] ?? '') + ' ' + q.pattern).toLowerCase()
  if (/although|though|even though|however|but|yet|nevertheless|nonetheless|despite|in spite of|whereas|while|on the other hand/.test(combined))
    return 'contrast'
  if (/moreover|furthermore|in addition|besides|also|not only|what is more|in fact/.test(combined))
    return 'addition'
  if (/because|since|as a result of|due to|owing to/.test(combined))
    return 'cause'
  if (/therefore|thus|hence|consequently|as a result|accordingly/.test(combined))
    return 'result'
  if (/if|unless|provided|as long as|on condition/.test(combined))
    return 'condition'
  return 'contrast'
}

function getMissingQuestion(q: Question): MissingQ {
  switch (q.category) {
    case 'LINKER': {
      const linkerType = detectLinkerType(q)
      const allTypes = [
        { type: 'contrast',  label: '🔄 Karşıtlık (although, however...)' },
        { type: 'addition',  label: '➕ Ekleme (moreover, furthermore...)' },
        { type: 'cause',     label: '🔍 Sebep (because, due to...)' },
        { type: 'result',    label: '💥 Sonuç (therefore, thus...)' },
        { type: 'condition', label: '⚖️ Koşul (if, unless...)' },
      ]
      const correctType = allTypes.find(t => t.type === linkerType) ?? allTypes[0]
      const wrongTypes  = allTypes.filter(t => t.type !== linkerType).slice(0, 3)
      const options     = [correctType, ...wrongTypes].map(t => t.label)
      return {
        question: 'Boşluğa hangi türde bağlaç gelmelidir?',
        options,
        correctIndex: 0,
        explanation: `Bu cümlede ${correctType.label.replace(/^[^ ]+ /, '')} ilişkisi vardır.`,
      }
    }

    case 'GRAMMAR': {
      const text = q.question_text.toLowerCase()
      const types = [
        { cond: /since|for the past|so far|recently|already|yet|just|lately/.test(text), label: '⏰ Present Perfect (has/have + done)' },
        { cond: /if|unless/.test(text) && /would|could|might/.test(text),               label: '🔀 Koşullu Yapı (Conditional)' },
        { cond: /when|while|before|after|as soon as/.test(text),                         label: '🕐 Zaman Bağlaçlı Yapı (Time Clause)' },
        { cond: /always|usually|often|never|every|each/.test(text),                      label: '📅 Geniş Zaman (Present Simple)' },
      ]
      const detected    = types.find(t => t.cond)
      const correctLabel = detected?.label ?? '📖 Uygun Dilbilgisi Yapısı'
      const wrongLabels  = [
        '⏰ Present Perfect (has/have + done)',
        '🔀 Koşullu Yapı (Conditional)',
        '🕐 Zaman Bağlaçlı Yapı (Time Clause)',
        '📅 Geniş Zaman (Present Simple)',
      ].filter(l => l !== correctLabel).slice(0, 3)
      const options = [correctLabel, ...wrongLabels]
      return {
        question: 'Bu cümlede hangi dilbilgisi yapısı gerekiyor?',
        options,
        correctIndex: 0,
        explanation: `${correctLabel} yapısı bu cümledeki ipuçlarına uygundur.`,
      }
    }

    case 'PREPOSITION': {
      const correctText = (q.options[q.correct_answer] ?? '').toLowerCase()
      let correctLabel = '📎 Fiil/sıfat + edat (Verb Collocation)'
      if (/because of|due to|owing to|as a result of/.test(correctText)) correctLabel = '🎯 Sebep ifadesi (because of, due to...)'
      else if (/at|in|on/.test(correctText) && /time|o\'clock|night|morning/.test(q.question_text.toLowerCase())) correctLabel = '⏰ Zaman edatı (at, in, on)'

      const options = [
        correctLabel,
        '⏰ Zaman edatı (at, in, on)',
        '📍 Yer edatı (at, in, on, beside)',
        '📎 Fiil/sıfat + edat (Verb Collocation)',
      ].filter((l, i, arr) => arr.indexOf(l) === i).slice(0, 4)

      const ci = options.indexOf(correctLabel)
      return {
        question: 'Boşluktaki edat hangi işlevi görüyor?',
        options,
        correctIndex: ci < 0 ? 0 : ci,
        explanation: 'Doğru edat kalıbını tanımak için fiil-edat kombinasyonlarını ezberlemeniz gerekir.',
      }
    }

    case 'VOCAB': {
      const options = [
        '📗 Olumlu anlam (positive meaning)',
        '📕 Olumsuz anlam (negative meaning)',
        '🔬 Akademik/formal kelime',
        '🔄 Eşanlamlısı aranan kelime',
      ]
      return {
        question: 'Boşluğa nasıl bir anlam taşıyan kelime gelmelidir?',
        options,
        correctIndex: 0,
        explanation: `Kalıp: "${q.pattern}" — ${q.meaning_tr || 'Anlam bağlamdan çıkarılmalı.'}`,
      }
    }

    case 'PHRASAL': {
      const options = [
        '📈 Artış / İlerleme (go up, increase, set up)',
        '🛑 Bitme / Tükenme (run out, break down, give up)',
        '🔁 Geri Dönme / Değişim (turn back, come across)',
        '▶️ Devam / Sürdürme (carry on, go on, keep up)',
      ]
      return {
        question: 'Eylem öbeği bağlamda hangi anlamı taşımalıdır?',
        options,
        correctIndex: 0,
        explanation: `Doğru cevap: "${q.options[q.correct_answer]}" — ${q.meaning_tr || q.pattern}`,
      }
    }

    default:
      return {
        question: 'Boşluğa hangi türde kelime gelir?',
        options: ['Fiil (verb)', 'İsim (noun)', 'Sıfat (adjective)', 'Zarf (adverb)'],
        correctIndex: 0,
        explanation: '',
      }
  }
}

// Classify what type of word/phrase an option represents
function classifyOption(text: string, category: string): string {
  const t = text.toLowerCase()
  if (category === 'LINKER') {
    if (/although|though|even though|despite|in spite of|whereas|while|nevertheless|nonetheless|however/.test(t)) return 'Karşıtlık bağlacı'
    if (/moreover|furthermore|in addition|besides|also|not only|what is more/.test(t)) return 'Ekleme bağlacı'
    if (/because|since|due to|owing to|as a result of/.test(t)) return 'Sebep bağlacı'
    if (/therefore|thus|hence|consequently|as a result|accordingly/.test(t)) return 'Sonuç bağlacı'
    if (/if|unless|provided that|as long as/.test(t)) return 'Koşul bağlacı'
    return 'Bağlaç'
  }
  if (category === 'GRAMMAR') {
    if (/has|have/.test(t) && /been|done|had/.test(t)) return 'Present Perfect'
    if (/had/.test(t)) return 'Past Perfect'
    if (/will/.test(t)) return 'Future'
    if (/would|could|might|should/.test(t)) return 'Modal/Conditional'
    if (/ing$/.test(t)) return 'Present Participle / Gerund'
    return 'Dilbilgisi yapısı'
  }
  return ''
}

// ─── Highlighted Text ─────────────────────────────────────────────────────────

function HighlightedText({ text, clueWords }: { text: string; clueWords: string[] }) {
  if (clueWords.length === 0) {
    // Just highlight the blank
    const parts = text.split(/(_+|\.{3,})/)
    return (
      <span>
        {parts.map((p, i) =>
          /^_+$|^\.{3,}$/.test(p)
            ? <span key={i} className="bg-[#FFD900] text-[#3C3C3C] font-black px-1 rounded mx-0.5">{p}</span>
            : <span key={i}>{p}</span>
        )}
      </span>
    )
  }

  // Build a regex to match blank OR any clue word (longest first to avoid partial matches)
  const sorted = [...clueWords].sort((a, b) => b.length - a.length)
  const blanks = '_+|\\.{3,}'
  const pattern = new RegExp(`(${blanks}|${sorted.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')

  const parts = text.split(pattern)
  return (
    <span>
      {parts.map((p, i) => {
        if (/^_+$|^\.{3,}$/.test(p))
          return <span key={i} className="bg-[#FFD900] text-[#3C3C3C] font-black px-1 rounded mx-0.5">{p}</span>
        if (sorted.some(w => w.toLowerCase() === p.toLowerCase()))
          return <span key={i} className="bg-[#1CB0F6]/20 text-[#1CB0F6] font-bold underline decoration-dotted rounded px-0.5">{p}</span>
        return <span key={i}>{p}</span>
      })}
    </span>
  )
}

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEP_LABELS = ['Tür', 'İpucu', 'Eksik', 'Seçenek', 'Cevap', 'Neden?']

function StepDots({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step
        const done    = n < current
        const active  = n === current
        return (
          <div key={n} className="flex flex-col items-center gap-0.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all
              ${done   ? 'bg-[#58CC02] text-white'
              : active ? 'bg-[#1CB0F6] text-white scale-110 shadow-md'
              :          'bg-[#E5E5E5] text-[#AFAFAF]'}`}>
              {done ? '✓' : n}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-wide ${active ? 'text-[#1CB0F6]' : 'text-[#AFAFAF]'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface GuidedSolveProps {
  question: Question
  onFinish: () => void
}

export default function GuidedSolve({ question: q, onFinish }: GuidedSolveProps) {
  const [step, setStep]               = useState<Step>(1)
  const [step3Answer, setStep3Answer] = useState<number | null>(null)
  const [optVisible, setOptVisible]   = useState<number>(0)

  const missingQ = useMemo(() => getMissingQuestion(q), [q])

  const meta       = CAT_META[q.category] ?? CAT_META['VOCAB']
  const clues      = getClueWords(q)
  const opts       = Object.entries(q.options)
  const correctKey = q.correct_answer

  const next = () => setStep(s => Math.min(6, (s + 1)) as Step)
  const prev = () => setStep(s => Math.max(1, (s - 1)) as Step)

  // ── Step 1: Detect type ──────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-5 animate-slide-up">
      <div className="text-center space-y-1">
        <p className="text-4xl">{meta.emoji}</p>
        <h2 className="text-xl font-black text-[#3C3C3C]">{meta.title}</h2>
        <p className="text-sm font-semibold text-[#AFAFAF]">{meta.desc}</p>
      </div>

      <div className="card p-5 border-b-4 border-[#E5E5E5] space-y-2">
        <span className={`inline-block text-xs font-black px-3 py-1 rounded-full ${CAT_BADGE[q.category] ?? 'bg-gray-100 text-gray-600'}`}>
          {q.category}
        </span>
        <p className="text-sm font-bold leading-relaxed text-[#3C3C3C]">
          <HighlightedText text={q.question_text} clueWords={[]} />
        </p>
      </div>

      <div className="card p-4 border-l-4 border-[#1CB0F6] bg-blue-50 space-y-1">
        <p className="text-xs font-black text-[#1CB0F6] uppercase tracking-wide">Bu soru ne test ediyor?</p>
        <p className="text-sm font-semibold text-[#3C3C3C]">{meta.desc}</p>
        {q.pattern && (
          <p className="text-xs text-[#AFAFAF] font-semibold mt-1">Kalıp: <span className="text-[#3C3C3C]">{q.pattern}</span></p>
        )}
      </div>

      <button onClick={next} className="btn-duo">İpuçlarını Bul →</button>
    </div>
  )

  // ── Step 2: Highlight clues ───────────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-lg font-black text-[#3C3C3C]">🔍 İpuçlarını Bul</h2>
        <p className="text-sm text-[#AFAFAF] font-semibold mt-0.5">Mavi vurgular size ipucu veriyor.</p>
      </div>

      <div className="card p-5 border-b-4 border-[#E5E5E5]">
        <p className="text-sm font-bold leading-relaxed text-[#3C3C3C]">
          <HighlightedText text={q.question_text} clueWords={clues} />
        </p>
      </div>

      {clues.length > 0 ? (
        <div className="card p-4 border-l-4 border-[#1CB0F6] bg-blue-50 space-y-2">
          <p className="text-xs font-black text-[#1CB0F6] uppercase tracking-wide">Tespit Edilen İpuçları</p>
          <div className="flex flex-wrap gap-2">
            {clues.map(w => (
              <span key={w} className="bg-[#1CB0F6]/15 text-[#1CB0F6] text-xs font-bold px-2 py-1 rounded-lg border border-[#1CB0F6]/30">
                {w}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-4 border-l-4 border-[#FFD900] bg-yellow-50">
          <p className="text-xs font-black text-[#CE9B00] uppercase tracking-wide">İpucu Stratejisi</p>
          <p className="text-sm font-semibold text-[#3C3C3C] mt-1">{meta.clueHint}</p>
        </div>
      )}

      <div className="card p-4 bg-[#F0F4F8] space-y-1">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Ne aramalısınız?</p>
        <p className="text-sm font-semibold text-[#3C3C3C]">{meta.clueHint}</p>
      </div>

      <div className="flex gap-3">
        <button onClick={prev} className="btn-duo btn-duo-ghost flex-shrink-0 w-20">← Geri</button>
        <button onClick={next} className="btn-duo flex-1">Eksik Nedir? →</button>
      </div>
    </div>
  )

  // ── Step 3: What's missing ───────────────────────────────────────────────

  const renderStep3 = () => {
    if (!missingQ) return null
    const answered = step3Answer !== null
    const isRight  = answered && step3Answer === missingQ.correctIndex

    return (
      <div className="space-y-5 animate-slide-up">
        <div>
          <h2 className="text-lg font-black text-[#3C3C3C]">🤔 Eksik Ne?</h2>
          <p className="text-sm text-[#AFAFAF] font-semibold mt-0.5">Doğru seçeneği işaretleyin.</p>
        </div>

        <div className="card p-4 border-b-4 border-[#E5E5E5]">
          <p className="text-sm font-bold leading-relaxed text-[#3C3C3C]">
            <HighlightedText text={q.question_text} clueWords={clues} />
          </p>
        </div>

        <p className="font-black text-[#3C3C3C]">{missingQ.question}</p>

        <div className="space-y-2">
          {missingQ.options.map((opt, i) => {
            let cls = 'w-full text-left px-4 py-3 rounded-2xl border-2 border-b-4 font-bold text-sm transition-all'
            if (!answered) {
              cls += ' border-[#E5E5E5] bg-white text-[#3C3C3C] border-b-[#CCCCCC] active:border-b-[#E5E5E5] active:translate-y-[2px]'
            } else if (i === missingQ.correctIndex) {
              cls += ' border-[#58CC02] bg-[#D7FFB8] text-[#46A302] border-b-[#46A302]'
            } else if (i === step3Answer) {
              cls += ' border-[#FF4B4B] bg-red-50 text-[#FF4B4B] border-b-[#EA2B2B]'
            } else {
              cls += ' border-[#E5E5E5] bg-white text-[#CCCCCC] border-b-[#E5E5E5]'
            }
            return (
              <button key={i} disabled={answered} onClick={() => setStep3Answer(i)} className={cls}>
                {answered && i === missingQ.correctIndex && <span className="mr-2">✓</span>}
                {answered && i === step3Answer && i !== missingQ.correctIndex && <span className="mr-2">✗</span>}
                {opt}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className={`card p-4 border-l-4 animate-slide-up ${isRight ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-[#FF4B4B] bg-red-50'}`}>
            <p className={`text-sm font-black ${isRight ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
              {isRight ? '✓ Harika! Doğru tespit!' : '✗ Yanlış — ama öğrenmek için buradayız!'}
            </p>
            <p className="text-sm font-semibold text-[#3C3C3C]/80 mt-1">{missingQ.explanation}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={prev} className="btn-duo btn-duo-ghost flex-shrink-0 w-20">← Geri</button>
          <button
            onClick={next}
            disabled={!answered}
            className="btn-duo flex-1"
          >
            Seçenekleri İncele →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 4: Option analysis ───────────────────────────────────────────────

  const renderStep4 = () => (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-lg font-black text-[#3C3C3C]">🔬 Seçenek Analizi</h2>
        <p className="text-sm text-[#AFAFAF] font-semibold mt-0.5">Her seçeneği tek tek inceleyin.</p>
      </div>

      <div className="card p-4 border-b-4 border-[#E5E5E5]">
        <p className="text-sm font-bold leading-relaxed text-[#3C3C3C]">
          <HighlightedText text={q.question_text} clueWords={clues} />
        </p>
      </div>

      <div className="space-y-3">
        {opts.map(([k, v], i) => {
          const revealed  = i < optVisible
          const isCorrect = k === correctKey
          const typeLabel = classifyOption(v, q.category)

          if (!revealed) {
            return (
              <button
                key={k}
                onClick={() => setOptVisible(i + 1)}
                className="w-full text-left px-5 py-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] text-[#AFAFAF] font-bold text-sm flex items-center gap-3 active:bg-gray-50"
              >
                <span className="font-black text-base opacity-50">{k}</span>
                <span>Dokunarak incele</span>
              </button>
            )
          }

          return (
            <div
              key={k}
              className={`card p-4 border-l-4 animate-slide-up space-y-1
                ${isCorrect ? 'border-[#58CC02] bg-[#D7FFB8]/30' : 'border-[#FF4B4B] bg-red-50/30'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-base text-[#3C3C3C]/50">{k})</span>
                  <span className="font-bold text-[#3C3C3C]">{v}</span>
                </div>
                <span className={`text-lg flex-shrink-0 ${isCorrect ? 'text-[#58CC02]' : 'text-[#FF4B4B]'}`}>
                  {isCorrect ? '✓' : '✗'}
                </span>
              </div>
              {typeLabel && (
                <p className="text-xs font-bold text-[#AFAFAF] ml-6">→ {typeLabel}</p>
              )}
              {isCorrect && q.meaning_tr && (
                <p className="text-xs font-semibold text-[#46A302] ml-6">🇹🇷 {q.meaning_tr}</p>
              )}
            </div>
          )
        })}
      </div>

      {optVisible < opts.length && (
        <p className="text-center text-xs text-[#AFAFAF] font-semibold">
          {opts.length - optVisible} seçenek kaldı — dokunarak aç
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={prev} className="btn-duo btn-duo-ghost flex-shrink-0 w-20">← Geri</button>
        <button onClick={next} className="btn-duo flex-1">Cevabı Gör →</button>
      </div>
    </div>
  )

  // ── Step 5: Reveal answer ─────────────────────────────────────────────────

  const correctText = q.options[correctKey] ?? ''
  const filledSentence = q.question_text.replace(/(_+|\.{3,})/, `[${correctKey}) ${correctText}]`)

  const renderStep5 = () => (
    <div className="space-y-5 animate-slide-up">
      <div className="text-center">
        <p className="text-5xl">🏆</p>
        <h2 className="text-xl font-black text-[#3C3C3C] mt-2">Doğru Cevap</h2>
      </div>

      <div className="card p-5 border-4 border-[#58CC02] bg-[#D7FFB8] space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-[#46A302]">{correctKey}</span>
          <span className="text-lg font-black text-[#3C3C3C]">{correctText}</span>
        </div>
        {q.meaning_tr && (
          <p className="text-sm font-semibold text-[#3C3C3C]/80">🇹🇷 {q.meaning_tr}</p>
        )}
        {q.pattern && (
          <p className="text-xs text-[#46A302] font-bold">Kalıp: {q.pattern}</p>
        )}
      </div>

      <div className="card p-4 border-b-4 border-[#E5E5E5]">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide mb-2">Dolu Cümle</p>
        <p className="text-sm font-bold leading-relaxed text-[#3C3C3C]">{filledSentence}</p>
      </div>

      {q.short_explanation && (
        <div className="card p-4 border-l-4 border-[#58CC02] bg-green-50">
          <p className="text-xs font-black text-[#46A302] uppercase tracking-wide">Açıklama</p>
          <p className="text-sm font-semibold text-[#3C3C3C] mt-1">{q.short_explanation}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={prev} className="btn-duo btn-duo-ghost flex-shrink-0 w-20">← Geri</button>
        <button onClick={next} className="btn-duo flex-1">Neden Diğerleri Yanlış? →</button>
      </div>
    </div>
  )

  // ── Step 6: Why others are wrong ─────────────────────────────────────────

  const renderStep6 = () => (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-lg font-black text-[#3C3C3C]">❓ Neden Diğerleri Yanlış?</h2>
        <p className="text-sm text-[#AFAFAF] font-semibold mt-0.5">Her yanlış seçeneğin sebebini anlayın.</p>
      </div>

      {q.trap && (
        <div className="card p-4 border-l-4 border-[#FFD900] bg-yellow-50">
          <p className="text-xs font-black text-[#CE9B00] uppercase tracking-wide">⚠️ Tuzak</p>
          <p className="text-sm font-semibold text-[#3C3C3C] mt-1">{q.trap}</p>
        </div>
      )}

      <div className="space-y-3">
        {opts
          .filter(([k]) => k !== correctKey)
          .map(([k, v]) => {
            const isDistractor = q.closest_distractors?.includes(k)
            const typeLabel = classifyOption(v, q.category)
            return (
              <div key={k} className="card p-4 border-l-4 border-[#FF4B4B] bg-red-50/40 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#FF4B4B]">✗ {k})</span>
                  <span className="font-bold text-[#3C3C3C]">{v}</span>
                  {isDistractor && (
                    <span className="ml-auto text-[10px] font-black text-[#FF4B4B] bg-red-100 px-2 py-0.5 rounded-full">YANILTICI</span>
                  )}
                </div>
                {typeLabel && (
                  <p className="text-xs font-semibold text-[#AFAFAF] ml-5">Tür: {typeLabel}</p>
                )}
                {isDistractor && (
                  <p className="text-xs font-semibold text-[#FF4B4B]/80 ml-5">
                    Bu seçenek çok yanıltıcı — dikkatli olun!
                  </p>
                )}
              </div>
            )
          })}
      </div>

      {q.example_en && (
        <div className="card p-4 bg-[#F0F4F8] space-y-1">
          <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Örnek Kullanım</p>
          <p className="text-sm font-semibold text-[#3C3C3C] italic">{q.example_en}</p>
          {q.example_tr && (
            <p className="text-xs text-[#AFAFAF] font-semibold">🇹🇷 {q.example_tr}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={prev} className="btn-duo btn-duo-ghost flex-shrink-0 w-20">← Geri</button>
        <button onClick={onFinish} className="btn-duo flex-1">✓ Tamamla</button>
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <StepDots current={step} />

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
    </div>
  )
}
