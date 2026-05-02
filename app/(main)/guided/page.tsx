'use client'
import { useEffect, useState } from 'react'
import type { ExamData, ExamQuestion } from '@/lib/types'
import {
  detectMissingType, extractClueWords, highlightClues, detectLogicKey,
  generateOptionAnalysis,
  MISSING_TYPE_INFO, LOGIC_DEFINITIONS, STEP_ORDER, STEP_LABELS,
  type MissingType, type GuidedStep, type OptionAnalysis,
} from '@/lib/guided-engine'

// ── Step progress bar ─────────────────────────────────────────────────────────
function StepDots({ current }: { current: GuidedStep }) {
  const idx = STEP_ORDER.indexOf(current)
  return (
    <div className="flex items-center gap-1.5">
      {STEP_ORDER.map((s, i) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all ${
            i < idx ? 'w-6 bg-[#58CC02]' :
            i === idx ? 'w-8 bg-[#1CB0F6]' :
            'w-2 bg-[#E5E5E5]'
          }`}
        />
      ))}
    </div>
  )
}

// ── Highlighted sentence ──────────────────────────────────────────────────────
function HighlightedText({ text, highlightClue }: { text: string; highlightClue: boolean }) {
  const clues = extractClueWords(text)
  const parts = highlightClue ? highlightClues(text, clues) : [{ text }]

  return (
    <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">
      {parts.map((p, i) =>
        p.clue ? (
          <span
            key={i}
            className={`${p.clue.color} px-1 rounded font-black`}
            title={p.clue.explanation}
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  )
}

// ── Main guided page ──────────────────────────────────────────────────────────
export default function GuidedSolvePage() {
  const [exam, setExam]   = useState<ExamData | null>(null)
  const [qIdx, setQIdx]   = useState(0)
  const [step, setStep]   = useState<GuidedStep>('what_missing')
  const [score, setScore] = useState({ correct: 0, total: 0 })

  // Per-step state
  const [missingGuess, setMissingGuess]   = useState<MissingType | null>(null)
  const [logicGuess, setLogicGuess]       = useState<string | null>(null)
  const [scanIdx, setScanIdx]             = useState(0)
  const [chosen, setChosen]               = useState<string | null>(null)
  const [feedbackVisible, setFeedbackVisible] = useState(false)

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

  const questions = exam.questions.filter(q =>
    ['fill_blank_vocab','sentence_completion','paragraph_completion','cloze'].includes(q.section_key)
  )
  const q = questions[qIdx % questions.length]

  const missingType  = detectMissingType(q)
  const clues        = extractClueWords(q.question_text ?? '')
  const logicKey     = detectLogicKey(q)
  const logic        = LOGIC_DEFINITIONS[logicKey]
  const missingInfo  = MISSING_TYPE_INFO[missingType]
  const optAnalysis  = generateOptionAnalysis(q)

  function advanceStep() {
    const i = STEP_ORDER.indexOf(step)
    if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1])
  }

  function nextQuestion() {
    setQIdx(i => i + 1)
    setStep('what_missing')
    setMissingGuess(null)
    setLogicGuess(null)
    setScanIdx(0)
    setChosen(null)
    setFeedbackVisible(false)
  }

  const stepNum  = STEP_ORDER.indexOf(step) + 1
  const totalSteps = STEP_ORDER.length

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between pt-1 gap-3">
        <div>
          <h1 className="text-xl font-black text-[#3C3C3C]">🧠 Rehberli Çözüm</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">Adım adım düşünmeyi öğren</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-black text-[#AFAFAF]">Soru {(qIdx % questions.length) + 1}/{questions.length}</div>
          <div className="text-xs font-bold text-[#58CC02]">{score.correct}/{score.total} doğru</div>
        </div>
      </div>

      {/* Step progress */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wide">
            Adım {stepNum}/{totalSteps} — {STEP_LABELS[step]}
          </span>
          <span className="text-[10px] font-black text-[#1CB0F6]">Q{q.question_number} · {q.section_name}</span>
        </div>
        <StepDots current={step} />
      </div>

      {/* Question text (always visible) */}
      <div className="card p-4 space-y-2">
        <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wide">Soru Metni</p>
        <HighlightedText text={q.question_text ?? ''} highlightClue={step !== 'what_missing'} />
        {!q.is_correct && (
          <span className="inline-block text-[10px] font-black bg-red-100 text-[#FF4B4B] px-2 py-0.5 rounded-full">
            ❌ Sınavda yanlış yaptın
          </span>
        )}
      </div>

      {/* ── STEP 1: What is missing? ── */}
      {step === 'what_missing' && (
        <WhatMissingStep
          correctType={missingType}
          guess={missingGuess}
          onGuess={(g) => {
            setMissingGuess(g)
            setFeedbackVisible(true)
          }}
          onNext={() => { setFeedbackVisible(false); advanceStep() }}
          feedbackVisible={feedbackVisible}
        />
      )}

      {/* ── STEP 2: Clue words ── */}
      {step === 'clue_words' && (
        <ClueWordsStep
          clues={clues}
          missingInfo={missingInfo}
          onNext={advanceStep}
        />
      )}

      {/* ── STEP 3: Logic type ── */}
      {step === 'logic_type' && (
        <LogicTypeStep
          correctKey={logicKey}
          missingType={missingType}
          guess={logicGuess}
          onGuess={(g) => { setLogicGuess(g); setFeedbackVisible(true) }}
          onNext={() => { setFeedbackVisible(false); advanceStep() }}
          feedbackVisible={feedbackVisible}
        />
      )}

      {/* ── STEP 4: Option scan ── */}
      {step === 'option_scan' && (
        <OptionScanStep
          analyses={optAnalysis}
          scanIdx={scanIdx}
          onNext={(i) => {
            if (i >= optAnalysis.length - 1) advanceStep()
            else setScanIdx(i + 1)
          }}
        />
      )}

      {/* ── STEP 5: Choose answer ── */}
      {step === 'choose' && (
        <ChooseStep
          q={q}
          analyses={optAnalysis}
          chosen={chosen}
          onChoose={(c) => {
            setChosen(c)
            setScore(s => ({
              correct: s.correct + (c === q.correct_answer ? 1 : 0),
              total: s.total + 1,
            }))
            setFeedbackVisible(true)
          }}
          onNext={() => { setFeedbackVisible(false); advanceStep() }}
          feedbackVisible={feedbackVisible}
        />
      )}

      {/* ── STEP 6: Full explanation ── */}
      {step === 'explanation' && (
        <ExplanationStep
          q={q}
          chosen={chosen}
          analyses={optAnalysis}
          missingInfo={missingInfo}
          logic={logic}
          logicKey={logicKey}
          onNext={nextQuestion}
        />
      )}
    </div>
  )
}

// ── Step 1: What is missing? ──────────────────────────────────────────────────
const MISSING_OPTIONS: Array<{ type: MissingType; label: string; icon: string; hint: string }> = [
  { type: 'word',        label: 'Kelime (Anlam)',         icon: '📖', hint: 'Anlam/bağlam uyumlu bir sözcük' },
  { type: 'linker',      label: 'Bağlaç (Discourse)',     icon: '🔗', hint: 'İki fikri bağlayan işaret' },
  { type: 'grammar',     label: 'Dilbilgisi (Yapı)',      icon: '⚙️', hint: 'Fiil zamanı veya yapısı' },
  { type: 'preposition', label: 'Edat (Preposition)',     icon: '🔧', hint: 'Fiil + edat kalıbı' },
]

function WhatMissingStep({
  correctType, guess, onGuess, onNext, feedbackVisible,
}: {
  correctType: MissingType; guess: MissingType | null
  onGuess: (g: MissingType) => void; onNext: () => void; feedbackVisible: boolean
}) {
  const isRight = guess === correctType
  return (
    <div className="space-y-3 animate-slide-up">
      <div className="card p-4 space-y-1">
        <p className="text-sm font-black text-[#3C3C3C]">❓ Boşluğa ne geliyor?</p>
        <p className="text-xs font-semibold text-[#AFAFAF]">Seçeneklere bakmadan önce tahmin et.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MISSING_OPTIONS.map(o => {
          const picked = guess === o.type
          const correct = feedbackVisible && o.type === correctType
          const wrong   = feedbackVisible && picked && !correct
          return (
            <button
              key={o.type}
              onClick={() => !feedbackVisible && onGuess(o.type)}
              disabled={feedbackVisible}
              className={`card p-4 text-left space-y-1 border-b-4 transition-all active:translate-y-[2px] active:border-b-[1px] ${
                correct ? 'border-[#58CC02] bg-[#D7FFB8]' :
                wrong   ? 'border-[#FF4B4B] bg-red-50' :
                picked  ? 'border-[#1CB0F6] bg-blue-50' :
                'border-[#E5E5E5]'
              }`}
            >
              <div className="text-2xl">{o.icon}</div>
              <div className="text-xs font-black text-[#3C3C3C]">{o.label}</div>
              <div className="text-[10px] font-semibold text-[#AFAFAF]">{o.hint}</div>
            </button>
          )
        })}
      </div>

      {feedbackVisible && (
        <div className={`card p-4 space-y-2 border-l-4 animate-slide-up ${isRight ? 'border-[#58CC02]' : 'border-[#FF4B4B]'}`}>
          <p className={`font-black text-sm ${isRight ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
            {isRight ? '✅ Doğru!' : `❌ Aslında: ${MISSING_TYPE_INFO[correctType].label}`}
          </p>
          <div className={`rounded-xl p-3 ${MISSING_TYPE_INFO[correctType].color}`}>
            <p className="text-xs font-black text-[#3C3C3C]">{MISSING_TYPE_INFO[correctType].icon} {MISSING_TYPE_INFO[correctType].label}</p>
            <p className="text-xs font-semibold text-[#3C3C3C] mt-1">{MISSING_TYPE_INFO[correctType].description}</p>
            <p className="text-xs font-bold text-[#1CB0F6] mt-1">🎯 Strateji: {MISSING_TYPE_INFO[correctType].strategy}</p>
          </div>
          <button onClick={onNext} className="btn-duo py-2.5 text-sm">
            Sonraki Adım →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Step 2: Clue words ────────────────────────────────────────────────────────
function ClueWordsStep({
  clues, missingInfo, onNext,
}: {
  clues: ReturnType<typeof extractClueWords>
  missingInfo: typeof MISSING_TYPE_INFO[keyof typeof MISSING_TYPE_INFO]
  onNext: () => void
}) {
  const TYPE_LABELS = {
    contrast: '↔️ Zıtlık',
    cause: '⬅️ Neden',
    result: '➡️ Sonuç',
    addition: '➕ Ek',
    time: '⏱️ Zaman',
    negative: '🚫 Olumsuz',
    reference: '🔗 Referans',
    emphasis: '⭐ Vurgu',
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="card p-4 space-y-1">
        <p className="text-sm font-black text-[#3C3C3C]">🔍 İpucu Kelimeler</p>
        <p className="text-xs font-semibold text-[#AFAFAF]">Cümledeki renkli kelimeler sana ne söylüyor?</p>
      </div>

      {clues.length > 0 ? (
        <div className="space-y-2">
          {clues.map((c, i) => (
            <div key={i} className="card p-3 flex items-start gap-3">
              <span className={`${c.color} px-2 py-0.5 rounded text-xs font-black shrink-0`}>
                {c.word}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-[#AFAFAF] uppercase">
                  {TYPE_LABELS[c.type] ?? c.type}
                </p>
                <p className="text-xs font-semibold text-[#3C3C3C]">{c.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-4 text-center space-y-2">
          <div className="text-2xl">🤫</div>
          <p className="text-sm font-black text-[#3C3C3C]">Belirgin ipucu kelime yok</p>
          <p className="text-xs font-semibold text-[#AFAFAF]">Genel anlam ve bağlama odaklan — {missingInfo.strategy}</p>
        </div>
      )}

      <div className={`rounded-xl p-3 ${missingInfo.color}`}>
        <p className="text-[10px] font-black text-[#3C3C3C] uppercase mb-1">Bu tip için strateji:</p>
        <p className="text-xs font-semibold text-[#3C3C3C]">{missingInfo.strategy}</p>
      </div>

      <button onClick={onNext} className="btn-duo py-2.5 text-sm">
        Mantık Tipine Geç →
      </button>
    </div>
  )
}

// ── Step 3: Logic type ────────────────────────────────────────────────────────
const LOGIC_OPTIONS = [
  { key: 'contrast',     label: '↔️ Zıtlık',       desc: 'Öncekiyle çelişiyor' },
  { key: 'cause_effect', label: '➡️ Neden-Sonuç',   desc: 'Öncekinin sonucu' },
  { key: 'addition',     label: '➕ Ek Bilgi',      desc: 'Aynı yönde devam' },
  { key: 'topic_cont',   label: '🔗 Konu Devamı',  desc: 'Konuyu sürdürüyor' },
  { key: 'grammar_focus',label: '⚙️ Yapı Odaklı',  desc: 'Dilbilgisi belirliyor' },
  { key: 'none',         label: '❓ Belirsiz',       desc: 'Emin değilim' },
]

function LogicTypeStep({
  correctKey, missingType, guess, onGuess, onNext, feedbackVisible,
}: {
  correctKey: string; missingType: MissingType
  guess: string | null; onGuess: (g: string) => void; onNext: () => void; feedbackVisible: boolean
}) {
  const isRight = guess === correctKey
  const correctLogic = LOGIC_DEFINITIONS[correctKey as keyof typeof LOGIC_DEFINITIONS]

  if (missingType === 'grammar') {
    return (
      <div className="space-y-3 animate-slide-up">
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50 space-y-2">
          <p className="text-sm font-black text-[#3C3C3C]">⚙️ Dilbilgisi sorusu</p>
          <p className="text-xs font-semibold text-[#3C3C3C]">Mantık tipi yerine yapıya bak: aktif mi pasif mi? Önceki eylem tamamlanmış mı devam ediyor mu? Zaman uyumu var mı?</p>
        </div>
        <button onClick={onNext} className="btn-duo py-2.5 text-sm">Seçenek Analizine Geç →</button>
      </div>
    )
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="card p-4 space-y-1">
        <p className="text-sm font-black text-[#3C3C3C]">🧩 Cümlenin mantık tipi ne?</p>
        <p className="text-xs font-semibold text-[#AFAFAF]">İpucu kelimelere ve genel anlama göre tahmin et.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {LOGIC_OPTIONS.map(o => {
          const picked  = guess === o.key
          const correct = feedbackVisible && o.key === correctKey
          const wrong   = feedbackVisible && picked && !correct
          return (
            <button
              key={o.key}
              onClick={() => !feedbackVisible && onGuess(o.key)}
              disabled={feedbackVisible}
              className={`card p-3 text-left border-b-4 transition-all active:translate-y-[2px] active:border-b-[1px] ${
                correct ? 'border-[#58CC02] bg-[#D7FFB8]' :
                wrong   ? 'border-[#FF4B4B] bg-red-50' :
                picked  ? 'border-[#1CB0F6] bg-blue-50' :
                'border-[#E5E5E5]'
              }`}
            >
              <p className="text-xs font-black text-[#3C3C3C]">{o.label}</p>
              <p className="text-[10px] font-semibold text-[#AFAFAF]">{o.desc}</p>
            </button>
          )
        })}
      </div>

      {feedbackVisible && correctLogic && (
        <div className={`card p-4 space-y-2 border-l-4 animate-slide-up ${isRight ? 'border-[#58CC02]' : 'border-[#FF4B4B]'}`}>
          <p className={`font-black text-sm ${isRight ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
            {isRight
              ? '✅ Doğru!'
              : `❌ "${LOGIC_OPTIONS.find(o => o.key === guess)?.label}" seçtin — bu cümle "${correctLogic.label}" gerektiriyor`
            }
          </p>
          <div className={`rounded-xl p-3 ${correctLogic.color}`}>
            <p className="text-xs font-black text-[#3C3C3C]">{correctLogic.icon} {correctLogic.label}</p>
            <p className="text-xs font-semibold text-[#3C3C3C] mt-1">{correctLogic.description}</p>
          </div>
          <button onClick={onNext} className="btn-duo py-2.5 text-sm">
            Seçenekleri İncele →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Step 4: Option scan ───────────────────────────────────────────────────────
function OptionScanStep({
  analyses, scanIdx, onNext,
}: {
  analyses: OptionAnalysis[]
  scanIdx: number
  onNext: (next: number) => void
}) {
  const opt = analyses[scanIdx]
  const isLast = scanIdx >= analyses.length - 1

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="card p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-[#3C3C3C]">🔎 Seçenek Analizi</p>
          <span className="text-xs font-black text-[#AFAFAF]">{scanIdx + 1}/{analyses.length}</span>
        </div>
        <p className="text-xs font-semibold text-[#AFAFAF]">Her seçeneği neden doğru ya da yanlış olabileceğini analiz et.</p>
      </div>

      {/* Option card */}
      <div className="card p-5 space-y-4 border-b-4 border-[#1CB0F6]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1CB0F6] flex items-center justify-center text-white font-black text-lg shrink-0">
            {opt.letter}
          </div>
          <p className="text-sm font-semibold text-[#3C3C3C] leading-snug">{opt.text}</p>
        </div>

        {opt.clues.length > 0 && (
          <div className="bg-[#F8F8F8] rounded-xl p-3">
            <p className="text-[10px] font-black text-[#AFAFAF] uppercase mb-1">Bilgi:</p>
            {opt.clues.map((c, i) => (
              <p key={i} className="text-xs font-semibold text-[#3C3C3C]">• {c}</p>
            ))}
          </div>
        )}

        <div className="bg-[#FFF9DB] rounded-xl p-3">
          <p className="text-[10px] font-black text-amber-700 uppercase mb-1">✓ Neden uyabilir?</p>
          <p className="text-xs font-semibold text-[#3C3C3C]">{opt.couldBe}</p>
        </div>

        {opt.whyNot && (
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-[10px] font-black text-[#FF4B4B] uppercase mb-1">✗ Neden uymaz?</p>
            <p className="text-xs font-semibold text-[#3C3C3C]">{opt.whyNot}</p>
          </div>
        )}
      </div>

      {/* Remaining mini-list */}
      {scanIdx < analyses.length - 1 && (
        <div className="flex gap-2 flex-wrap">
          {analyses.slice(scanIdx + 1).map((a, i) => (
            <div key={a.letter} className="text-[11px] font-black bg-[#F0F0F0] text-[#AFAFAF] px-2 py-1 rounded-lg">
              {a.letter}) {a.text.slice(0, 20)}{a.text.length > 20 ? '…' : ''}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => onNext(scanIdx)} className="btn-duo py-2.5 text-sm">
        {isLast ? 'Cevabı Seç →' : `Sonraki Seçenek: ${analyses[scanIdx + 1]?.letter}) →`}
      </button>
    </div>
  )
}

// ── Step 5: Choose answer ─────────────────────────────────────────────────────
function ChooseStep({
  q, analyses, chosen, onChoose, onNext, feedbackVisible,
}: {
  q: ExamQuestion; analyses: OptionAnalysis[]
  chosen: string | null; onChoose: (c: string) => void; onNext: () => void; feedbackVisible: boolean
}) {
  const isRight = chosen === q.correct_answer

  const optStyle = (letter: string) => {
    if (!feedbackVisible) return chosen === letter ? 'border-[#1CB0F6] bg-blue-50' : 'border-[#E5E5E5] bg-white text-[#3C3C3C]'
    if (letter === q.correct_answer) return 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302] font-black'
    if (letter === chosen) return 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
    return 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]'
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="card p-4 space-y-1">
        <p className="text-sm font-black text-[#3C3C3C]">
          {feedbackVisible ? (isRight ? '✅ Harika!' : '❌ Yanlış') : '🎯 Şimdi cevabını seç!'}
        </p>
        <p className="text-xs font-semibold text-[#AFAFAF]">
          {feedbackVisible ? '' : 'Analiz ettiğin seçeneklere dayanarak tahminini yap.'}
        </p>
      </div>

      <div className="space-y-2">
        {analyses.map(a => (
          <button
            key={a.letter}
            onClick={() => !feedbackVisible && !chosen && onChoose(a.letter)}
            disabled={feedbackVisible || !!chosen}
            className={`w-full text-left p-3.5 rounded-2xl border-2 border-b-4 text-sm font-semibold transition-all active:translate-y-[2px] active:border-b-[1px] ${optStyle(a.letter)}`}
          >
            <span className="font-black mr-2">{a.letter})</span>{a.text}
          </button>
        ))}
      </div>

      {feedbackVisible && (
        <div className={`card p-4 border-l-4 animate-slide-up ${isRight ? 'border-[#58CC02]' : 'border-[#FF4B4B]'}`}>
          <p className={`font-black text-sm mb-2 ${isRight ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
            {isRight ? '✅ Doğru cevabı buldun!' : `❌ Doğru cevap: ${q.correct_answer})`}
          </p>
          <p className="text-xs font-semibold text-[#AFAFAF]">
            {isRight ? 'Analiz sürecin seni doğruya götürdü 💪' : 'Açıklama adımında neden öyle olduğunu göreceksin.'}
          </p>
          <button onClick={onNext} className="btn-duo py-2.5 text-sm mt-3">
            Tam Açıklamayı Gör →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Step 6: Full explanation ──────────────────────────────────────────────────
function ExplanationStep({
  q, chosen, analyses, missingInfo, logic, logicKey, onNext,
}: {
  q: ExamQuestion; chosen: string | null; analyses: OptionAnalysis[]
  missingInfo: typeof MISSING_TYPE_INFO[keyof typeof MISSING_TYPE_INFO]
  logic: typeof LOGIC_DEFINITIONS[keyof typeof LOGIC_DEFINITIONS]
  logicKey: string
  onNext: () => void
}) {
  const isRight = chosen === q.correct_answer
  const correctAnalysis = analyses.find(a => a.isCorrect)
  const wrongAnalyses   = analyses.filter(a => !a.isCorrect)
  const chosenAnalysis  = analyses.find(a => a.letter === chosen)

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Result banner */}
      <div className={`card p-4 text-center border-b-4 ${isRight ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-[#FF4B4B] bg-red-50'}`}>
        <div className="text-3xl mb-1">{isRight ? '🎉' : '📚'}</div>
        <p className={`font-black text-base ${isRight ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
          {isRight ? 'Tam isabet!' : `Doğru cevap: ${q.correct_answer})`}
        </p>
      </div>

      {/* Correct answer explanation */}
      <div className="card p-4 space-y-2 border-l-4 border-[#58CC02]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#58CC02] flex items-center justify-center text-white font-black text-sm shrink-0">
            {q.correct_answer}
          </div>
          <p className="text-sm font-black text-[#3C3C3C]">{correctAnalysis?.text}</p>
        </div>
        <p className="text-[10px] font-black text-[#58CC02] uppercase">NEDEN DOĞRU?</p>
        <p className="text-xs font-semibold text-[#3C3C3C]">{correctAnalysis?.couldBe}</p>
        {correctAnalysis?.clues.map((c, i) => (
          <p key={i} className="text-xs font-bold text-[#46A302]">• {c}</p>
        ))}
      </div>

      {/* Logic / type pattern */}
      <div className={`rounded-xl p-4 space-y-1 ${missingInfo.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{missingInfo.icon}</span>
          <span className="text-xs font-black text-[#3C3C3C]">{missingInfo.label}</span>
          {logicKey !== 'grammar_focus' && logicKey !== 'none' && (
            <>
              <span className="text-[#AFAFAF] font-black">·</span>
              <span className="text-lg">{logic.icon}</span>
              <span className="text-xs font-black text-[#3C3C3C]">{logic.label}</span>
            </>
          )}
        </div>
        <p className="text-xs font-semibold text-[#3C3C3C]">🎯 {missingInfo.strategy}</p>
      </div>

      {/* Why chosen was wrong (if incorrect) */}
      {!isRight && chosenAnalysis && (
        <div className="card p-4 space-y-2 border-l-4 border-[#FF4B4B]">
          <p className="text-[10px] font-black text-[#FF4B4B] uppercase">Seçtiğin: {chosenAnalysis.letter}) — Neden Yanlış?</p>
          <p className="text-xs font-semibold text-[#3C3C3C]">{chosenAnalysis.whyNot}</p>
        </div>
      )}

      {/* Wrong options summary */}
      <div className="card p-4 space-y-3">
        <p className="text-[10px] font-black text-[#AFAFAF] uppercase">Diğer Seçenekler — Neden Yanlış?</p>
        {wrongAnalyses.map(a => (
          a.letter !== chosen && (
            <div key={a.letter} className="flex gap-2 items-start">
              <span className="text-[10px] font-black bg-[#F0F0F0] text-[#AFAFAF] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                {a.letter})
              </span>
              <p className="text-xs font-semibold text-[#AFAFAF]">{a.whyNot || 'Bağlama uymuyor'}</p>
            </div>
          )
        ))}
      </div>

      {/* Common patterns */}
      {q.common_patterns?.length > 0 && (
        <div className="bg-[#FFF9DB] rounded-xl p-3">
          <p className="text-[10px] font-black text-amber-700 uppercase mb-2">Kalıplar / Teknik Terimler</p>
          <div className="flex flex-wrap gap-1.5">
            {q.common_patterns.map(p => (
              <span key={p} className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* How to solve tips */}
      {q.how_to_solve_this_type?.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-[10px] font-black text-[#AFAFAF] uppercase">Bu Tip İçin Kural</p>
          <p className="text-xs font-semibold text-[#3C3C3C]">• {q.how_to_solve_this_type[0]}</p>
          {q.how_to_solve_this_type[1] && (
            <p className="text-xs font-semibold text-[#3C3C3C]">• {q.how_to_solve_this_type[1]}</p>
          )}
        </div>
      )}

      <button onClick={onNext} className="btn-duo py-3">
        SONRAKİ SORU →
      </button>
    </div>
  )
}
