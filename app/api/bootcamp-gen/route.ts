import { githubAI } from '@/lib/github-ai'
import { buildSystemPrompt, buildUserMessage, parseRawQuestions, GOLD_EXAMPLES } from '@/lib/bootcamp-prompt'

export const runtime = 'nodejs'

// POST /api/bootcamp-gen
// Body: { rawText: string, testName: string, startNumber: number, batchSize?: number }
// Returns: { questions: object[], errors: string[] }

export async function POST(req: Request) {
  const { rawText, testName = 'test2', startNumber = 1, batchSize = 3 } = await req.json()

  if (!rawText?.trim()) {
    return Response.json({ error: 'rawText is required' }, { status: 400 })
  }

  const parsed = parseRawQuestions(rawText)
  if (parsed.length === 0) {
    return Response.json({ error: 'Could not parse any questions from input. Check format.' }, { status: 400 })
  }

  // Process in batches
  const allGenerated: object[] = []
  const errors: string[] = []
  const batches: typeof parsed[] = []
  for (let i = 0; i < parsed.length; i += batchSize) {
    batches.push(parsed.slice(i, i + batchSize))
  }

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const batchStart = startNumber + bi * batchSize
    const userMsg = buildUserMessage(batch, testName, batchStart)
    const systemMsg = buildSystemPrompt(GOLD_EXAMPLES)

    try {
      // Use higher token limit for rich JSON output
      const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user',   content: userMsg   },
          ],
          temperature: 0.2,
          max_tokens: 6000,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        errors.push(`Batch ${bi + 1} failed: ${res.status} — ${errText.slice(0, 200)}`)
        continue
      }

      const data = await res.json()
      const raw = (data.choices[0]?.message?.content ?? '').trim()

      // Strip code fences if present
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      let questions: object[]
      try {
        const match = cleaned.match(/\[[\s\S]*\]/)
        questions = JSON.parse(match ? match[0] : cleaned)
      } catch {
        errors.push(`Batch ${bi + 1} JSON parse error. Raw: ${raw.slice(0, 300)}`)
        continue
      }

      allGenerated.push(...questions)
    } catch (e: any) {
      errors.push(`Batch ${bi + 1} exception: ${e?.message ?? String(e)}`)
    }
  }

  return Response.json({
    questions: allGenerated,
    total: allGenerated.length,
    parsed: parsed.length,
    batches: batches.length,
    errors,
  })
}
