import { githubAI } from '@/lib/github-ai'
import type { Question } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { question, selectedAnswer }: { question: Question; selectedAnswer: string } =
    await req.json()

  if (!question || !selectedAnswer) {
    return Response.json({ error: 'Missing question or selectedAnswer' }, { status: 400 })
  }

  const options = Object.entries(question.options)
    .map(([k, v]) => `${k}) ${v}`)
    .join('\n')

  const isCorrect = selectedAnswer === question.correct_answer
  const wrongNote = isCorrect
    ? ''
    : `Öğrencinin seçtiği yanlış cevap: ${selectedAnswer}) ${question.options[selectedAnswer as keyof typeof question.options]}`

  const prompt = `Sen bir YDS (Yabancı Dil Sınavı) uzmanısın. Aşağıdaki soru için yapılandırılmış bir açıklama yaz.

Soru: ${question.question_text}
Seçenekler:
${options}
Doğru cevap: ${question.correct_answer}) ${question.options[question.correct_answer as keyof typeof question.options]}
${wrongNote}

Şu JSON formatında SADECE JSON döndür, başka metin ekleme:
{
  "correct_reason": "Doğru cevabın neden doğru olduğunu 1-2 cümleyle açıkla (Türkçe)",
  "wrong_reason": ${isCorrect ? 'null' : '"Öğrencinin seçtiği yanlış cevabın neden yanlış olduğunu 1-2 cümleyle açıkla (Türkçe)"'},
  "distractor_reason": "Bu soruda tuzak seçeneklerin neden cazip göründüğünü 1-2 cümleyle açıkla (Türkçe)"
}`

  let res
  try {
    res = await githubAI([{ role: 'user', content: prompt }])
  } catch (e) {
    return Response.json({ error: 'AI request failed', detail: String(e) }, { status: 502 })
  }
  let raw: string
  try {
    const data = await res.json()
    raw = data?.choices?.[0]?.message?.content?.trim()
    if (!raw) throw new Error('Empty AI response')
  } catch (e) {
    return Response.json({ error: 'AI response error', detail: String(e) }, { status: 502 })
  }

  let explanation
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    explanation = JSON.parse(match ? match[0] : raw)
  } catch {
    return Response.json({ error: 'AI parse error', raw }, { status: 500 })
  }

  return Response.json({ explanation })
}
