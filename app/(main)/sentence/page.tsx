'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  sentenceQuestions,
  SENTENCE_TYPE_META,
  type SentenceQuestion,
  type SentenceType,
} from '@/lib/sentence-data'

type Phase = 'type-guess' | 'logic-map' | 'answer' | 'analysis'

const ALL_TYPES = Object.keys(SENTENCE_TYPE_META) as SentenceType[]

function highlightClues(sentence: string, clueWords: string[]) {
  if (!clueWords.length) return <span>{sentence}</span>

  const escaped = clueWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = sentence.split(pattern)

  return (
    <>
      {parts.map((part, i) => {
        const isClue = clueWords.some(w => w.toLowerCase() === part.toLowerCase())
        return isClue ? (
          <mark key={i} className="bg-[#FFD900] text-[#3C3C3C] px-0.5 rounded font-black not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}

export default function SentencePage() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('type-guess')
  const [guessedType, setGuessedType] = useState<SentenceType | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  const q: SentenceQuestion = sentenceQuestions[index]
  const totalQuestions = sentenceQuestions.length
  const progress = ((index + (phase === 'analysis' ? 1 : 0)) / totalQuestions) * 100

  function handleTypeGuess(type: SentenceType) {
    setGuessedType(type)
    setPhase('logic-map')
  }

  function handleShowOptions() {
    setPhase('answer')
  }

  function handleSelectOption(opt: string) {
    setSelectedOption(opt)
    setPhase('analysis')
  }

  function handleNext() {
    const nextIndex = index + 1
    if (nextIndex >= totalQuestions) {
      router.push('/')
    } else {
      setIndex(nextIndex)
      setPhase('type-guess')
      setGuessedType(null)
      setSelectedOption(null)
    }
  }

  const correctTypeMeta = SENTENCE_TYPE_META[q.sentence_type]
  const typeGuessCorrect = guessedType === q.sentence_type

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
        <div className="flex-1 h-4 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1CB0F6] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-black text-[#AFAFAF]">{index + 1}/{totalQuestions}</span>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 max-w-lg mx-auto w-full space-y-4 pb-6">

        {/* Sentence card */}
        <div className="card p-5 border-b-4 border-[#E5E5E5]">
          <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-widest mb-2">Cümle Tamamlama</p>
          <p className="text-base font-bold leading-relaxed text-[#3C3C3C]">
            {highlightClues(q.sentence, q.clue_words)}
          </p>
          {q.clue_words.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {q.clue_words.map(w => (
                <span key={w} className="text-xs font-black bg-[#FFD900]/30 text-[#3C3C3C] px-2 py-0.5 rounded-full border border-[#FFD900]">
                  🔑 {w}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Phase 1: Type guess ── */}
        {phase === 'type-guess' && (
          <div className="space-y-3 animate-slide-up">
            <p className="text-sm font-black text-[#3C3C3C]">🤔 Bu cümlede hangi mantık türü gerekiyor?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {ALL_TYPES.map(t => {
                const meta = SENTENCE_TYPE_META[t]
                return (
                  <button
                    key={t}
                    onClick={() => handleTypeGuess(t)}
                    className={`w-full text-left px-4 py-3 rounded-2xl border-2 border-b-4 font-bold text-sm transition-all active:translate-y-0.5 active:border-b-2 ${meta.color}`}
                  >
                    <span className="mr-1.5">{meta.icon}</span>
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Phase 2: Logic map ── */}
        {phase === 'logic-map' && guessedType && (
          <div className="space-y-3 animate-slide-up">
            {/* Type result */}
            <div className={`card p-4 border-b-4 ${typeGuessCorrect ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-[#FF4B4B] bg-red-50'}`}>
              <p className={`font-black text-sm ${typeGuessCorrect ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
                {typeGuessCorrect ? '✓ Doğru mantık türü!' : `✗ Doğru tür: ${correctTypeMeta.icon} ${correctTypeMeta.label}`}
              </p>
              <p className={`text-xs mt-1 font-semibold ${typeGuessCorrect ? 'text-[#46A302]/80' : 'text-[#FF4B4B]/80'}`}>
                {correctTypeMeta.description}
              </p>
            </div>

            {/* Logic map */}
            <div className="card p-4 space-y-3 border-b-4 border-[#E5E5E5]">
              <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-widest">🗺️ Mantık Haritası</p>
              <div className="space-y-2">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-wide mb-0.5">Önceki Kısım</p>
                  <p className="text-sm font-semibold text-[#3C3C3C]">{q.before_meaning}</p>
                </div>
                <div className="flex justify-center text-2xl leading-none py-0.5">⬇️</div>
                <div className={`rounded-xl p-3 border ${typeGuessCorrect ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-wide mb-0.5 ${typeGuessCorrect ? 'text-green-500' : 'text-amber-500'}`}>
                    Beklenen Devam
                  </p>
                  <p className="text-sm font-semibold text-[#3C3C3C]">{q.expected_continuation}</p>
                </div>
              </div>
            </div>

            <button onClick={handleShowOptions} className="btn-duo">
              SEÇENEKLERE BAK →
            </button>
          </div>
        )}

        {/* ── Phase 3: Answer options ── */}
        {phase === 'answer' && (
          <div className="space-y-3 animate-slide-up">
            <p className="text-sm font-black text-[#3C3C3C]">💬 Cümleyi tamamlayan seçenek hangisi?</p>
            {Object.entries(q.options).map(([k, v]) => (
              <button
                key={k}
                onClick={() => handleSelectOption(k)}
                className="w-full text-left px-5 py-4 rounded-2xl font-bold text-sm transition-all border-2 border-b-4 border-[#E5E5E5] bg-white text-[#3C3C3C] border-b-[#CCCCCC] active:border-b-[#E5E5E5] active:translate-y-[2px]"
              >
                <span className="font-black text-base opacity-50 mr-3">{k}</span>
                {v}
              </button>
            ))}
          </div>
        )}

        {/* ── Phase 4: Analysis ── */}
        {phase === 'analysis' && selectedOption && (
          <div className="space-y-3 animate-slide-up">
            {/* Answer result */}
            <div className={`card p-4 border-b-4 ${selectedOption === q.correct_answer ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-[#FF4B4B] bg-red-50'}`}>
              <p className={`font-black text-base ${selectedOption === q.correct_answer ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
                {selectedOption === q.correct_answer
                  ? '✓ Doğru cevap!'
                  : `✗ Doğru cevap: ${q.correct_answer}) ${q.options[q.correct_answer]}`}
              </p>
            </div>

            {/* Option analysis */}
            <div className="card p-4 space-y-3 border-b-4 border-[#E5E5E5]">
              <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-widest">🔬 Her Seçeneğin Analizi</p>
              {Object.entries(q.options).map(([k, v]) => {
                const analysis = q.option_analysis[k]
                return (
                  <div
                    key={k}
                    className={`rounded-xl p-3 border ${analysis.fits ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`text-sm font-black shrink-0 ${analysis.fits ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
                        {analysis.fits ? '✓' : '✗'} {k}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[#3C3C3C]/70 italic mb-0.5">{v}</p>
                        <p className={`text-xs font-bold ${analysis.fits ? 'text-[#46A302]' : 'text-[#FF4B4B]'}`}>
                          {analysis.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Explanation + logic rule + pattern */}
            <div className="card p-4 space-y-3 border-b-4 border-[#E5E5E5]">
              <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-widest">💡 Açıklama</p>
              <p className="text-sm font-semibold text-[#3C3C3C]">{q.explanation}</p>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide mb-0.5">Mantık Kuralı</p>
                <p className="text-sm font-bold text-[#3C3C3C]">{q.logic_rule}</p>
              </div>

              <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-wide mb-0.5">Kalıp</p>
                <p className="text-sm font-mono font-bold text-[#3C3C3C]">{q.pattern}</p>
              </div>
            </div>

            <button onClick={handleNext} className="btn-duo">
              {index + 1 >= totalQuestions ? 'TAMAMLANDI 🏁' : 'SONRAKI SORU →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
