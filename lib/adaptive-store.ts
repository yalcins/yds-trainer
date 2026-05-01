'use client'

// ── Types ──────────────────────────────────────────────────────────────────────

export type Confidence = 'low' | 'medium' | 'high'
export type ErrorType =
  | 'dangerous_misconception' // high confidence + wrong
  | 'lucky_correct'           // low confidence + correct
  | 'weak_knowledge'          // low confidence + wrong
  | 'mastered'                // high confidence + correct
  | 'normal_correct'          // medium confidence + correct
  | 'normal_wrong'            // medium confidence + wrong

export interface Attempt {
  id: string
  questionId: number
  sectionKey: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  confidence: Confidence
  errorType: ErrorType
  timestamp: string
}

export interface QuestionReview {
  questionId: number
  seenCount: number
  correctCount: number
  wrongCount: number
  consecutiveCorrect: number
  masteryScore: number   // 0–100
  nextReviewDate: string // ISO date 'YYYY-MM-DD'
  lastConfidence: Confidence
  mastered: boolean
}

export interface PatternProgress {
  patternText: string
  category: string
  seenCount: number
  correctCount: number
  wrongCount: number
  masteryScore: number
  nextReviewDate: string
}

export interface DailySession {
  date: string
  questionIds: number[]
  currentIndex: number
  answers: Record<number, { answer: string; correct: boolean; confidence: Confidence }>
  completed: boolean
  startTime: string
  endTime?: string
  goldenFive: string[]
  xpEarned: number
}

export interface UserLevel {
  level: number       // 1–5
  name: string
  xpRequired: number
  description: string
}

export interface AdaptiveStore {
  attempts: Attempt[]
  questionReviews: Record<number, QuestionReview>
  patternProgress: Record<string, PatternProgress>
  dailySessions: DailySession[]
  currentSession: DailySession | null
  totalXp: number
  streak: number
  lastActiveDate: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const KEY = 'yds_adaptive'

const LEVELS: UserLevel[] = [
  { level: 1, name: 'Kelime Avcısı',     xpRequired: 0,    description: 'Vocabulary recognition' },
  { level: 2, name: 'Kalıp Tanıyıcı',    xpRequired: 300,  description: 'Pattern recognition' },
  { level: 3, name: 'Cümle Ustası',      xpRequired: 700,  description: 'Sentence logic' },
  { level: 4, name: 'Metin Analizörü',   xpRequired: 1200, description: 'Cloze logic & reading' },
  { level: 5, name: 'YDS Şampiyonu',     xpRequired: 2000, description: 'Full exam mastery' },
]

// ── Default factory ────────────────────────────────────────────────────────────

const defaultStore = (): AdaptiveStore => ({
  attempts: [],
  questionReviews: {},
  patternProgress: {},
  dailySessions: [],
  currentSession: null,
  totalXp: 0,
  streak: 0,
  lastActiveDate: '',
})

// ── CRUD ───────────────────────────────────────────────────────────────────────

export function getAdaptiveStore(): AdaptiveStore {
  if (typeof window === 'undefined') return defaultStore()
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaultStore(), ...JSON.parse(raw) } : defaultStore()
  } catch {
    return defaultStore()
  }
}

export function saveAdaptiveStore(s: AdaptiveStore) {
  // Keep only last 500 attempts to avoid localStorage bloat
  s.attempts = s.attempts.slice(-500)
  localStorage.setItem(KEY, JSON.stringify(s))
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
}

export function classifyError(confidence: Confidence, isCorrect: boolean): ErrorType {
  if (confidence === 'high'   && !isCorrect)  return 'dangerous_misconception'
  if (confidence === 'low'    && isCorrect)   return 'lucky_correct'
  if (confidence === 'low'    && !isCorrect)  return 'weak_knowledge'
  if (confidence === 'high'   && isCorrect)   return 'mastered'
  if (confidence === 'medium' && isCorrect)   return 'normal_correct'
  return 'normal_wrong'
}

export function getErrorTypeLabel(t: ErrorType): { label: string; color: string; icon: string } {
  switch (t) {
    case 'dangerous_misconception': return { label: 'Tehlikeli Yanılgı', color: 'text-[#FF4B4B]', icon: '🚨' }
    case 'lucky_correct':           return { label: 'Şanslı Doğru',      color: 'text-amber-500', icon: '🍀' }
    case 'weak_knowledge':          return { label: 'Zayıf Bilgi',        color: 'text-orange-500', icon: '📚' }
    case 'mastered':                return { label: 'Öğrenildi',          color: 'text-[#58CC02]',  icon: '⭐' }
    case 'normal_correct':          return { label: 'Doğru',              color: 'text-[#58CC02]',  icon: '✅' }
    case 'normal_wrong':            return { label: 'Yanlış',             color: 'text-[#FF4B4B]',  icon: '❌' }
  }
}

/** Next review date based on spaced repetition rules */
function nextReview(review: QuestionReview, isCorrect: boolean): string {
  if (!isCorrect) {
    if (review.wrongCount >= 2) return addDays(1)   // Wrong twice → review tomorrow daily
    return addDays(1)
  }
  const consecutive = review.consecutiveCorrect + 1
  if (consecutive >= 5) return addDays(999)          // Mastered
  if (consecutive >= 3) return addDays(7)            // Correct 3x → 7 days
  return addDays(3)                                  // Correct once → 3 days
}

// ── Core action: record an answer ─────────────────────────────────────────────

export function recordAnswer(params: {
  questionId: number
  sectionKey: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  confidence: Confidence
  patterns?: string[]
}): AdaptiveStore {
  const s = getAdaptiveStore()
  const t = today()

  const errorType = classifyError(params.confidence, params.isCorrect)
  const xp = params.isCorrect
    ? (params.confidence === 'high' ? 20 : params.confidence === 'medium' ? 15 : 10)
    : 0

  // ── Attempt ───────────────────────────────────────────────────────────────
  const attempt: Attempt = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    questionId: params.questionId,
    sectionKey: params.sectionKey,
    selectedAnswer: params.selectedAnswer,
    correctAnswer: params.correctAnswer,
    isCorrect: params.isCorrect,
    confidence: params.confidence,
    errorType,
    timestamp: new Date().toISOString(),
  }
  s.attempts.push(attempt)

  // ── Question review ───────────────────────────────────────────────────────
  const qr: QuestionReview = s.questionReviews[params.questionId] ?? {
    questionId: params.questionId,
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrect: 0,
    masteryScore: 0,
    nextReviewDate: t,
    lastConfidence: params.confidence,
    mastered: false,
  }
  qr.seenCount += 1
  qr.lastConfidence = params.confidence
  if (params.isCorrect) {
    qr.correctCount += 1
    qr.consecutiveCorrect += 1
  } else {
    qr.wrongCount += 1
    qr.consecutiveCorrect = 0
  }
  qr.masteryScore = Math.min(100, Math.round((qr.correctCount / qr.seenCount) * 100))
  qr.nextReviewDate = nextReview(qr, params.isCorrect)
  qr.mastered = qr.consecutiveCorrect >= 5
  s.questionReviews[params.questionId] = qr

  // ── Pattern progress ──────────────────────────────────────────────────────
  for (const pattern of (params.patterns ?? [])) {
    const pp: PatternProgress = s.patternProgress[pattern] ?? {
      patternText: pattern,
      category: params.sectionKey,
      seenCount: 0,
      correctCount: 0,
      wrongCount: 0,
      masteryScore: 0,
      nextReviewDate: t,
    }
    pp.seenCount += 1
    if (params.isCorrect) pp.correctCount += 1
    else pp.wrongCount += 1
    pp.masteryScore = Math.round((pp.correctCount / pp.seenCount) * 100)
    s.patternProgress[pattern] = pp
  }

  // ── XP + streak ───────────────────────────────────────────────────────────
  s.totalXp += xp
  if (s.lastActiveDate !== t) {
    const yesterday = addDays(-1)
    s.streak = s.lastActiveDate === yesterday ? s.streak + 1 : 1
    s.lastActiveDate = t
  }

  // ── Session update ────────────────────────────────────────────────────────
  if (s.currentSession && !s.currentSession.completed) {
    s.currentSession.answers[params.questionId] = {
      answer: params.selectedAnswer,
      correct: params.isCorrect,
      confidence: params.confidence,
    }
    s.currentSession.xpEarned = (s.currentSession.xpEarned ?? 0) + xp
  }

  saveAdaptiveStore(s)
  return s
}

// ── Session management ────────────────────────────────────────────────────────

export function startSession(questionIds: number[], goldenFive: string[]): DailySession {
  const s = getAdaptiveStore()
  const session: DailySession = {
    date: today(),
    questionIds,
    currentIndex: 0,
    answers: {},
    completed: false,
    startTime: new Date().toISOString(),
    goldenFive,
    xpEarned: 0,
  }
  s.currentSession = session
  saveAdaptiveStore(s)
  return session
}

export function finishSession(): void {
  const s = getAdaptiveStore()
  if (!s.currentSession) return
  s.currentSession.completed = true
  s.currentSession.endTime = new Date().toISOString()
  s.dailySessions.push({ ...s.currentSession })
  s.dailySessions = s.dailySessions.slice(-30)
  s.currentSession = null
  saveAdaptiveStore(s)
}

// ── Computed getters ──────────────────────────────────────────────────────────

export function getUserLevel(totalXp: number): UserLevel {
  let current = LEVELS[0]
  for (const l of LEVELS) {
    if (totalXp >= l.xpRequired) current = l
  }
  return current
}

export function getLevelProgress(totalXp: number): { level: UserLevel; next: UserLevel | null; pct: number } {
  const level = getUserLevel(totalXp)
  const nextIdx = level.level  // level is 1-based, array is 0-based
  const next = LEVELS[nextIdx] ?? null
  const pct = next
    ? Math.round(((totalXp - level.xpRequired) / (next.xpRequired - level.xpRequired)) * 100)
    : 100
  return { level, next, pct }
}

export function getReviewQueue(store: AdaptiveStore): number[] {
  const t = today()
  return Object.values(store.questionReviews)
    .filter(r => !r.mastered && r.nextReviewDate <= t)
    .sort((a, b) => {
      // dangerous misconceptions first
      if (a.wrongCount > b.wrongCount) return -1
      if (a.wrongCount < b.wrongCount) return 1
      return a.masteryScore - b.masteryScore
    })
    .map(r => r.questionId)
}

export function getTodaySession(store: AdaptiveStore): DailySession | null {
  return store.dailySessions.find(s => s.date === today()) ?? null
}

export function getSectionAccuracy(store: AdaptiveStore, sectionKey: string): { attempts: number; correct: number; pct: number } {
  const relevant = store.attempts.filter(a => a.sectionKey === sectionKey)
  if (!relevant.length) return { attempts: 0, correct: 0, pct: 0 }
  const correct = relevant.filter(a => a.isCorrect).length
  return { attempts: relevant.length, correct, pct: Math.round((correct / relevant.length) * 100) }
}

export function getDangerousMisconceptions(store: AdaptiveStore): Attempt[] {
  const seen = new Set<number>()
  return store.attempts
    .filter(a => a.errorType === 'dangerous_misconception')
    .filter(a => { if (seen.has(a.questionId)) return false; seen.add(a.questionId); return true })
}

export function getWeakQuestions(store: AdaptiveStore, limit = 10): QuestionReview[] {
  return Object.values(store.questionReviews)
    .filter(r => r.seenCount >= 1 && !r.mastered)
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, limit)
}
