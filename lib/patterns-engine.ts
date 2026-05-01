// ── Pattern DB types ───────────────────────────────────────────────────────────

export interface PatternItem {
  id: string
  pattern_text: string
  category: 'VOCAB' | 'LINKER' | 'PREPOSITION' | 'PHRASAL' | 'GRAMMAR' | 'SENTENCE_COMPLETION' | 'CLOZE' | 'READING'
  meaning_tr: string
  memory_trick: string
  mini_story: string
  collocations: string[]
  trap_words: string[]
  trap_explanation: string
  example_en: string
  example_tr: string
  difficulty: 1 | 2 | 3
  question_numbers: number[]
}

// ── Word Lab progress ──────────────────────────────────────────────────────────

export interface WordProgress {
  patternId: string
  seenCount: number
  correctCount: number
  wrongCount: number
  memoryScore: number       // 0-100
  confidenceScore: number   // 0-100
  masteryScore: number      // 0-100
  lastSeen: string
  nextReviewDate: string
  status: 'new' | 'learning' | 'reviewing' | 'mastered'
}

export interface WordLabStore {
  progress: Record<string, WordProgress>
  activeRecallHistory: Array<{ patternId: string; correct: boolean; date: string }>
  produceModeHistory: Array<{ patternId: string; correct: boolean; date: string }>
}

// ── LocalStorage key ──────────────────────────────────────────────────────────

const KEY = 'yds_wordlab'

const defaultStore = (): WordLabStore => ({
  progress: {},
  activeRecallHistory: [],
  produceModeHistory: [],
})

export function getWordLabStore(): WordLabStore {
  if (typeof window === 'undefined') return defaultStore()
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaultStore(), ...JSON.parse(raw) } : defaultStore()
  } catch { return defaultStore() }
}

export function saveWordLabStore(s: WordLabStore) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

function addDays(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
}

export function recordWordAnswer(
  patternId: string,
  isCorrect: boolean,
  confidence: 'low' | 'medium' | 'high',
  mode: 'recall' | 'produce' | 'quiz'
): WordLabStore {
  const s = getWordLabStore()
  const today = new Date().toISOString().slice(0, 10)

  const wp: WordProgress = s.progress[patternId] ?? {
    patternId,
    seenCount: 0, correctCount: 0, wrongCount: 0,
    memoryScore: 0, confidenceScore: 0, masteryScore: 0,
    lastSeen: today, nextReviewDate: today,
    status: 'new',
  }

  wp.seenCount += 1
  if (isCorrect) wp.correctCount += 1
  else wp.wrongCount += 1
  wp.lastSeen = today

  // Memory score: correct answers with high confidence boost it
  const delta = isCorrect
    ? (confidence === 'high' ? 25 : confidence === 'medium' ? 15 : 8)
    : (confidence === 'high' ? -20 : confidence === 'medium' ? -10 : -5)
  wp.memoryScore = Math.max(0, Math.min(100, wp.memoryScore + delta))
  wp.confidenceScore = confidence === 'high' ? Math.min(100, wp.confidenceScore + 10)
    : confidence === 'low' ? Math.max(0, wp.confidenceScore - 5) : wp.confidenceScore
  wp.masteryScore = Math.round((wp.memoryScore * 0.6) + (wp.confidenceScore * 0.4))

  // Spaced repetition
  if (!isCorrect) {
    wp.nextReviewDate = addDays(1)
    wp.status = 'learning'
  } else if (confidence === 'low') {
    wp.nextReviewDate = addDays(1)
    wp.status = 'learning'
  } else if (wp.masteryScore >= 85) {
    wp.nextReviewDate = addDays(7)
    wp.status = 'mastered'
  } else if (wp.correctCount >= 3) {
    wp.nextReviewDate = addDays(3)
    wp.status = 'reviewing'
  } else {
    wp.nextReviewDate = addDays(2)
    wp.status = 'learning'
  }

  s.progress[patternId] = wp

  if (mode === 'recall') {
    s.activeRecallHistory.push({ patternId, correct: isCorrect, date: today })
    s.activeRecallHistory = s.activeRecallHistory.slice(-200)
  }
  if (mode === 'produce') {
    s.produceModeHistory.push({ patternId, correct: isCorrect, date: today })
    s.produceModeHistory = s.produceModeHistory.slice(-200)
  }

  saveWordLabStore(s)
  return s
}

// ── Review queue ───────────────────────────────────────────────────────────────

export function getWordReviewQueue(patterns: PatternItem[]): PatternItem[] {
  const store = getWordLabStore()
  const today = new Date().toISOString().slice(0, 10)
  return patterns.filter(p => {
    const wp = store.progress[p.id]
    if (!wp) return false  // not yet studied
    return wp.status !== 'mastered' && wp.nextReviewDate <= today
  }).sort((a, b) => {
    const wa = store.progress[a.id]!
    const wb = store.progress[b.id]!
    return wa.masteryScore - wb.masteryScore
  })
}

// ── Generate mini quiz from pattern ──────────────────────────────────────────

export function generateMiniQuiz(p: PatternItem): {
  question: string
  correctAnswer: string
  options: string[]
} {
  const correctAnswer = p.meaning_tr.split('/')[0].trim().split('(')[0].trim()
  // Use trap words as distractors if available, else use generic ones
  const distractors = p.trap_words.slice(0, 2)
  const fallbackDistractors = ['uygulamak', 'sınırlamak', 'incelemek']
  const wrongOpts = [...distractors.map(t => t.replace(/^.*→ /, '')), ...fallbackDistractors]
    .filter(o => o.length > 2 && o !== correctAnswer)
    .slice(0, 3)

  const all = [correctAnswer, ...wrongOpts].slice(0, 4)
  const shuffled = all.sort(() => Math.random() - 0.5)

  return {
    question: `"${p.pattern_text}" ne anlama gelir?`,
    correctAnswer,
    options: shuffled,
  }
}

// ── Mastery stats ─────────────────────────────────────────────────────────────

export function getMasteryStats(patterns: PatternItem[]) {
  const store = getWordLabStore()
  const total    = patterns.length
  const mastered = patterns.filter(p => store.progress[p.id]?.status === 'mastered').length
  const learning = patterns.filter(p => store.progress[p.id]?.status === 'learning').length
  const reviewing= patterns.filter(p => store.progress[p.id]?.status === 'reviewing').length
  const newCount = total - mastered - learning - reviewing
  return { total, mastered, learning, reviewing, new: newCount }
}
