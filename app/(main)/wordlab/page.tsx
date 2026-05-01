'use client'
import { useEffect, useState } from 'react'
import type { PatternItem } from '@/lib/patterns-engine'
import {
  getWordLabStore, recordWordAnswer, getMasteryStats,
  generateMiniQuiz, type WordProgress,
} from '@/lib/patterns-engine'

type View = 'list' | 'card' | 'quiz' | 'recall' | 'produce'
type Category = 'ALL' | 'VOCAB' | 'LINKER' | 'PREPOSITION' | 'PHRASAL' | 'GRAMMAR' | 'SENTENCE_COMPLETION'

const CAT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  VOCAB:               { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  LINKER:              { bg: 'bg-[#D7FFB8]',  text: 'text-[#46A302]', border: 'border-[#58CC02]' },
  PREPOSITION:         { bg: 'bg-amber-100',  text: 'text-amber-700', border: 'border-amber-400' },
  PHRASAL:             { bg: 'bg-blue-100',   text: 'text-blue-700',  border: 'border-blue-400' },
  GRAMMAR:             { bg: 'bg-purple-100', text: 'text-purple-700',border: 'border-purple-400' },
  SENTENCE_COMPLETION: { bg: 'bg-red-100',    text: 'text-red-700',   border: 'border-red-400' },
  CLOZE:               { bg: 'bg-orange-100', text: 'text-orange-700',border: 'border-orange-400' },
}

const STATUS_BADGE: Record<string, string> = {
  new:       'bg-[#F0F0F0] text-[#AFAFAF]',
  learning:  'bg-amber-100 text-amber-700',
  reviewing: 'bg-[#D7FFB8] text-[#46A302]',
  mastered:  'bg-[#58CC02] text-white',
}

export default function WordLabPage() {
  const [patterns, setPatterns]     = useState<PatternItem[]>([])
  const [filter, setFilter]         = useState<Category>('ALL')
  const [search, setSearch]         = useState('')
  const [view, setView]             = useState<View>('list')
  const [activeIdx, setActiveIdx]   = useState(0)
  const [flipped, setFlipped]       = useState<Set<string>>(new Set())
  const [storeVersion, setStoreVer] = useState(0)

  useEffect(() => {
    fetch('/yds_patterns_db.json').then(r => r.json()).then(setPatterns)
  }, [])

  const store  = getWordLabStore()
  const stats  = patterns.length ? getMasteryStats(patterns) : null

  const filtered = patterns.filter(p => {
    if (filter !== 'ALL' && p.category !== filter) return false
    if (search && !p.pattern_text.toLowerCase().includes(search.toLowerCase()) &&
        !p.meaning_tr.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (!patterns.length) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="text-4xl animate-bounce">🔤</div>
      <p className="font-bold text-[#AFAFAF]">Yükleniyor...</p>
    </div>
  )

  if (view === 'quiz') {
    return (
      <QuizMode
        patterns={filtered.length ? filtered : patterns}
        onDone={() => { setStoreVer(v => v + 1); setView('list') }}
      />
    )
  }

  if (view === 'recall') {
    return (
      <RecallMode
        patterns={filtered.length ? filtered : patterns}
        onDone={() => { setStoreVer(v => v + 1); setView('list') }}
      />
    )
  }

  if (view === 'produce') {
    return (
      <ProduceMode
        patterns={filtered.length ? filtered : patterns}
        onDone={() => { setStoreVer(v => v + 1); setView('list') }}
      />
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black text-[#3C3C3C]">🔤 Kelime Lab</h1>
          <p className="text-xs font-bold text-[#AFAFAF]">{patterns.length} kalıp · bellek sistemi</p>
        </div>
        {stats && (
          <div className="text-right text-[10px] font-bold text-[#AFAFAF]">
            <div className="text-base font-black text-[#58CC02]">{stats.mastered}</div>
            <div>EZBERLENDİ</div>
          </div>
        )}
      </div>

      {/* Mastery summary */}
      {stats && (
        <div className="card p-3 grid grid-cols-4 gap-2 text-center">
          {[
            { val: stats.new,       label: 'Yeni',     color: 'text-[#AFAFAF]' },
            { val: stats.learning,  label: 'Öğrenme',  color: 'text-amber-600' },
            { val: stats.reviewing, label: 'Tekrar',   color: 'text-[#1CB0F6]' },
            { val: stats.mastered,  label: 'Ezber',    color: 'text-[#58CC02]' },
          ].map(s => (
            <div key={s.label}>
              <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
              <div className="text-[10px] font-bold text-[#AFAFAF]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Mode buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { mode: 'quiz' as View,    icon: '❓', label: 'Mini Quiz',   sub: 'Anlam seç' },
          { mode: 'recall' as View,  icon: '🧠', label: 'Hatırla',     sub: 'Türkçe yaz' },
          { mode: 'produce' as View, icon: '✍️', label: 'Üret',        sub: 'İngilizce üret' },
        ].map(m => (
          <button
            key={m.mode}
            onClick={() => setView(m.mode)}
            className="card p-3 text-center space-y-0.5 border-b-4 border-[#E5E5E5] active:translate-y-[2px] active:border-b-[1px] transition-all"
          >
            <div className="text-xl">{m.icon}</div>
            <div className="text-xs font-black text-[#3C3C3C]">{m.label}</div>
            <div className="text-[10px] font-bold text-[#AFAFAF]">{m.sub}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AFAFAF]">🔍</span>
        <input
          type="search"
          placeholder="Kelime veya anlam ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-[#E5E5E5] bg-white text-sm font-semibold focus:outline-none focus:border-[#58CC02] transition-colors"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['ALL','VOCAB','LINKER','PREPOSITION','PHRASAL','GRAMMAR','SENTENCE_COMPLETION'] as Category[]).map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all ${
              filter === c ? 'bg-[#58CC02] text-white border-[#58CC02]' : 'bg-white text-[#AFAFAF] border-[#E5E5E5]'
            }`}
          >
            {c === 'ALL' ? `Tümü (${patterns.length})` : c === 'SENTENCE_COMPLETION' ? 'SC' : c}
          </button>
        ))}
      </div>

      {/* Pattern cards */}
      <div className="space-y-3">
        {filtered.map(p => {
          const c   = CAT_COLORS[p.category] ?? CAT_COLORS.VOCAB
          const wp  = store.progress[p.id]
          const exp = flipped.has(p.id)
          return (
            <div key={p.id} className={`card border-l-4 ${c.border} overflow-hidden`}>
              <button
                onClick={() => setFlipped(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n })}
                className="w-full text-left p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{p.category}</span>
                      {wp && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_BADGE[wp.status]}`}>
                          {wp.status === 'mastered' ? '⭐ Ezber' : wp.status === 'reviewing' ? '🔄 Tekrar' : wp.status === 'learning' ? '📚 Öğrenme' : '🆕 Yeni'}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-black text-[#3C3C3C] mt-1">{p.pattern_text}</p>
                    <p className="text-sm font-bold text-[#58CC02]">{p.meaning_tr}</p>
                  </div>
                  <span className={`text-[#AFAFAF] transition-transform ${exp ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {exp && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#F0F0F0] pt-3 animate-slide-up">
                  {/* Memory trick */}
                  <div className="bg-[#FFF9DB] rounded-xl p-3">
                    <p className="text-[10px] font-black text-amber-700 uppercase mb-1">💡 Bellek Hilesi</p>
                    <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{p.memory_trick}</p>
                  </div>

                  {/* Mini story */}
                  <div className="bg-[#F0F8FF] rounded-xl p-3">
                    <p className="text-[10px] font-black text-[#1CB0F6] uppercase mb-1">📖 Mini Hikaye</p>
                    <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed italic">{p.mini_story}</p>
                  </div>

                  {/* Collocations */}
                  {p.collocations.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-[#AFAFAF] uppercase mb-2">Sık Kullanımlar</p>
                      <div className="flex flex-wrap gap-2">
                        {p.collocations.map((col, i) => (
                          <span key={i} className="text-xs font-semibold bg-[#F8F8F8] text-[#3C3C3C] px-3 py-1 rounded-full border border-[#E5E5E5]">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold italic text-[#3C3C3C]/80 leading-relaxed">{p.example_en}</p>
                    <p className="text-xs font-semibold text-[#AFAFAF]">{p.example_tr}</p>
                  </div>

                  {/* Trap words */}
                  {p.trap_words.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-[10px] font-black text-[#FF4B4B] uppercase mb-1">⚠️ Tuzak Kelimeler</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {p.trap_words.map((t, i) => (
                          <span key={i} className="text-xs font-bold bg-red-100 text-[#FF4B4B] px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                      <p className="text-xs font-semibold text-[#3C3C3C]">{p.trap_explanation}</p>
                    </div>
                  )}

                  {/* Mastery indicator */}
                  {wp && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-[#AFAFAF]">
                        <span>Bellek Puanı</span>
                        <span>{wp.memoryScore}/100</span>
                      </div>
                      <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#58CC02] rounded-full" style={{ width: `${wp.memoryScore}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-14">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-[#AFAFAF] font-bold">Sonuç bulunamadı</p>
        </div>
      )}
    </div>
  )
}

// ── Quiz Mode ──────────────────────────────────────────────────────────────────
function QuizMode({ patterns, onDone }: { patterns: PatternItem[]; onDone: () => void }) {
  const queue   = [...patterns].sort(() => Math.random() - 0.5).slice(0, 10)
  const [idx, setIdx]          = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [conf, setConf]         = useState<'low'|'medium'|'high'|null>(null)
  const [score, setScore]       = useState(0)

  const p    = queue[idx]
  const quiz = generateMiniQuiz(p)
  const done = idx >= queue.length

  function pick(opt: string) {
    if (selected) return
    const correct = opt === quiz.correctAnswer
    setSelected(opt)
    if (correct) setScore(s => s + 1)
  }

  function submit(c: 'low'|'medium'|'high') {
    setConf(c)
    recordWordAnswer(p.id, selected === quiz.correctAnswer, c, 'quiz')
    setTimeout(() => {
      setSelected(null); setConf(null)
      if (idx >= queue.length - 1) { onDone() } else { setIdx(i => i + 1) }
    }, 1200)
  }

  if (done) return null

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onDone} className="text-[#AFAFAF] text-xl font-black">‹</button>
        <div className="flex-1">
          <p className="text-xs font-black text-[#AFAFAF]">Mini Quiz · Soru {idx+1}/{queue.length}</p>
          <div className="h-2 bg-[#F0F0F0] rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full" style={{ width: `${((idx+1)/queue.length)*100}%` }} />
          </div>
        </div>
        <span className="text-sm font-black text-[#58CC02]">{score} ✓</span>
      </div>

      <div className="card p-5 text-center space-y-2 border-b-4 border-[#1CB0F6]">
        <p className="text-xs font-black text-[#AFAFAF] uppercase">Bu kalıbın Türkçesi?</p>
        <p className="text-2xl font-black text-[#3C3C3C]">{p.pattern_text}</p>
      </div>

      <div className="space-y-2">
        {quiz.options.map((opt, i) => {
          let style = 'border-[#E5E5E5] bg-white text-[#3C3C3C]'
          if (selected) {
            if (opt === quiz.correctAnswer) style = 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302]'
            else if (opt === selected) style = 'border-[#FF4B4B] bg-red-50 text-[#FF4B4B]'
            else style = 'border-[#E5E5E5] bg-[#F8F8F8] text-[#AFAFAF]'
          }
          return (
            <button
              key={i}
              onClick={() => pick(opt)}
              className={`w-full text-left p-4 rounded-2xl border-2 border-b-4 font-semibold text-sm transition-all active:translate-y-[2px] active:border-b-[1px] ${style}`}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {selected && !conf && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <p className="text-xs font-black text-[#AFAFAF] uppercase">Ne kadar emindın?</p>
          <div className="grid grid-cols-3 gap-2">
            {[{c:'low' as const,icon:'😰',label:'Düşük'},{c:'medium' as const,icon:'🤔',label:'Orta'},{c:'high' as const,icon:'💪',label:'Yüksek'}].map(({c,icon,label}) => (
              <button key={c} onClick={() => submit(c)} className="flex flex-col items-center gap-1 p-3 rounded-2xl border-2 border-[#E5E5E5] border-b-4 active:translate-y-[2px] active:border-b-[1px] bg-white transition-all">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-black text-[#3C3C3C]">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Active Recall Mode ─────────────────────────────────────────────────────────
function RecallMode({ patterns, onDone }: { patterns: PatternItem[]; onDone: () => void }) {
  const queue = [...patterns].sort(() => Math.random() - 0.5).slice(0, 8)
  const [idx, setIdx]       = useState(0)
  const [revealed, setRev]  = useState(false)
  const [score, setScore]   = useState(0)

  const p = queue[idx]
  if (!p) return null

  function answer(correct: boolean, conf: 'low'|'medium'|'high') {
    recordWordAnswer(p.id, correct, conf, 'recall')
    if (correct) setScore(s => s + 1)
    setRev(false)
    if (idx >= queue.length - 1) onDone()
    else setIdx(i => i + 1)
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onDone} className="text-[#AFAFAF] text-xl font-black">‹</button>
        <div className="flex-1">
          <p className="text-xs font-black text-[#AFAFAF]">🧠 Aktif Hatırlama · {idx+1}/{queue.length}</p>
          <div className="h-2 bg-[#F0F0F0] rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#FFD900] rounded-full" style={{ width: `${((idx+1)/queue.length)*100}%` }} />
          </div>
        </div>
      </div>

      <div className="card p-8 text-center space-y-3 border-b-4 border-[#FFD900]">
        <p className="text-xs font-black text-[#AFAFAF] uppercase tracking-wide">Bu kalıbın Türkçesi ne?</p>
        <p className="text-3xl font-black text-[#3C3C3C]">{p.pattern_text}</p>
        {!revealed && (
          <p className="text-sm text-[#AFAFAF] font-semibold">Zihninde düşün, sonra göster →</p>
        )}
      </div>

      {!revealed ? (
        <button onClick={() => setRev(true)} className="btn-duo py-4">
          💭 CEVABI GÖSTER
        </button>
      ) : (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-5 space-y-3 border-b-4 border-[#58CC02]">
            <p className="text-sm font-black text-[#58CC02]">✅ Cevap:</p>
            <p className="text-xl font-black text-[#3C3C3C]">{p.meaning_tr}</p>
            <div className="bg-[#FFF9DB] rounded-xl p-3">
              <p className="text-xs font-bold text-amber-700">{p.memory_trick}</p>
            </div>
            <p className="text-sm italic text-[#AFAFAF]">{p.example_en}</p>
          </div>

          <p className="text-sm font-black text-center text-[#3C3C3C]">Bildin mi?</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {correct: false, conf: 'low' as const,    icon: '❌', label: 'Bilmedim',  bg: 'bg-red-50 border-[#FF4B4B]' },
              {correct: true,  conf: 'medium' as const, icon: '🤔', label: 'Zorlandım', bg: 'bg-amber-50 border-amber-400' },
              {correct: true,  conf: 'high' as const,   icon: '💪', label: 'Bildim!',   bg: 'bg-[#D7FFB8] border-[#58CC02]' },
            ].map(({correct,conf,icon,label,bg}) => (
              <button
                key={label}
                onClick={() => answer(correct, conf)}
                className={`p-4 rounded-2xl border-2 border-b-4 text-center ${bg} active:translate-y-[2px] active:border-b-[1px] transition-all`}
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-black text-[#3C3C3C]">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Produce Mode ──────────────────────────────────────────────────────────────
function ProduceMode({ patterns, onDone }: { patterns: PatternItem[]; onDone: () => void }) {
  const vocabPatterns = patterns.filter(p =>
    ['VOCAB','PHRASAL','LINKER','PREPOSITION'].includes(p.category)
  )
  const queue = [...vocabPatterns].sort(() => Math.random() - 0.5).slice(0, 8)
  const [idx, setIdx]      = useState(0)
  const [typed, setTyped]  = useState('')
  const [revealed, setRev] = useState(false)
  const [score, setScore]  = useState(0)

  const p = queue[idx]
  if (!p) return (
    <div className="text-center py-20 space-y-4">
      <div className="text-4xl">🎉</div>
      <p className="font-black text-xl text-[#3C3C3C]">Tamamlandı!</p>
      <p className="text-[#AFAFAF] font-bold">{score}/{queue.length} doğru</p>
      <button onClick={onDone} className="btn-duo py-3">GERI DÖN</button>
    </div>
  )

  // Turkish prompt → English production
  const hint = p.collocations[0]?.split(' ').slice(0,2).join(' ') ?? ''

  function submit() { setRev(true) }
  function next(correct: boolean, conf: 'low'|'medium'|'high') {
    recordWordAnswer(p.id, correct, conf, 'produce')
    if (correct) setScore(s => s + 1)
    setTyped(''); setRev(false)
    setIdx(i => i + 1)
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3 pt-1">
        <button onClick={onDone} className="text-[#AFAFAF] text-xl font-black">‹</button>
        <div className="flex-1">
          <p className="text-xs font-black text-[#AFAFAF]">✍️ Üretim Modu · {idx+1}/{queue.length}</p>
          <div className="h-2 bg-[#F0F0F0] rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-violet-400 rounded-full" style={{ width: `${((idx+1)/queue.length)*100}%` }} />
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-3 border-b-4 border-violet-400">
        <p className="text-xs font-black text-[#AFAFAF] uppercase">Türkçeden İngilizceye üret</p>
        <p className="text-xl font-black text-[#3C3C3C]">{p.meaning_tr}</p>
        {p.mini_story && (
          <p className="text-sm italic text-[#AFAFAF]">{p.mini_story}</p>
        )}
      </div>

      {!revealed ? (
        <div className="space-y-3">
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="İngilizce kalıbı yaz..."
            className="w-full border-2 border-[#E5E5E5] rounded-2xl px-4 py-4 text-base font-semibold focus:outline-none focus:border-[#58CC02] transition-colors"
            autoFocus
          />
          <button onClick={submit} className="btn-duo py-3">
            CEVABI GÖSTER
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-slide-up">
          <div className="card p-4 space-y-2">
            <p className="text-xs font-black text-[#AFAFAF]">SENİN CEVABUN</p>
            <p className="text-base font-bold text-[#3C3C3C]">{typed || '(boş bırakıldı)'}</p>
          </div>
          <div className="card p-4 space-y-2 border-l-4 border-[#58CC02]">
            <p className="text-xs font-black text-[#58CC02]">DOĞRU CEVAP</p>
            <p className="text-xl font-black text-[#3C3C3C]">{p.pattern_text}</p>
            <p className="text-sm text-[#AFAFAF] italic">{p.example_en}</p>
          </div>
          <div className="bg-[#FFF9DB] rounded-xl p-3">
            <p className="text-xs font-bold text-amber-700">{p.memory_trick}</p>
          </div>
          <p className="text-sm font-black text-center text-[#3C3C3C]">Doğru yazdın mı?</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {correct:false,conf:'low' as const,    icon:'❌',label:'Hayır',   bg:'bg-red-50 border-[#FF4B4B]'},
              {correct:true, conf:'medium' as const, icon:'🤔',label:'Yakın',   bg:'bg-amber-50 border-amber-400'},
              {correct:true, conf:'high' as const,   icon:'💪',label:'Evet!',   bg:'bg-[#D7FFB8] border-[#58CC02]'},
            ].map(({correct,conf,icon,label,bg}) => (
              <button key={label} onClick={() => next(correct,conf)}
                className={`p-4 rounded-2xl border-2 border-b-4 text-center ${bg} active:translate-y-[2px] active:border-b-[1px] transition-all`}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-black text-[#3C3C3C]">{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
