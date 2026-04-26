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
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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

      const reader = res.body.getReader()
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
            const json = JSON.parse(data)
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
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: '❌ Bağlantı hatası. Lütfen tekrar dene.' }])
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-3 shrink-0">YDS AI Asistan</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Hızlı sorular:</p>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="w-full text-left card p-3 text-sm text-gray-700 hover:bg-indigo-50 border border-gray-100 active:scale-98 transition-all"
              >
                💬 {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
              }`}
            >
              {m.content || (loading && i === messages.length - 1 ? (
                <span className="flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                </span>
              ) : '')}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
              <span className="flex gap-1">
                <span className="animate-bounce text-gray-400">●</span>
                <span className="animate-bounce text-gray-400" style={{ animationDelay: '0.1s' }}>●</span>
                <span className="animate-bounce text-gray-400" style={{ animationDelay: '0.2s' }}>●</span>
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
          className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="bg-indigo-600 text-white px-4 rounded-2xl font-semibold disabled:opacity-40 active:scale-95 transition-transform"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
