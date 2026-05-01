'use client'
import { UserProgress, QuestionStat, PatternStat } from './types'

const KEY = 'yds_progress'

const defaultProgress = (): UserProgress => ({
  streak: 0,
  lastPlayedDate: '',
  xp: 0,
  questionStats: {},
  completedRounds: 0,
  patternStats: {},
})

const SRS_MASTERY_THRESHOLD = 5
const SRS_INTERMEDIATE_THRESHOLD = 3
const SRS_INTERMEDIATE_REVIEW_DAYS = 3
const SRS_WRONG_REVIEW_DAYS = 1

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return defaultProgress()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProgress()
    const parsed = JSON.parse(raw) as UserProgress
    // Backward compatibility: ensure patternStats exists
    if (!parsed.patternStats) parsed.patternStats = {}
    return parsed
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(p: UserProgress) {
  localStorage.setItem(KEY, JSON.stringify(p))
}

export function recordAnswer(questionId: string, correct: boolean, pattern?: string) {
  const p = getProgress()
  const today = new Date().toISOString().slice(0, 10)

  const stat: QuestionStat = p.questionStats[questionId] ?? { seen: 0, correct: 0, lastSeen: '' }
  stat.seen += 1
  if (correct) stat.correct += 1
  stat.lastSeen = today
  p.questionStats[questionId] = stat

  if (correct) p.xp += 10

  // streak
  if (p.lastPlayedDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    p.streak = p.lastPlayedDate === yesterday ? p.streak + 1 : 1
    p.lastPlayedDate = today
  }

  if (pattern) {
    const ps: PatternStat = p.patternStats[pattern] ?? { correct_count: 0, wrong_count: 0, last_seen: '', next_review: '' }
    ps.last_seen = today
    if (correct) {
      ps.correct_count += 1
      if (ps.correct_count >= SRS_MASTERY_THRESHOLD) {
        ps.next_review = 'mastered'
      } else if (ps.correct_count >= SRS_INTERMEDIATE_THRESHOLD) {
        ps.next_review = addDays(today, SRS_INTERMEDIATE_REVIEW_DAYS)
      } else {
        ps.next_review = addDays(today, SRS_WRONG_REVIEW_DAYS)
      }
    } else {
      ps.wrong_count += 1
      ps.next_review = addDays(today, SRS_WRONG_REVIEW_DAYS)
    }
    p.patternStats[pattern] = ps
  }

  saveProgress(p)
  return p
}

export function finishRound() {
  const p = getProgress()
  p.completedRounds += 1
  saveProgress(p)
}

export function getWeakCategories(p: UserProgress): Record<string, { correct: number; total: number }> {
  return {} // populated with question data in component
}

export function isPatternDue(ps: PatternStat | undefined): boolean {
  if (!ps || !ps.next_review) return true // never seen → due
  if (ps.next_review === 'mastered') return false
  const today = new Date().toISOString().slice(0, 10)
  return ps.next_review <= today
}

export function resetProgress() {
  localStorage.removeItem(KEY)
}
