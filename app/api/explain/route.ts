import { githubAI } from '@/lib/github-ai'

export const runtime = 'nodejs'

const SYSTEM = `Sen bir YDS (Yabancı Dil Sınavı) İngilizce sınav uzmanısın.
Öğrenciye sorulan sorunun doğru cevabını kısa ve net biçimde açıklıyorsun.
Türkçe açıkla, gerektiğinde İngilizce örnekler kullan.
YDS sınav tarzında düşün: akademik, formal İngilizce.`

export async function POST(req: Request) {
  const { question, correctAnswer } = await req.json()

  if (!question || typeof question !== 'string' || !correctAnswer || typeof correctAnswer !== 'string') {
    return new Response(JSON.stringify({ error: 'question and correctAnswer are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userMessage = `Soru: ${question}\nDoğru cevap: ${correctAnswer}\n\nBu cevabın neden doğru olduğunu kısaca açıkla.`

  const res = await githubAI(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userMessage },
    ],
    true
  )

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
