import { githubAI } from '@/lib/github-ai'
import type { MemoryCard } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const { word, meaning_tr } = await req.json()

  if (!word) {
    return Response.json({ error: 'No word provided' }, { status: 400 })
  }

  const prompt = `Sen bir YDS sınavı kelime uzmanısın. Aşağıdaki kelime veya kalıp için bir hafıza kartı oluştur.

Kelime/Kalıp: ${word}
${meaning_tr ? `Türkçe Anlamı: ${meaning_tr}` : ''}

Şu JSON formatında bir hafıza kartı döndür:
{
  "word": "${word}",
  "meaning_tr": "Türkçe anlamı (kısa, net)",
  "memory_trick": "Kelimeyi hatırlamaya yardımcı olacak yaratıcı bir bellek ipucu (Türkçe, 1-2 cümle)",
  "mini_story": "Kelimeyi içeren kısa ve eğlenceli bir mini hikaye (İngilizce, 2-3 cümle)",
  "example_sentence": "YDS düzeyinde akademik bir örnek cümle (İngilizce)",
  "trap_words": ["karıştırılabilecek kelime 1", "karıştırılabilecek kelime 2"]
}

Sadece JSON döndür, başka metin ekleme.`

  const res = await githubAI([{ role: 'user', content: prompt }])
  const data = await res.json()
  const raw = data.choices[0].message.content.trim()

  let card: MemoryCard
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    card = JSON.parse(match ? match[0] : raw)
  } catch {
    return Response.json({ error: 'Failed to parse AI response as JSON. The model returned unexpected content.', raw }, { status: 500 })
  }

  return Response.json({ card })
}
