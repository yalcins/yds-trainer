'use client'
import { useState } from 'react'
import { getProgress } from '@/lib/store'

const EMPTY = {
  question_text: '',
  options: { A: '', B: '', C: '', D: '', E: '' },
  correct_answer: 'A',
  category: 'VOCAB',
  pattern: '',
  meaning_tr: '',
  example_en: '',
  example_tr: '',
  trap: '',
  short_explanation: '',
  difficulty: 2,
  closest_distractors: [] as string[],
}

const CATS = ['VOCAB', 'GRAMMAR', 'PREPOSITION', 'LINKER', 'PHRASAL']

export default function AdminPage() {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [genLoading, setGenLoading] = useState(false)
  const [genMsg, setGenMsg] = useState('')

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))
  const setOpt = (k: string, v: string) => setForm(f => ({ ...f, options: { ...f.options, [k]: v } }))

  async function save() {
    setStatus('saving')
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: form }),
      })
      if (!res.ok) throw new Error()
      setStatus('ok')
      setForm(EMPTY)
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    }
  }

  async function generateAI() {
    setGenLoading(true)
    setGenMsg('')
    const p = getProgress()
    const weakPatterns = Object.entries(p.questionStats)
      .filter(([, s]) => s.seen >= 2 && s.correct / s.seen < 0.6)
      .map(([id]) => id)
      .slice(0, 5)

    if (!weakPatterns.length) {
      setGenMsg('Henüz yeterli hata verisi yok. Önce quiz yap!')
      setGenLoading(false)
      return
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weakPatterns }),
      })
      const data = await res.json()
      if (data.questions) {
        setGenMsg(`✅ ${data.questions.length} yeni soru GitHub'a eklendi!`)
      } else {
        setGenMsg('❌ Hata: ' + (data.error ?? 'Bilinmeyen'))
      }
    } catch {
      setGenMsg('❌ Bağlantı hatası')
    }
    setGenLoading(false)
  }

  return (
    <div className="space-y-6 pb-4">
      <h1 className="text-2xl font-bold text-gray-900">Soru Ekle</h1>

      {/* AI Generate */}
      <div className="card p-4 space-y-3 border-l-4 border-indigo-400">
        <h2 className="font-semibold text-gray-700">🤖 AI ile Otomatik Üret</h2>
        <p className="text-xs text-gray-500">Hatalı yaptığın kalıpları analiz edip yeni sorular üretir ve GitHub'a kaydeder.</p>
        <button
          onClick={generateAI}
          disabled={genLoading}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          {genLoading ? '⏳ Üretiliyor...' : '✨ Hatalı Kalıplardan Soru Üret'}
        </button>
        {genMsg && <p className="text-sm font-medium text-gray-700">{genMsg}</p>}
      </div>

      {/* Manual Form */}
      <div className="card p-4 space-y-4">
        <h2 className="font-semibold text-gray-700">✏️ Manuel Ekle</h2>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500">Soru Metni (boşluk için ---- kullan)</label>
          <textarea
            rows={3}
            value={form.question_text}
            onChange={e => set('question_text', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="The researchers ---- significant progress in the field of..."
          />
        </div>

        <div className="grid grid-cols-1 gap-2">
          {(['A','B','C','D','E'] as const).map(k => (
            <div key={k} className="flex items-center gap-2">
              <span className={`font-bold text-sm w-5 ${form.correct_answer === k ? 'text-green-600' : 'text-gray-400'}`}>{k}</span>
              <input
                type="text"
                value={form.options[k]}
                onChange={e => setOpt(k, e.target.value)}
                placeholder={`Seçenek ${k}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => set('correct_answer', k)}
                className={`text-xs px-2 py-1 rounded-lg border ${form.correct_answer === k ? 'bg-green-500 text-white border-green-500' : 'border-gray-200 text-gray-400'}`}
              >
                ✓
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Kategori</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Zorluk (1-3)</label>
            <select
              value={form.difficulty}
              onChange={e => set('difficulty', Number(e.target.value))}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value={1}>1 — Kolay</option>
              <option value={2}>2 — Orta</option>
              <option value={3}>3 — Zor</option>
            </select>
          </div>
        </div>

        {[
          ['Kalıp', 'pattern', 'conformity to, interfere with...'],
          ['Türkçe Anlam', 'meaning_tr', 'uyum sağlamak...'],
          ['İngilizce Örnek', 'example_en', 'The committee adhered strictly to...'],
          ['Türkçe Örnek', 'example_tr', 'Komite kesinlikle...'],
          ['Tuzak', 'trap', 'Neden yanlış şıklar cazip görünür...'],
          ['Kısa Açıklama', 'short_explanation', '...'],
        ].map(([label, key, placeholder]) => (
          <div key={key as string} className="space-y-1">
            <label className="text-xs font-semibold text-gray-500">{label}</label>
            <input
              type="text"
              value={(form as any)[key as string]}
              onChange={e => set(key as string, e.target.value)}
              placeholder={placeholder as string}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        ))}

        <button
          onClick={save}
          disabled={status === 'saving' || !form.question_text}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
        >
          {status === 'saving' ? '⏳ Kaydediliyor...' : status === 'ok' ? '✅ Kaydedildi!' : '💾 GitHub\'a Kaydet'}
        </button>
        {status === 'error' && <p className="text-red-500 text-sm text-center">Hata oluştu. GitHub token kontrol et.</p>}
      </div>
    </div>
  )
}
