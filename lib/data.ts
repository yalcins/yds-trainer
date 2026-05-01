import { YDSData, PatternStat } from './types'
import { isPatternDue } from './store'

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

const SCORE_MASTERED_MAX = 0.5
const SCORE_UNSEEN_DUE = 15
const SCORE_UNSEEN = 10
const SCORE_DUE_BOOST = 8

export function pickQuizQuestions(
  data: YDSData,
  count = 5,
  stats: Record<string, { seen: number; correct: number }> = {},
  patternStats: Record<string, PatternStat> = {}
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
    const ps = patternStats[q.pattern]
    const due = isPatternDue(ps)
    const mastered = ps?.next_review === 'mastered'

    let score: number
    if (mastered) {
      score = Math.random() * SCORE_MASTERED_MAX
    } else if (!s) {
      score = due ? Math.random() + SCORE_UNSEEN_DUE : Math.random() + SCORE_UNSEEN
    } else {
      const acc = s.correct / s.seen
      score = (1 - acc) * 5 + Math.random()
      if (due) score += SCORE_DUE_BOOST
    }

    return { q, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(x => x.q)
}
