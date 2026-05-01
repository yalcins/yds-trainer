import { YDSData, Question, UserProgress } from './types'

let _cache: YDSData | null = null

export async function loadData(): Promise<YDSData> {
  if (_cache) return _cache

  const [base, userRaw] = await Promise.allSettled([
    fetch('/yds_training_data.json').then(r => r.json()),
    fetch('https://raw.githubusercontent.com/yalcins/yds-trainer/main/data/user_questions.json').then(r => r.json()),
  ])

  const data: YDSData = base.status === 'fulfilled' ? base.value : { questions: [], patterns: [], generated_questions: [], meta: {} as any }

  if (userRaw.status === 'fulfilled' && Array.isArray(userRaw.value)) {
    data.questions = [...data.questions, ...userRaw.value]
  }

  _cache = data
  return _cache
}

export function pickQuizQuestions(
  data: YDSData,
  count = 5,
  stats: Record<string, { seen: number; correct: number }> = {}
) {
  const all = [...data.questions, ...data.generated_questions.map(g => ({
    id: g.gen_id,
    exam: 'generated',
    question_text: g.question_text,
    options: g.options,
    correct_answer: g.correct_answer,
    category: g.category as any,
    pattern: g.source_pattern,
    meaning_tr: '',
    example_en: '',
    example_tr: '',
    trap: g.trap,
    short_explanation: '',
    difficulty: g.difficulty as any,
    closest_distractors: g.closest_distractors,
  }))]

  const scored = all.map(q => {
    const s = stats[q.id]
    if (!s) return { q, score: Math.random() + 10 }
    const acc = s.correct / s.seen
    return { q, score: (1 - acc) * 5 + Math.random() }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(x => x.q)
}

/** Fisher-Yates shuffle — returns a new shuffled array. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Flatten all questions (base + generated) into a unified Question array.
 */
function getAllQuestions(data: YDSData): Question[] {
  return [
    ...data.questions,
    ...data.generated_questions.map(g => ({
      id: g.gen_id,
      exam: 'generated',
      question_text: g.question_text,
      options: g.options,
      correct_answer: g.correct_answer,
      category: g.category as Question['category'],
      pattern: g.source_pattern,
      meaning_tr: '',
      example_en: '',
      example_tr: '',
      trap: g.trap,
      short_explanation: '',
      difficulty: g.difficulty as Question['difficulty'],
      closest_distractors: g.closest_distractors,
    })),
  ]
}

/**
 * Generates a daily practice set of 15 questions:
 *  - 5 from the weakest category (lowest correct/seen ratio)
 *  - 5 from previously wrong answers (most-missed questions)
 *  - 5 random review questions (not already selected)
 */
export function generateDailyPracticeSet(
  data: YDSData,
  progress: UserProgress
): Question[] {
  const all = getAllQuestions(data)
  const stats = progress.questionStats
  const selected = new Set<string>()
  const result: Question[] = []

  // ── 1. 5 questions from the weakest category ──────────────────────────────
  // Compute per-category accuracy for seen questions.
  const catStats: Record<string, { correct: number; total: number }> = {}
  for (const q of all) {
    const s = stats[q.id]
    if (!s || s.seen === 0) continue
    if (!catStats[q.category]) catStats[q.category] = { correct: 0, total: 0 }
    catStats[q.category].correct += s.correct
    catStats[q.category].total  += s.seen
  }

  // Find the category with the lowest accuracy (unseen categories rank last).
  const categories = [...new Set(all.map(q => q.category))]
  let weakestCategory: string | null = null
  let lowestAcc = Infinity
  for (const cat of categories) {
    const cs = catStats[cat]
    const acc = cs ? cs.correct / cs.total : -1
    if (acc < lowestAcc) {
      lowestAcc = acc
      weakestCategory = cat
    }
  }

  if (weakestCategory) {
    const weakPool = shuffle(all.filter(q => q.category === weakestCategory))
      .sort((a, b) => {
        const sa = stats[a.id]
        const sb = stats[b.id]
        const accA = sa && sa.seen > 0 ? sa.correct / sa.seen : -1
        const accB = sb && sb.seen > 0 ? sb.correct / sb.seen : -1
        return accA - accB
      })

    for (const q of weakPool) {
      if (result.length >= 5) break
      if (!selected.has(q.id)) {
        selected.add(q.id)
        result.push(q)
      }
    }
  }

  // ── 2. 5 questions from wrong answers ─────────────────────────────────────
  const wrongPool = all
    .filter(q => {
      const s = stats[q.id]
      return s && s.seen > 0 && s.correct < s.seen
    })
    .sort((a, b) => {
      const sa = stats[a.id]!
      const sb = stats[b.id]!
      const wrongA = sa.seen - sa.correct
      const wrongB = sb.seen - sb.correct
      return wrongB - wrongA
    })

  for (const q of wrongPool) {
    if (result.length >= 10) break
    if (!selected.has(q.id)) {
      selected.add(q.id)
      result.push(q)
    }
  }

  // ── 3. 5 random review questions ──────────────────────────────────────────
  const reviewPool = shuffle(all.filter(q => !selected.has(q.id)))

  for (const q of reviewPool) {
    if (result.length >= 15) break
    selected.add(q.id)
    result.push(q)
  }

  return result
}
