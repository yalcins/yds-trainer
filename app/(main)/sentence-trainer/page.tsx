'use client'
import { useEffect, useState } from 'react'
import type { ExamData, ExamQuestion } from '@/lib/types'
import { recordTrainingAnswer } from '@/lib/store'

// ── Logic types ────────────────────────────────────────────────────────────────
const LOGIC_TYPES = {
  contrast:    { label: 'Zıtlık',      icon: '↔️', color: 'border-[#1CB0F6] bg-blue-50',  clues: ['however','although','even though','whereas','while','nevertheless','but','yet','despite'] },
  cause_effect:{ label: 'Neden-Sonuç', icon: '➡️', color: 'border-[#58CC02] bg-[#F0FFF0]', clues: ['therefore','thus','hence','as a result','consequently','since','because'] },
  addition:    { label: 'Ek Bilgi',    icon: '➕', color: 'border-violet-400 bg-violet-50', clues: ['moreover','furthermore','in addition','besides','also','additionally'] },
  exemplify:   { label: 'Örnek',       icon: '📌', color: 'border-amber-400 bg-amber-50',   clues: ['for example','for instance','such as','including'] },
  concession:  { label: 'Kabul-Zıt',  icon: '🔄', color: 'border-rose-400 bg-rose-50',     clues: ['although','even though','while','though','despite'] },
  topic_cont:  { label: 'Konu Devamı',icon: '🔗', color: 'border-[#FFD900] bg-[#FFF9DB]',  clues: ['this','these','it','such','the same'] },
}

type LogicKey = keyof typeof LOGIC_TYPES

// ⚠️  Only uses question text — correct option text is NOT included (would be a spoiler)
function detectLogicType(questionText: string): LogicKey {
  const t = questionText.toLowerCase()
  for (const [key, val] of Object.entries(LOGIC_TYPES)) {
    if (val.clues.some(c => t.includes(c))) return key as LogicKey
  }
  return 'topic_cont'
}

// Returns clue words actually found in the question text for a given logic key
function findCluesInText(text: string, key: LogicKey): string[] {
  const t = text.toLowerCase()
  return LOGIC_TYPES[key].clues.filter(c => t.includes(c))
}

const LOGIC_TIPS: Record<LogicKey, string[]> = {
  contrast:    [
    'Önceki cümlede bir fikir var — doğru seçenek ZITLIK ifadesi içermeli',
    '"however/nevertheless" ile başlayan seçenekleri önceki cümleyle karşılaştır',
    'Konu AYNI kalır, sadece perspektif değişir',
  ],
  cause_effect:[
    'Önceki cümlede bir neden/durum var — doğru seçenek SONUCU verir',
    '"therefore/thus/as a result" ile başlıyorsa önceki cümleden mantıksal sonuç çıkmalı',
    'İki cümlenin KONUSU aynı olmalı — yeni konu getiren seçenek yanlış',
  ],
  addition:    [
    '"moreover/furthermore/in addition" → önceki fikre DESTEK ekler, zıtlık değil!',
    'Aynı yönde devam → her iki cümle de aynı iddiayı destekler',
    'Konu tutarlılığını kontrol et: aynı özne/nesne devam ediyor mu?',
  ],
  exemplify:   [
    '"for example/for instance" → önceki genel ifadeye somut örnek gelir',
    'Önce GENEL, sonra ÖZEL. Genel bir kural → ardından spesifik örnek',
    'Doğru seçenek önceki cümledeki konuya örnek göstermelidir',
  ],
  concession:  [
    '"Although/Even though" → iki zıt gerçek aynı cümlede',
    'Cümlenin yarısı var — eksik kısım ne tür bilgi bekliyor?',
    'Güçlü zıtlık: "----, the results were positive" → önceki kısım negatif beklenti',
  ],
  topic_cont:  [
    'Konuyu belirle: cümlede bahsedilen ANA ÖZNE/NESNE nedir?',
    'Doğru seçenek bu konuyu DEVAMETTİRMELİ — yeni konu getiren seçenek yanlış',
    '"this/these/it" → önceki cümleye referans. Aynı şeyden bahsedilmeli.',
  ],
}

const LOGIC_BUTTONS: Array<{ key: LogicKey; label: string; icon: string; hint: string }> = [
  { key: 'contrast',    label: 'Zıtlık',      icon: '↔️', hint: 'Öncekiyle çelişiyor' },
  { key: 'cause_effect',label: 'Neden-Sonuç', icon: '➡️', hint: 'Öncekinin sonucu' },
  { key: 'addition',    label: 'Ek Bilgi',    icon: '➕', hint: 'Aynı yönde devam' },
  { key: 'exemplify',   label: 'Örnek',       icon: '📌', hint: 'Somut örnek veriyor' },
  { key: 'concession',  label: 'Kabul-Zıt',  icon: '🔄', hint: 'Kabul edip zıt çıkıyor' },
  { key: 'topic_cont',  label: 'Konu Devamı',icon: '🔗', hint: 'Konuyu sürdürüyor' },
]

// ── Logic selection step ───────────────────────────────────────────────────────
function LogicSelectStep({
  q,
  logicKey,
  onConfirm,
}: {
  q: ExamQuestion
  logicKey: LogicKey
  onConfirm: (guess: LogicKey) => void
}) {
  const [guess, setGuess]   = useState<LogicKey | null>(null)
  const [locked, setLocked] = useState(false)   // true after first pick — cannot change

  const isRight    = guess === logicKey
  const cluesFound = guess && locked ? findCluesInText(q.question_text ?? '', logicKey) : []

  function pick(key: LogicKey) {
    if (locked) return
    setGuess(key)
    setLocked(true)
  }

  const correctLogic = LOGIC_TYPES[logicKey]
  const guessedLogic = guess ? LOGIC_TYPES[guess] : null

  return (
    <div className="space-y-3">
      {/* Prompt */}
      <div className="card p-4 border-l-4 border-[#1CB0F6]">
        <p className="text-sm font-black text-[#3C3C3C]">
          Bu cümlenin mantık tipi nedir?
        </p>
        <p className="text-xs font-semibold text-[#AFAFAF] mt-0.5">
          Seçenekleri görmeden önce cümleyi analiz et.
        </p>
      </div>

      {/* 6 logic buttons — disabled after pick */}
      <div className="grid grid-cols-2 gap-2">
        {LOGIC_BUTTONS.map(b => {
          const isPicked  = guess === b.key
          const isCorrect = locked && b.key === logicKey
          const isWrong   = locked && isPicked && !isCorrect
          return (
            <button
              key={b.key}
              onClick={() => pick(b.key)}
              disabled={locked}
              className={`p-3.5 rounded-2xl border-2 border-b-4 text-left transition-all active:translate-y-[2px] active:border-b-[1px] disabled:active:translate-y-0 disabled:active:border-b-4 ${
                isCorrect ? 'border-[#58CC02] bg-[#D7FFB8]' :
                isWrong   ? 'border-[#FF4B4B] bg-red-50'    :
                isPicked  ? 'border-[#1CB0F6] bg-blue-50'   :
                            'border-[#E5E5E5] bg-white'
              }`}
            >
              <div className="text-xl mb-0.5">{b.icon}</div>
              <div className="text-xs font-black text-[#3C3C3C]">{b.label}</div>
              <div className="text-[10px] font-semibold text-[#AFAFAF]">{b.hint}</div>
            </button>
          )
        })}
      </div>

      {/* Feedback — only after pick */}
      {locked && guess && (
        <div className={`card p-4 space-y-3 border-l-4 animate-slide-up ${
          isRight ? 'border-[#58CC02]' : 'border-[#FF4B4B]'
        }`}>
          {/* Verdict */}
          <p className={`font-black text-sm ${isRight ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
            {isRight
              ? `✅ Doğru! Bu cümle ${correctLogic.icon} ${correctLogic.label} gerektiriyor.`
              : `❌ "${guessedLogic?.icon} ${guessedLogic?.label}" seçtin — bu cümle "${correctLogic.icon} ${correctLogic.label}" gerektiriyor.`
            }
          </p>

          {/* Mismatch explanation (only when wrong) */}
          {!isRight && (
            <div className="bg-red-50 rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-black text-[#FF4B4B] uppercase">Neden yanlış?</p>
              <p className="text-xs font-semibold text-[#3C3C3C]">
                {guessedLogic?.label} mantığı için cümlede{' '}
                {LOGIC_TYPES[guess!].clues.slice(0, 3).map(c => `"${c}"`).join(', ')}{' '}
                gibi işaretler olmalıydı — ama bunlar yok.
              </p>
            </div>
          )}

          {/* Correct logic: what signals it */}
          <div className={`rounded-xl p-3 ${correctLogic.color}`}>
            <p className="text-[10px] font-black text-[#3C3C3C] uppercase mb-1">
              {correctLogic.icon} {correctLogic.label} — işaretleri:
            </p>
            {cluesFound.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {cluesFound.map(c => (
                  <span key={c} className="text-xs font-black bg-white/70 px-2 py-0.5 rounded-full text-[#3C3C3C]">
                    "{c}"
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-xs font-semibold text-[#3C3C3C]">
              {LOGIC_TIPS[logicKey][0]}
            </p>
          </div>

          {/* Proceed button — the only way to see options */}
          <button
            onClick={() => onConfirm(guess)}
            className="btn-duo py-3 w-full"
          >
            Seçenekleri Gör →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SentenceTrainerPage() {
  const [exam, setExam]         = useState<ExamData | null>(null)
  const [idx, setIdx]           = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore]       = useState({ correct: 0, wrong: 0 })

  // Logic gate state
  const [logicGuess,     setLogicGuess]     = useState<LogicKey | null>(null)
  const [logicConfirmed, setLogicConfirmed] = useState(false)

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then(setExam)
  }, [])

  if (!exam) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="text-4xl animate-bounce">🧩</div>
      <p className="font-bold text-[#AFAFAF]">Yükleniyor...</p>
    </div>
  )

  const scQs = exam.questions.filter(q => q.section_key === 'sentence_completion')
  if (!scQs.length) return <p className="p-4 text-[#AFAFAF]">Soru bulunamadı</p>

  const q        = scQs[idx % scQs.length]
  const opts     = Object.entries(q.options)
  const logicKey = detectLogicType(q.question_text ?? '')   // ← question text only, no spoiler
  const logic    = LOGIC_TYPES[logicKey]
  const tips     = LOGIC_TIPS[logicKey]

  function pick(opt: string) {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
    const correct = opt === q.correct_answer
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    recordTrainingAnswer('sentence_completion', correct)
  }

  function next() {
    setSelected(null)
    setRevealed(false)
    setLogicGuess(null)
    setLogicConfirmed(false)
    setIdx(i => i + 1)
  }

  const optStyle = (opt: string) => {
    if (!revealed) return selected === opt
      ? 'border-[#1CB0F6] bg-blue-50 text-[#1CB0F6]'
      : 'border-[#E5E5E5] bg-white text-[#3C3C3C]'
    if (opt === q.correct_answer) return 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302] font-black'
    if (opt === selected)         return 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
    return 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]'
  }

  return (
    <div className="space-y-4 pb-4">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-black text-[#3C3C3C]">🧩 Cümle Tamamlama</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">En zayıf bölüm · %20 sınav başarısı</p>
        </div>
        <div className="flex gap-3 text-sm font-black">
          <span className="text-[#58CC02]">{score.correct} ✓</span>
          <span className="text-[#FF4B4B]">{score.wrong} ✗</span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-[10px] font-black text-[#AFAFAF]">
        <span>Soru {idx % scQs.length + 1}/{scQs.length}</span>
        <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1CB0F6] rounded-full transition-all"
            style={{ width: `${((idx % scQs.length + 1) / scQs.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question — always visible */}
      <div className="card p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black text-[#AFAFAF] uppercase">
            Soru {q.question_number}
          </span>
          {!q.is_correct && (
            <span className="text-[10px] font-black bg-red-100 text-[#FF4B4B] px-2 py-0.5 rounded-full">
              ❌ Sınavda yanlış
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">
          {q.question_text || '(Soru metni yüklenemedi)'}
        </p>
      </div>

      {/* ── GATE: logic step must be completed before options appear ── */}
      {!logicConfirmed ? (
        <LogicSelectStep
          q={q}
          logicKey={logicKey}
          onConfirm={(guess) => {
            setLogicGuess(guess)
            setLogicConfirmed(true)
          }}
        />
      ) : (
        <>
          {/* Logic type badge — shown AFTER logic confirmed */}
          <div className={`card p-3 border-l-4 ${logic.color}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{logic.icon}</span>
              <span className="text-sm font-black text-[#3C3C3C]">{logic.label} mantığı doğrulandı</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {opts.length > 0 ? opts.map(([letter, text]) => (
              <button
                key={letter}
                onClick={() => pick(letter)}
                className={`w-full text-left p-3.5 rounded-2xl border-2 border-b-4 text-sm font-semibold transition-all active:translate-y-[2px] active:border-b-[1px] ${optStyle(letter)}`}
              >
                <span className="font-black mr-2">{letter})</span>{text}
              </button>
            )) : (
              ['A','B','C','D','E'].map(l => (
                <button key={l} onClick={() => pick(l)}
                  className={`w-full p-3.5 rounded-2xl border-2 border-b-4 font-black text-sm transition-all ${optStyle(l)}`}>
                  {l})
                </button>
              ))
            )}
          </div>

          {/* After reveal */}
          {revealed && (
            <div className={`card p-4 space-y-3 border-l-4 animate-slide-up ${
              selected === q.correct_answer ? 'border-[#58CC02]' : 'border-[#FF4B4B]'
            }`}>
              <p className={`font-black ${selected === q.correct_answer ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
                {selected === q.correct_answer ? '✅ Doğru!' : `❌ Yanlış — Doğru: ${q.correct_answer})`}
              </p>

              {/* Logic mismatch reminder (shown if user's logic guess was wrong) */}
              {logicGuess && logicGuess !== logicKey && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-[10px] font-black text-amber-700 uppercase mb-1">
                    Mantık hatası hatırlatıcı
                  </p>
                  <p className="text-xs font-semibold text-[#3C3C3C]">
                    Bu soruyu{' '}
                    <span className="font-black text-[#FF4B4B]">
                      {LOGIC_TYPES[logicGuess].icon} {LOGIC_TYPES[logicGuess].label}
                    </span>{' '}
                    olarak sınıflandırdın — ama gerçekte{' '}
                    <span className="font-black text-[#46A302]">
                      {logic.icon} {logic.label}
                    </span>{' '}
                    idi. Doğru seçeneği okurken bu farkı gör.
                  </p>
                </div>
              )}

              {/* Why wrong */}
              {selected !== q.correct_answer && (
                <div className="space-y-2">
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-[10px] font-black text-[#FF4B4B] mb-1">NEDEN YANLIŞ?</p>
                    <p className="text-xs font-semibold text-[#3C3C3C]">
                      {`"${q.options[selected ?? ''] ?? selected}" seçeneği cümlenin ${logic.label} mantığına uymuyor.`}
                    </p>
                  </div>
                  <div className="bg-[#F0FFF0] rounded-xl p-3">
                    <p className="text-[10px] font-black text-[#46A302] mb-1">NEDEN DOĞRU?</p>
                    <p className="text-xs font-semibold text-[#3C3C3C]">
                      {`"${q.options[q.correct_answer] ?? q.correct_answer}" — ${logic.label} mantığına uygun: ${tips[0]}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Decision rule */}
              <div className="bg-[#FFF9DB] rounded-xl p-3">
                <p className="text-[10px] font-black text-amber-700 mb-1">KARAR KURALI — {logic.label}</p>
                <div className="space-y-1">
                  {tips.slice(0, 2).map((t, i) => (
                    <p key={i} className="text-xs font-semibold text-[#3C3C3C]">• {t}</p>
                  ))}
                </div>
              </div>

              {/* Clue words in correct option */}
              {(() => {
                const correctText = (q.options[q.correct_answer] ?? '').toLowerCase()
                const foundClues  = LOGIC_TYPES[logicKey].clues.filter(c => correctText.includes(c))
                return foundClues.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-black text-[#AFAFAF] mb-1">ANAHTAR KELİMELER</p>
                    <div className="flex flex-wrap gap-1.5">
                      {foundClues.map(c => (
                        <span key={c} className="text-xs font-black bg-[#D7FFB8] text-[#46A302] px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              <button onClick={next} className="btn-duo py-3">
                {idx < scQs.length - 1 ? 'SONRAKI SORU →' : '🔄 YENİDEN BAŞLA'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
