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

// ── Training / Exam Analysis Types ───────────────────────────────────────────

export type SectionKey =
  | 'fill_blank_vocab'
  | 'cloze'
  | 'sentence_completion'
  | 'translation'
  | 'reading'
  | 'paragraph_completion'
  | 'paragraph_questions'

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ExamQuestion {
  question_number: number
  section_key: SectionKey
  section_name: string
  correct_answer: string
  user_answer: string
  is_correct: boolean
  question_text: string
  options: Record<string, string>
  correct_option_text?: string
  user_option_text?: string
  how_to_solve_this_type: string[]
  common_patterns: string[]
}

export interface SectionAnalysis {
  section_name: string
  correct: number
  total: number
  accuracy_pct: number
  wrong_question_numbers: number[]
  how_to_solve: string[]
  common_patterns: string[]
  study_advice: string
  priority: Priority
}

export interface ExamData {
  meta: {
    exam: string
    total_questions: number
    total_correct: number
    total_wrong: number
    yds_score: number
    target_score: number
    target_correct_needed: number
    additional_correct_needed: number
    study_priority_order: string[]
  }
  section_analysis: Record<SectionKey, SectionAnalysis>
  questions: ExamQuestion[]
}

// ── Training Progress ─────────────────────────────────────────────────────────

export interface TrainingSectionStat {
  attempts: number
  correct: number
  lastPracticed: string
}

export interface DailyLog {
  date: string
  questionsAnswered: number
  correct: number
  wrong: number
  xpEarned: number
  sectionsStudied: string[]
}

export interface TrainingProgress {
  sectionStats: Record<string, TrainingSectionStat>
  dailyLogs: DailyLog[]
  currentStreak: number
  lastTrainedDate: string
  totalTrainingXp: number
  tipsViewed: Record<string, boolean>
}
