import { YDSData } from './types'

let _cache: YDSData | null = null

export async function loadData(): Promise<YDSData> {
  if (_cache) return _cache
  const res = await fetch('/yds_training_data.json')
  _cache = await res.json()
  return _cache!
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

  // weight: unseen > low accuracy > seen
  const scored = all.map(q => {
    const s = stats[q.id]
    if (!s) return { q, score: Math.random() + 10 }
    const acc = s.correct / s.seen
    return { q, score: (1 - acc) * 5 + Math.random() }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(x => x.q)
}
