'use client'
import { useEffect, useState } from 'react'
import type { ExamData, ExamQuestion } from '@/lib/types'
import { getAdaptiveStore, getErrorTypeLabel, type Attempt, type AdaptiveStore } from '@/lib/adaptive-store'
import { buildWhyNot } from '@/lib/adaptive-engine'

type FilterMode = 'all' | 'dangerous' | 'weak' | 'lucky' | 'exam_wrong'
type GroupMode  = 'section' | 'type' | 'pattern'

const SECTION_ICON: Record<string, string> = {
  fill_blank_vocab:'📝', cloze:'🔗', sentence_completion:'🧩',
  translation:'🌍', reading:'📖', paragraph_completion:'🔀', paragraph_questions:'💡',
}

export default function MistakesPage() {
  const [exam, setExam]     = useState<ExamData | null>(null)
  const [store, setStore]   = useState<AdaptiveStore | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [group, setGroup]   = useState<GroupMode>('section')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch('/yds26_exam1.json').then(r => r.json()).then(setExam)
    setStore(getAdaptiveStore())
  }, [])

  if (!exam || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-4xl animate-bounce">❌</div>
        <p className="font-bold text-[#AFAFAF]">Yükleniyor...</p>
      </div>
    )
  }

  // Merge exam wrong + training wrong attempts
  const examWrong = exam.questions.filter(q => !q.is_correct)

  // Latest attempt per question (for training mistakes)
  const latestAttemptByQ: Record<number, Attempt> = {}
  for (const a of store.attempts) {
    latestAttemptByQ[a.questionId] = a
  }

  // Build full mistake list
  interface MistakeEntry {
    q: ExamQuestion
    source: 'exam' | 'training'
    latestAttempt?: Attempt
    errorType?: string
  }

  const allMistakes: MistakeEntry[] = []
  const seenIds = new Set<number>()

  // Training wrong (most recent first)
  const trainingWrong = store.attempts
    .filter(a => !a.isCorrect)
    .reduce((acc, a) => {
      if (!acc.find(x => x.questionId === a.questionId)) acc.push(a)
      return acc
    }, [] as Attempt[])

  for (const attempt of trainingWrong) {
    const q = exam.questions.find(qq => qq.question_number === attempt.questionId)
    if (q) {
      allMistakes.push({ q, source: 'training', latestAttempt: attempt, errorType: attempt.errorType })
      seenIds.add(q.question_number)
    }
  }

  // Exam wrong not yet in training
  for (const q of examWrong) {
    if (!seenIds.has(q.question_number)) {
      allMistakes.push({ q, source: 'exam' })
    }
  }

  // Filter
  const filtered = allMistakes.filter(m => {
    if (filter === 'exam_wrong')   return m.source === 'exam' && !m.latestAttempt
    if (filter === 'dangerous')    return m.errorType === 'dangerous_misconception'
    if (filter === 'weak')         return m.errorType === 'weak_knowledge' || m.errorType === 'normal_wrong'
    if (filter === 'lucky')        return m.errorType === 'lucky_correct'
    return true
  })

  // Group
  const grouped: Record<string, MistakeEntry[]> = {}
  for (const m of filtered) {
    let key = ''
    if (group === 'section')  key = m.q.section_name ?? m.q.section_key
    if (group === 'type')     key = m.errorType ? getErrorTypeLabel(m.errorType as any).label : 'Sınavda Yanlış'
    if (group === 'pattern')  key = (m.q.common_patterns ?? [])[0] ?? 'Diğer'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  }

  const toggleExpand = (id: number) =>
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const filterButtons: { mode: FilterMode; label: string; color: string }[] = [
    { mode: 'all',        label: `Tümü (${allMistakes.length})`, color: 'bg-[#3C3C3C] text-white' },
    { mode: 'dangerous',  label: `🚨 Yanılgı`,  color: 'bg-[#FF4B4B] text-white' },
    { mode: 'weak',       label: `📚 Zayıf`,    color: 'bg-amber-500 text-white' },
    { mode: 'exam_wrong', label: `📝 Sınav`,     color: 'bg-[#1CB0F6] text-white' },
  ]

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C]">❌ Hata Bankası</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">{filtered.length} hata · {allMistakes.filter(m => m.errorType === 'dangerous_misconception').length} tehlikeli</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterButtons.map(fb => (
          <button
            key={fb.mode}
            onClick={() => setFilter(fb.mode)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all ${
              filter === fb.mode ? fb.color + ' border-transparent' : 'bg-white text-[#AFAFAF] border-[#E5E5E5]'
            }`}
          >
            {fb.label}
          </button>
        ))}
      </div>

      {/* Group toggle */}
      <div className="flex gap-1 bg-[#F0F0F0] rounded-xl p-1">
        {(['section', 'type', 'pattern'] as GroupMode[]).map(g => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
              group === g ? 'bg-white text-[#3C3C3C] shadow-sm' : 'text-[#AFAFAF]'
            }`}
          >
            {g === 'section' ? 'Bölüm' : g === 'type' ? 'Hata Tipi' : 'Kalıp'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-bold text-[#AFAFAF]">Bu filtrede hata yok!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([groupName, items]) => (
          <div key={groupName} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">{SECTION_ICON[items[0]?.q.section_key] ?? '📌'}</span>
              <h2 className="text-sm font-black text-[#3C3C3C]">{groupName}</h2>
              <span className="text-xs font-bold text-[#AFAFAF] bg-[#F0F0F0] px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>

            {items.map(({ q, source, latestAttempt, errorType }) => {
              const isExpanded = expanded.has(q.question_number)
              const et = errorType ? getErrorTypeLabel(errorType as any) : null
              const whyNot = isExpanded && latestAttempt ? buildWhyNot(q, latestAttempt.selectedAnswer) : null
              const review = getAdaptiveStore().questionReviews[q.question_number]

              return (
                <div
                  key={q.question_number}
                  className={`card border-l-4 ${
                    errorType === 'dangerous_misconception' ? 'border-[#FF4B4B]'
                    : errorType === 'lucky_correct' ? 'border-amber-400'
                    : 'border-[#E5E5E5]'
                  } overflow-hidden`}
                >
                  <button
                    onClick={() => toggleExpand(q.question_number)}
                    className="w-full text-left p-4 space-y-2"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-[#AFAFAF] bg-[#F0F0F0] px-2 py-0.5 rounded-full">
                          Q{q.question_number}
                        </span>
                        {et && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            et.color === 'text-[#FF4B4B]' ? 'bg-red-100' :
                            et.color === 'text-amber-500' ? 'bg-amber-100' :
                            et.color === 'text-[#58CC02]' ? 'bg-[#D7FFB8]' : 'bg-[#F0F0F0]'
                          } ${et.color}`}>
                            {et.icon} {et.label}
                          </span>
                        )}
                        {source === 'exam' && !latestAttempt && (
                          <span className="text-[10px] font-black bg-blue-100 text-[#1CB0F6] px-2 py-0.5 rounded-full">
                            📝 Sınav
                          </span>
                        )}
                        {review && (
                          <span className="text-[10px] font-bold text-[#AFAFAF]">
                            {review.seenCount}× · %{review.masteryScore}
                          </span>
                        )}
                      </div>
                      <span className="text-[#AFAFAF] text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Question text */}
                    <p className={`text-sm font-semibold text-[#3C3C3C] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {q.question_text || '(Soru metni yüklenemedi)'}
                    </p>

                    {/* Answer summary */}
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#FF4B4B] bg-red-50 px-2 py-0.5 rounded-full">
                        Senin: {latestAttempt?.selectedAnswer ?? q.user_answer}){' '}
                        {q.options[latestAttempt?.selectedAnswer ?? q.user_answer] ?? q.user_option_text ?? ''}
                      </span>
                      <span className="text-xs font-bold text-[#58CC02] bg-[#D7FFB8] px-2 py-0.5 rounded-full">
                        Doğru: {q.correct_answer}) {q.options[q.correct_answer] ?? q.correct_option_text ?? ''}
                      </span>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-[#F0F0F0] pt-3 animate-slide-up">
                      {/* All options */}
                      {Object.keys(q.options).length > 0 && (
                        <div className="space-y-1">
                          {Object.entries(q.options).map(([letter, text]) => (
                            <div
                              key={letter}
                              className={`text-xs font-semibold px-3 py-2 rounded-xl ${
                                letter === q.correct_answer
                                  ? 'bg-[#D7FFB8] text-[#46A302] font-black'
                                  : letter === (latestAttempt?.selectedAnswer ?? q.user_answer)
                                  ? 'bg-red-50 text-[#FF4B4B]'
                                  : 'bg-[#F8F8F8] text-[#AFAFAF]'
                              }`}
                            >
                              <span className="font-black">{letter})</span> {text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Why Not explanation */}
                      {whyNot && (
                        <div className="space-y-2">
                          {whyNot.wrong && (
                            <div className="bg-red-50 rounded-xl p-3">
                              <p className="text-[10px] font-black text-[#FF4B4B] mb-1">NEDEN YANLIŞ?</p>
                              <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{whyNot.wrong}</p>
                            </div>
                          )}
                          <div className="bg-[#F0FFF0] rounded-xl p-3">
                            <p className="text-[10px] font-black text-[#46A302] mb-1">NEDEN DOĞRU?</p>
                            <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{whyNot.correct}</p>
                          </div>
                          <div className="bg-[#FFF9DB] rounded-xl p-3">
                            <p className="text-[10px] font-black text-amber-700 mb-1">KARAR KURALI</p>
                            <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{whyNot.rule}</p>
                          </div>
                        </div>
                      )}

                      {/* Patterns */}
                      {q.common_patterns?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-[#AFAFAF] uppercase mb-2">Kalıplar</p>
                          <div className="flex flex-wrap gap-2">
                            {q.common_patterns.map((p, i) => (
                              <span key={i} className="text-xs font-bold bg-[#D7FFB8] text-[#46A302] px-2 py-0.5 rounded-full">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      {q.how_to_solve_this_type?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-[#AFAFAF] uppercase mb-2">Çözüm İpuçları</p>
                          <div className="space-y-1">
                            {q.how_to_solve_this_type.slice(0, 3).map((tip, i) => (
                              <p key={i} className="text-xs font-semibold text-[#3C3C3C]">
                                <span className="text-[#58CC02] font-black">{i + 1}.</span> {tip}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
