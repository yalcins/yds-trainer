export interface Question {
  id: string
  exam: string
  question_text: string
  options: Record<string, string>
  correct_answer: string
  category: 'VOCAB' | 'PHRASAL' | 'GRAMMAR' | 'PREPOSITION' | 'LINKER'
  pattern: string
  meaning_tr: string
  example_en: string
  example_tr: string
  trap: string
  short_explanation: string
  difficulty: 1 | 2 | 3
  closest_distractors: string[]
}

export interface Pattern {
  pattern: string
  category: string
  meaning_tr: string
  example_en: string
  example_tr: string
}

export interface GeneratedQuestion {
  gen_id: string
  source_pattern: string
  question_text: string
  options: Record<string, string>
  correct_answer: string
  category: string
  difficulty: number
  closest_distractors: string[]
  trap: string
}

export interface YDSData {
  meta: {
    total_questions: number
    total_patterns: number
    total_generated: number
    categories: string[]
  }
  questions: Question[]
  patterns: Pattern[]
  generated_questions: GeneratedQuestion[]
}

export interface ParsedQuestion {
  question_id: string
  question_text: string
  options: Record<string, string>
  correct_answer: string
  user_answer: string | null
  is_correct: boolean
  section_key: string
}

export interface ExamResultQuestion {
  id: string
  question_text: string
  options: Record<string, string>
  correct_answer: string
  exam?: string
  user_answer?: string | null
  is_correct?: boolean
}

export interface ExamResultInput {
  questions: ExamResultQuestion[]
}

export interface QuestionStat {
  seen: number
  correct: number
  lastSeen: string
}

export interface UserProgress {
  streak: number
  lastPlayedDate: string
  xp: number
  questionStats: Record<string, QuestionStat>
  completedRounds: number
}
