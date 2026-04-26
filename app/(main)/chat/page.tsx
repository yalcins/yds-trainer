'use client'
import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  '"as a result" ile "therefore" farkı nedir?',
  '"interfere with" nasıl kullanılır, örnek ver',
  '"even though" ile "although" farkını açıkla',
  'Past perfect passive yapısını anlat',
  '"warrant" kelimesinin YDS bağlamındaki anlamı',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const content = text ?? input.trim()
    if (!content || loading) return
    setInput('')

    const newMessages: Msg[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.body) throw new Error('No stream')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      setMessages(m => [...m, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const json  = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content ?? ''
            assistantText += delta
            setMessages(m => {
              const updated = [...m]
              updated[updated.length - 1] = { role: 'assistant', content: assistantText }
              return updated
            })
          } catch {}
        }
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: '❌ Bağlantı hatası. Lütfen tekrar dene.' }])
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0 pb-3">
        <div className="w-10 h-10 rounded-2xl bg-[#58CC02] flex items-center justify-center text-xl border-b-4 border-[#46A302]">
          🤖
        </div>
        <div>
          <h1 className="text-lg font-black text-[#3C3C3C] leading-tight">YDS AI Asistan</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">YDS soruları için AI yardımcın</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Hızlı sorular</p>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="w-full text-left card p-3.5 text-sm font-semibold text-[#3C3C3C] border-b-4 border-[#E5E5E5] active:translate-y-[2px] active:border-b-[1px] transition-all"
              >
                💬 {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#58CC02] text-white rounded-br-sm border-b-4 border-[#46A302]'
                  : 'bg-white text-[#3C3C3C] rounded-bl-sm border-b-4 border-[#E5E5E5]'
              }`}
            >
              {m.content || (loading && i === messages.length - 1 ? (
                <span className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-[#AFAFAF] rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-[#AFAFAF] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-[#AFAFAF] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </span>
              ) : '')}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 border-b-4 border-[#E5E5E5]">
              <span className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-[#AFAFAF] rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-[#AFAFAF] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-[#AFAFAF] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex gap-2 pt-2 pb-1">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="YDS sorusu sor..."
          className="flex-1 border-2 border-[#E5E5E5] rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#58CC02] bg-white transition-colors"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="bg-[#58CC02] text-white px-5 rounded-2xl font-black border-b-4 border-[#46A302] disabled:opacity-40 active:translate-y-[2px] active:border-b-[1px] transition-all text-lg"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
