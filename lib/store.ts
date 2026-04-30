'use client'
import { UserProgress, QuestionStat, TrainingProgress, DailyLog } from './types'

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

// ── Training Progress ─────────────────────────────────────────────────────────

const TRAIN_KEY = 'yds_training'

const defaultTraining = (): TrainingProgress => ({
  sectionStats: {},
  dailyLogs: [],
  currentStreak: 0,
  lastTrainedDate: '',
  totalTrainingXp: 0,
  tipsViewed: {},
})

export function getTrainingProgress(): TrainingProgress {
  if (typeof window === 'undefined') return defaultTraining()
  try {
    const raw = localStorage.getItem(TRAIN_KEY)
    return raw ? { ...defaultTraining(), ...JSON.parse(raw) } : defaultTraining()
  } catch {
    return defaultTraining()
  }
}

export function saveTrainingProgress(p: TrainingProgress) {
  localStorage.setItem(TRAIN_KEY, JSON.stringify(p))
}

export function markTipsViewed(sectionKey: string) {
  const p = getTrainingProgress()
  p.tipsViewed[sectionKey] = true
  saveTrainingProgress(p)
}

export function recordTrainingAnswer(sectionKey: string, correct: boolean): TrainingProgress {
  const p = getTrainingProgress()
  const today = new Date().toISOString().slice(0, 10)
  const xpGained = correct ? 15 : 0

  // section stats
  const sec = p.sectionStats[sectionKey] ?? { attempts: 0, correct: 0, lastPracticed: '' }
  sec.attempts += 1
  if (correct) sec.correct += 1
  sec.lastPracticed = today
  p.sectionStats[sectionKey] = sec

  // daily log
  let todayLog = p.dailyLogs.find(l => l.date === today)
  if (!todayLog) {
    todayLog = { date: today, questionsAnswered: 0, correct: 0, wrong: 0, xpEarned: 0, sectionsStudied: [] }
    p.dailyLogs.push(todayLog)
  }
  todayLog.questionsAnswered += 1
  if (correct) todayLog.correct += 1
  else todayLog.wrong += 1
  todayLog.xpEarned += xpGained
  if (!todayLog.sectionsStudied.includes(sectionKey)) {
    todayLog.sectionsStudied.push(sectionKey)
  }

  // streak
  if (p.lastTrainedDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    p.currentStreak = p.lastTrainedDate === yesterday ? p.currentStreak + 1 : 1
    p.lastTrainedDate = today
  }

  p.totalTrainingXp += xpGained
  // keep only last 30 days
  p.dailyLogs = p.dailyLogs.slice(-30)

  saveTrainingProgress(p)
  return p
}

export function getTodayLog(): DailyLog | null {
  const p = getTrainingProgress()
  const today = new Date().toISOString().slice(0, 10)
  return p.dailyLogs.find(l => l.date === today) ?? null
}

export function getLast7DaysLogs(): DailyLog[] {
  const p = getTrainingProgress()
  const days: DailyLog[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    const log = p.dailyLogs.find(l => l.date === d)
    days.push(log ?? { date: d, questionsAnswered: 0, correct: 0, wrong: 0, xpEarned: 0, sectionsStudied: [] })
  }
  return days
}
