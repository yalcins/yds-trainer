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
  const [form, setForm]       = useState(EMPTY)
  const [status, setStatus]   = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [genLoading, setGenLoading] = useState(false)
  const [genMsg, setGenMsg]   = useState('')

  const set    = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))
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
      const res  = await fetch('/api/generate', {
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
    <div className="space-y-5 pb-4">
      <h1 className="text-2xl font-black text-[#3C3C3C] pt-1">Soru Ekle</h1>

      {/* AI Generate */}
      <div className="card p-4 space-y-3 border-l-4 border-[#58CC02]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h2 className="font-black text-[#3C3C3C]">AI ile Otomatik Üret</h2>
        </div>
        <p className="text-xs font-semibold text-[#AFAFAF]">
          Hatalı yaptığın kalıpları analiz edip yeni sorular üretir ve GitHub&apos;a kaydeder.
        </p>
        <button
          onClick={generateAI}
          disabled={genLoading}
          className="btn-duo"
        >
          {genLoading ? '⏳ Üretiliyor...' : '✨ HATALIDAN SORU ÜRET'}
        </button>
        {genMsg && (
          <p className={`text-sm font-bold ${genMsg.startsWith('✅') ? 'text-[#58CC02]' : 'text-[#FF4B4B]'}`}>
            {genMsg}
          </p>
        )}
      </div>

      {/* Manual Form */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✏️</span>
          <h2 className="font-black text-[#3C3C3C]">Manuel Ekle</h2>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">
            Soru Metni (boşluk için ---- kullan)
          </label>
          <textarea
            rows={3}
            value={form.question_text}
            onChange={e => set('question_text', e.target.value)}
            className="w-full border-2 border-[#E5E5E5] rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#58CC02] transition-colors"
            placeholder="The researchers ---- significant progress in the field of..."
          />
        </div>

        <div className="space-y-2">
          {(['A','B','C','D','E'] as const).map(k => (
            <div key={k} className="flex items-center gap-2">
              <span className={`font-black text-sm w-5 ${form.correct_answer === k ? 'text-[#58CC02]' : 'text-[#AFAFAF]'}`}>
                {k}
              </span>
              <input
                type="text"
                value={form.options[k]}
                onChange={e => setOpt(k, e.target.value)}
                placeholder={`Seçenek ${k}`}
                className="flex-1 border-2 border-[#E5E5E5] rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#58CC02] transition-colors"
              />
              <button
                onClick={() => set('correct_answer', k)}
                className={`text-xs px-2.5 py-1.5 rounded-xl border-2 font-black transition-all ${
                  form.correct_answer === k
                    ? 'bg-[#58CC02] text-white border-[#58CC02]'
                    : 'border-[#E5E5E5] text-[#AFAFAF]'
                }`}
              >
                ✓
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Kategori</label>
            <select
              value={form.category}
              onChange={e => set('category', e.target.value)}
              className="w-full mt-1 border-2 border-[#E5E5E5] rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#58CC02]"
            >
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Zorluk</label>
            <select
              value={form.difficulty}
              onChange={e => set('difficulty', Number(e.target.value))}
              className="w-full mt-1 border-2 border-[#E5E5E5] rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-[#58CC02]"
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
            <label className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">{label}</label>
            <input
              type="text"
              value={(form as any)[key as string]}
              onChange={e => set(key as string, e.target.value)}
              placeholder={placeholder as string}
              className="w-full border-2 border-[#E5E5E5] rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-[#58CC02] transition-colors"
            />
          </div>
        ))}

        <button
          onClick={save}
          disabled={status === 'saving' || !form.question_text}
          className={`btn-duo ${status === 'ok' ? 'btn-duo-yellow' : ''}`}
        >
          {status === 'saving' ? '⏳ KAYDEDİLİYOR...' : status === 'ok' ? '✅ KAYDEDİLDİ!' : '💾 GITHUB\'A KAYDET'}
        </button>
        {status === 'error' && (
          <p className="text-[#FF4B4B] text-sm font-bold text-center">Hata oluştu. GitHub token kontrol et.</p>
        )}
      </div>
    </div>
  )
}
