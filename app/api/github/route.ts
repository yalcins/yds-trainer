import { appendUserQuestion } from '@/lib/github-db'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { question } = await req.json()
  if (!question) return Response.json({ error: 'No question' }, { status: 400 })

  const q = {
    ...question,
    id: `MANUAL_${Date.now()}`,
    exam: 'manual',
  }

  await appendUserQuestion(q)
  return Response.json({ ok: true, question: q })
}
