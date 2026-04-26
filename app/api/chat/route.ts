import { githubAI } from '@/lib/github-ai'

export const runtime = 'nodejs'

const SYSTEM = `Sen bir YDS (Yabancı Dil Sınavı) İngilizce sınav uzmanısın.
Öğrenciye İngilizce kelime, gramer, bağlaç ve preposition sorularında yardım ediyorsun.
Cevapların kısa, net ve akademik düzeyde olsun.
Türkçe açıklama yap, örnekleri İngilizce ver.
YDS sınav tarzında düşün: akademik, formal İngilizce.`

export async function POST(req: Request) {
  const { messages } = await req.json()

  const res = await githubAI(
    [{ role: 'system', content: SYSTEM }, ...messages],
    true
  )

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
