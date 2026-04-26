'use client'
import { UserProgress, QuestionStat } from './types'

const KEY = 'yds_progress'

const defaultProgress = (): UserProgress => ({
  streak: 0,
  lastPlayedDate: '',
  xp: 0,
  questionStats: {},
  completedRounds: 0,
})

export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return defaultProgress()
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : defaultProgress()
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(p: UserProgress) {
  localStorage.setItem(KEY, JSON.stringify(p))
}

export function recordAnswer(questionId: string, correct: boolean) {
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

export function resetProgress() {
  localStorage.removeItem(KEY)
}
