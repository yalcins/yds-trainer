import type { ExamData, ExamQuestion } from './types'
import type { AdaptiveStore } from './adaptive-store'
import { getReviewQueue } from './adaptive-store'

// ── Session Builder ────────────────────────────────────────────────────────────
// 15-question adaptive daily session:
//   5 weakest section questions (sentence_completion, cloze, reading)
//   4 previously wrong from exam
//   3 vocabulary / pattern
//   3 review (spaced repetition queue)

export function buildDailySession(
  examData: ExamData,
  store: AdaptiveStore
): { questionIds: number[]; goldenFive: string[] } {
  const allQ = examData.questions
  const reviewed = store.questionReviews
  const today = new Date().toISOString().slice(0, 10)

  // Helper: not already mastered in spaced repetition
  const notMastered = (id: number) => !reviewed[id]?.mastered

  // Helper: sort by priority (wrong + unseen first)
  const priorityScore = (q: ExamQuestion): number => {
    const r = reviewed[q.question_number]
    if (!r) return !q.is_correct ? 100 : 50          // unseen wrong > unseen correct
    const accuracy = r.seenCount ? r.correctCount / r.seenCount : 0
    return (1 - accuracy) * 80 + (r.wrongCount * 10) + (r.seenCount === 0 ? 20 : 0)
  }

  // ── Slot 1: 5 questions from weakest sections ─────────────────────────────
  const weakSections = ['sentence_completion', 'cloze', 'reading']
  const weakQ = allQ
    .filter(q => weakSections.includes(q.section_key) && notMastered(q.question_number))
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 5)

  // ── Slot 2: 4 previously wrong answers ────────────────────────────────────
  const wrongQ = allQ
    .filter(q =>
      !q.is_correct &&
      notMastered(q.question_number) &&
      !weakQ.find(w => w.question_number === q.question_number)
    )
    .sort((a, b) => {
      // dangerous misconceptions first
      const aLast = store.attempts.slice().reverse().find(at => at.questionId === a.question_number)
      const bLast = store.attempts.slice().reverse().find(at => at.questionId === b.question_number)
      const aScore = aLast?.errorType === 'dangerous_misconception' ? 2 : aLast?.errorType === 'weak_knowledge' ? 1 : 0
      const bScore = bLast?.errorType === 'dangerous_misconception' ? 2 : bLast?.errorType === 'weak_knowledge' ? 1 : 0
      return bScore - aScore
    })
    .slice(0, 4)

  // ── Slot 3: 3 vocabulary questions ────────────────────────────────────────
  const vocabQ = allQ
    .filter(q =>
      q.section_key === 'fill_blank_vocab' &&
      notMastered(q.question_number) &&
      !weakQ.find(w => w.question_number === q.question_number) &&
      !wrongQ.find(w => w.question_number === q.question_number)
    )
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 3)

  // ── Slot 4: 3 spaced-repetition review ────────────────────────────────────
  const reviewIds = getReviewQueue(store).filter(id =>
    !weakQ.find(w => w.question_number === id) &&
    !wrongQ.find(w => w.question_number === id) &&
    !vocabQ.find(w => w.question_number === id)
  ).slice(0, 3)
  const reviewQ = allQ.filter(q => reviewIds.includes(q.question_number))

  // ── Combine & fill to 15 ──────────────────────────────────────────────────
  const combined = [...weakQ, ...wrongQ, ...vocabQ, ...reviewQ]
  const usedIds  = new Set(combined.map(q => q.question_number))

  if (combined.length < 15) {
    const filler = allQ
      .filter(q => !usedIds.has(q.question_number) && notMastered(q.question_number))
      .sort((a, b) => priorityScore(b) - priorityScore(a))
      .slice(0, 15 - combined.length)
    combined.push(...filler)
  }

  // Shuffle slightly (keep weak at front, shuffle rest)
  const front = combined.slice(0, 5)
  const rest  = combined.slice(5).sort(() => Math.random() - 0.5)
  const final = [...front, ...rest].slice(0, 15)

  // ── Golden Five: patterns to remember today ───────────────────────────────
  const allPatterns = final.flatMap(q => q.common_patterns ?? [])
  const patternFreq: Record<string, number> = {}
  for (const p of allPatterns) {
    patternFreq[p] = (patternFreq[p] ?? 0) + 1
  }
  const goldenFive = Object.entries(patternFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([p]) => p)

  return {
    questionIds: final.map(q => q.question_number),
    goldenFive,
  }
}

// ── "Why Not?" Explainer ───────────────────────────────────────────────────────

export function buildWhyNot(
  q: ExamQuestion,
  selectedAnswer: string
): { correct: string; wrong: string; rule: string } {
  const correctText = q.options[q.correct_answer] ?? q.correct_option_text ?? q.correct_answer
  const wrongText   = selectedAnswer !== q.correct_answer
    ? (q.options[selectedAnswer] ?? q.user_option_text ?? selectedAnswer)
    : null

  const firstTip = (q.how_to_solve_this_type ?? [])[0] ?? ''
  const pattern  = (q.common_patterns ?? [])[0] ?? ''

  // Build "correct" explanation
  const correct = correctText
    ? `✅ **${q.correct_answer}) ${correctText}** — Bu cevap bağlama en uygun. ${
        pattern ? `Kalıp tipi: _${pattern}_.` : ''
      }`
    : `✅ Doğru cevap: **${q.correct_answer})**`

  // Build "wrong" explanation
  const wrong = wrongText && selectedAnswer !== q.correct_answer
    ? `❌ Senin cevabın **${selectedAnswer}) ${wrongText}** — ${
        getWrongReason(q, selectedAnswer, wrongText, correctText)
      }`
    : ''

  // Decision rule
  const rule = firstTip || 'Bağlamı dikkatlice oku ve anlam bütünlüğünü kontrol et.'

  return { correct, wrong, rule }
}

function getWrongReason(
  q: ExamQuestion,
  selected: string,
  wrongText: string,
  correctText: string
): string {
  const sec = q.section_key

  if (sec === 'fill_blank_vocab') {
    return `"${wrongText}" kelimesi anlam veya collocation açısından bu bağlamla uyuşmuyor. "${correctText}" ise hem anlam hem bağlam olarak doğru kelime.`
  }
  if (sec === 'cloze') {
    return `Cümlenin devamıyla mantıksal bağlantı eksik. "${wrongText}" yerine bağlaçların yarattığı anlam köprüsüne dikkat et.`
  }
  if (sec === 'sentence_completion') {
    return `"${wrongText}" seçeneği önceki cümleyle mantıksal akışı kuramıyor. Zıtlık/neden/sonuç ilişkisini kontrol et.`
  }
  if (sec === 'reading') {
    return `Bu seçenek metinde açıkça belirtilen bilgiyle çelişiyor veya fazla geniş/dar bir yorum içeriyor.`
  }
  if (sec === 'translation') {
    return `Türkçe karşılık anlam kaymasına uğramış ya da anahtar kelime yanlış çevrilmiş.`
  }
  return `Bu seçenek bağlamla uyuşmuyor. "${correctText}" ifadesinin neden daha uygun olduğunu tekrar gözden geçir.`
}

// ── Pattern extractor ─────────────────────────────────────────────────────────

export function extractPatterns(q: ExamQuestion): string[] {
  const patterns: string[] = []

  // From question data
  if (q.common_patterns?.length) patterns.push(...q.common_patterns)

  // Infer from correct option text
  const correctText = (q.options[q.correct_answer] ?? q.correct_option_text ?? '').toLowerCase()

  // Linker patterns
  const linkers = ['however', 'therefore', 'moreover', 'furthermore', 'nevertheless', 'consequently',
    'although', 'even though', 'whereas', 'while', 'thus', 'hence', 'otherwise', 'besides']
  for (const l of linkers) {
    if (correctText.includes(l)) patterns.push(`linker: ${l}`)
  }

  // Preposition patterns
  const preps = ['in terms of', 'with regard to', 'in addition to', 'as a result of',
    'due to', 'in spite of', 'regardless of', 'in contrast to', 'according to']
  for (const p of preps) {
    if (correctText.includes(p)) patterns.push(`preposition: ${p}`)
  }

  return [...new Set(patterns)]
}

// ── Level XP awards ───────────────────────────────────────────────────────────

export function xpForAnswer(isCorrect: boolean, confidence: string, isMistakeRepeat: boolean): number {
  if (!isCorrect) return 0
  let base = confidence === 'high' ? 20 : confidence === 'medium' ? 15 : 10
  if (isMistakeRepeat) base += 5   // bonus for correctly answering a previously wrong Q
  return base
}

// ── Section priority calculator ───────────────────────────────────────────────

export function getSectionPriority(
  examData: ExamData,
  store: AdaptiveStore
): Array<{ sectionKey: string; examAccuracy: number; trainAccuracy: number | null; priority: 'HIGH' | 'MEDIUM' | 'LOW'; gap: number }> {
  return Object.entries(examData.section_analysis).map(([key, sec]) => {
    const stat = store.attempts.filter(a => a.sectionKey === key)
    const trainAcc = stat.length
      ? Math.round((stat.filter(a => a.isCorrect).length / stat.length) * 100)
      : null
    const gap = 100 - sec.accuracy_pct
    return {
      sectionKey: key,
      examAccuracy: sec.accuracy_pct,
      trainAccuracy: trainAcc,
      priority: sec.priority as 'HIGH' | 'MEDIUM' | 'LOW',
      gap,
    }
  }).sort((a, b) => b.gap - a.gap)
}
