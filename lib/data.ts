import { YDSData, Question, QuestionSection } from './types'

let _cache: YDSData | null = null

/** Map a raw section string (from all_questions.json) to a normalized QuestionSection */
function normalizeSection(raw: string): QuestionSection | undefined {
  switch (raw) {
    case 'Vocabulary': return 'vocabulary'
    case 'Grammar':    return 'grammar'
    case 'Cloze Test': return 'cloze'
    case 'Sentence Completion': return 'sentence_completion'
    default: return undefined
  }
}

/** Derive a QuestionSection from a legacy category field.
 *  VOCAB → vocabulary; everything else (GRAMMAR, PHRASAL, PREPOSITION, LINKER) → grammar,
 *  as all non-vocabulary categories in YDS training data are grammar-related.
 */
function sectionFromCategory(cat: string): QuestionSection {
  return cat === 'VOCAB' ? 'vocabulary' : 'grammar'
}

export async function loadData(): Promise<YDSData> {
  if (_cache) return _cache

  const [base, userRaw, allRaw] = await Promise.allSettled([
    fetch('/yds_training_data.json').then(r => r.json()),
    fetch('https://raw.githubusercontent.com/yalcins/yds-trainer/main/data/user_questions.json').then(r => r.json()),
    fetch('/all_questions.json').then(r => r.json()),
  ])

  const data: YDSData = base.status === 'fulfilled' ? base.value : { questions: [], patterns: [], generated_questions: [], meta: {} as any }

  // Tag existing questions with derived section
  data.questions = data.questions.map(q => ({
    ...q,
    section: sectionFromCategory(q.category),
  }))

  if (userRaw.status === 'fulfilled' && Array.isArray(userRaw.value)) {
    data.questions = [...data.questions, ...userRaw.value]
  }

  // Merge in questions from all_questions.json (cloze, sentence_completion, etc.)
  if (allRaw.status === 'fulfilled' && Array.isArray(allRaw.value?.questions)) {
    const existingIds = new Set(data.questions.map((q: Question) => q.id))
    const catMap: Record<QuestionSection, Question['category']> = {
      vocabulary: 'VOCAB',
      grammar: 'GRAMMAR',
      cloze: 'CLOZE',
      sentence_completion: 'SENTENCE',
    }
    const mapped = (allRaw.value.questions as Record<string, unknown>[])
      .map((raw): Question | null => {
        const section = normalizeSection(raw.section as string)
        if (!section) return null
        if (existingIds.has(raw.id as string)) return null
        return {
          id: raw.id as string,
          exam: (raw.exam_id ?? raw.exam ?? '') as string,
          question_text: raw.question_text as string,
          options: raw.options as Record<string, string>,
          correct_answer: raw.correct_answer as string,
          category: catMap[section],
          pattern: '',
          meaning_tr: '',
          example_en: '',
          example_tr: '',
          trap: '',
          short_explanation: '',
          difficulty: 2 as 1 | 2 | 3,
          closest_distractors: [] as string[],
          section,
        }
      })
      .filter((q): q is Question => q !== null)

    data.questions = [...data.questions, ...mapped]
  }

  _cache = data
  return _cache
}

export function pickQuizQuestions(
  data: YDSData,
  count = 5,
  stats: Record<string, { seen: number; correct: number }> = {},
  section?: QuestionSection
) {
  const baseQuestions = section
    ? data.questions.filter(q => q.section === section)
    : data.questions

  // Generated questions have no section metadata, so they are only included
  // when no section filter is active (i.e. the "all" mode).
  const generated = section
    ? []
    : data.generated_questions.map(g => ({
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
        difficulty: g.difficulty as 1 | 2 | 3,
        closest_distractors: g.closest_distractors,
      }))

  const all = [...baseQuestions, ...generated]

  const scored = all.map(q => {
    const s = stats[q.id]
    if (!s) return { q, score: Math.random() + 10 }
    const acc = s.correct / s.seen
    return { q, score: (1 - acc) * 5 + Math.random() }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(x => x.q)
}
