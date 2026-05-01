import { ExamResultInput, ParsedQuestion } from './types'

/**
 * Parses a YDS exam result JSON object and returns a clean structured array.
 *
 * The input JSON is expected to contain a `questions` array where each entry
 * may include `user_answer` and `is_correct` alongside the standard question
 * fields. If `is_correct` is omitted it is derived from `user_answer`.
 */
export function parseExamResult(input: ExamResultInput): ParsedQuestion[] {
  if (!input || !Array.isArray(input.questions)) {
    return []
  }

  return input.questions.map(q => {
    const user_answer = q.user_answer ?? null
    const is_correct =
      typeof q.is_correct === 'boolean'
        ? q.is_correct
        : user_answer !== null && user_answer === q.correct_answer

    return {
      question_id: q.id,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      user_answer,
      is_correct,
      // exam field identifies the source exam set, used here as the section key
      section_key: q.exam ?? '',
    }
  })
}
