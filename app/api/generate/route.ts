import { githubAI } from '@/lib/github-ai'
import { appendUserQuestion } from '@/lib/github-db'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { weakPatterns } = await req.json()

  if (!weakPatterns?.length) {
    return Response.json({ error: 'No patterns provided' }, { status: 400 })
  }

  const prompt = `Sen bir YDS sınavı soru yazarısın. Aşağıdaki kalıplar için YDS düzeyinde 2 adet çoktan seçmeli soru üret.

Kalıplar (hatalı yapılan):
${weakPatterns.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

Her soru için şu JSON formatını kullan (dizi olarak döndür):
{
  "id": "AI_<timestamp>_<index>",
  "question_text": "...(boşluk için ---- kullan)...",
  "options": {"A": "...", "B": "...", "C": "...", "D": "...", "E": "..."},
  "correct_answer": "X",
  "category": "VOCAB|GRAMMAR|PREPOSITION|LINKER|PHRASAL",
  "pattern": "...",
  "meaning_tr": "...",
  "example_en": "...",
  "example_tr": "...",
  "trap": "...",
  "short_explanation": "...",
  "difficulty": 2,
  "closest_distractors": ["X"],
  "exam": "AI_generated"
}

Sadece JSON dizisi döndür, başka metin ekleme.`

  const res = await githubAI([{ role: 'user', content: prompt }])
  const data = await res.json()
  const raw = data.choices[0].message.content.trim()

  let questions
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    questions = JSON.parse(match ? match[0] : raw)
  } catch {
    return Response.json({ error: 'AI parse error', raw }, { status: 500 })
  }

  const ts = Date.now()
  questions = questions.map((q: any, i: number) => ({
    ...q,
    id: `AI_${ts}_${i}`,
  }))

  for (const q of questions) {
    await appendUserQuestion(q)
  }

  return Response.json({ questions })
}
