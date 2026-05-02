'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { parseRawQuestions, buildFullClaudePrompt, type RawQuestion } from '@/lib/bootcamp-prompt'

// ── Types ─────────────────────────────────────────────────────────────────────

type GenStatus = 'idle' | 'parsing' | 'generating' | 'done' | 'error'

// ── Format hint ───────────────────────────────────────────────────────────────

const FORMAT_EXAMPLES = `1. ____ that the major cancer killer is influenced by diet.
A) The latest statistical evidence
B) However obvious it may seem
C) There is much evidence to suggest
D) As smokers love to point out
E) The consumption of fruit
Correct: C

2. Some comets have such long orbits ____.
A) while some asteroids may be burnt-up comets
B) in case they come from outside the Solar System
C) since they are often visible from Earth
D) that they pass near Earth only once every million years
E) just as their dust tails stretch far across the sky
Correct: D`

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BootcampGeneratorPage() {
  const [rawInput, setRawInput]       = useState('')
  const [testName, setTestName]       = useState('test2')
  const [startNum, setStartNum]       = useState(1)
  const [batchSize, setBatchSize]     = useState(3)
  const [parsed, setParsed]           = useState<RawQuestion[]>([])
  const [status, setStatus]           = useState<GenStatus>('idle')
  const [result, setResult]           = useState<object[] | null>(null)
  const [errors, setErrors]           = useState<string[]>([])
  const [copied, setCopied]           = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const [goldJson, setGoldJson]       = useState('')
  const [showFormat, setShowFormat]   = useState(false)
  const [activeTab, setActiveTab]     = useState<'app' | 'claude'>('app')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load gold standard JSON for the Claude prompt
  useEffect(() => {
    fetch('/bootcamp_test1.json').then(r => r.text()).then(setGoldJson)
  }, [])

  // Auto-parse as user types
  useEffect(() => {
    if (!rawInput.trim()) { setParsed([]); return }
    const qs = parseRawQuestions(rawInput)
    setParsed(qs)
  }, [rawInput])

  // ── Copy output JSON ────────────────────────────────────────────────────────

  const copyOutput = () => {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Download JSON ───────────────────────────────────────────────────────────

  const downloadOutput = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify({ metadata: { title: `Sentence Completion ${testName.toUpperCase()} - Guided Solve JSON`, total_questions: result.length, source: testName }, questions: result }, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `sentence_completion_${testName}_guided.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Copy Claude prompt ──────────────────────────────────────────────────────

  const copyClaudePrompt = async () => {
    const prompt = await buildFullClaudePrompt(rawInput, goldJson)
    navigator.clipboard.writeText(prompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 3000)
  }

  // ── Generate via App AI ─────────────────────────────────────────────────────

  const generate = async () => {
    if (!parsed.length) return
    setStatus('generating')
    setResult(null)
    setErrors([])

    try {
      const res = await fetch('/api/bootcamp-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText:    rawInput,
          testName:   testName,
          startNumber: startNum,
          batchSize:  batchSize,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setErrors([data.error ?? 'Unknown error'])
        setStatus('error')
        return
      }

      setResult(data.questions)
      setErrors(data.errors ?? [])
      setStatus('done')
    } catch (e: any) {
      setErrors([e?.message ?? 'Network error'])
      setStatus('error')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isGenerating = status === 'generating'
  const isDone       = status === 'done'
  const isError      = status === 'error'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/bootcamp" className="text-[#AFAFAF] font-black text-sm">← Bootcamp</Link>
        <div>
          <h1 className="text-lg font-black text-[#3C3C3C]">🛠️ JSON Generator</h1>
          <p className="text-[10px] font-semibold text-[#AFAFAF]">Yeni soruları bootcamp formatına çevir</p>
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('app')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'app'
              ? 'bg-[#58CC02] text-white shadow-[0_2px_0_#46A302]'
              : 'bg-[#F0F0F0] text-[#AFAFAF]'
          }`}
        >
          ⚡ Uygulama ile Üret
        </button>
        <button
          onClick={() => setActiveTab('claude')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'claude'
              ? 'bg-[#1CB0F6] text-white shadow-[0_2px_0_#0099dd]'
              : 'bg-[#F0F0F0] text-[#AFAFAF]'
          }`}
        >
          🤖 Claude ile Üret
        </button>
      </div>

      {/* ── Mode descriptions ── */}
      {activeTab === 'app' && (
        <div className="bg-[#F0FFF0] rounded-xl p-3 border border-[#D7FFB8]">
          <p className="text-xs font-black text-[#46A302]">⚡ Uygulama Modu</p>
          <p className="text-[10px] font-semibold text-[#3C3C3C] mt-1 leading-relaxed">
            Soruları yapıştır → "Üret" → JSON hazır. 3 soruluk batchler halinde çalışır.
            Daha az detaylı ama hızlı.
          </p>
        </div>
      )}
      {activeTab === 'claude' && (
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
          <p className="text-xs font-black text-blue-600">🤖 Claude Modu (Önerilen)</p>
          <p className="text-[10px] font-semibold text-[#3C3C3C] mt-1 leading-relaxed">
            Tüm 25 altın standart soru dahil edilir → maksimum kalite.
            "Prompt Kopyala" → claude.ai'ya yapıştır → JSON al.
          </p>
        </div>
      )}

      {/* ── Config row ── */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#3C3C3C]">⚙️ Ayarlar</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#AFAFAF] uppercase">Test Adı</label>
            <input
              value={testName}
              onChange={e => setTestName(e.target.value.replace(/\s/g, '_'))}
              placeholder="test2"
              className="w-full text-sm font-semibold border-2 border-[#E5E5E5] rounded-xl px-2 py-1.5 focus:border-[#58CC02] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#AFAFAF] uppercase">İlk Soru #</label>
            <input
              type="number"
              value={startNum}
              onChange={e => setStartNum(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full text-sm font-semibold border-2 border-[#E5E5E5] rounded-xl px-2 py-1.5 focus:border-[#58CC02] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-[#AFAFAF] uppercase">Batch Boyutu</label>
            <select
              value={batchSize}
              onChange={e => setBatchSize(parseInt(e.target.value))}
              className="w-full text-sm font-semibold border-2 border-[#E5E5E5] rounded-xl px-2 py-1.5 focus:border-[#58CC02] outline-none bg-white"
            >
              <option value={1}>1 soru</option>
              <option value={2}>2 soru</option>
              <option value={3}>3 soru</option>
              <option value={5}>5 soru</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Input area ── */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-[#3C3C3C]">📋 Soruları Yapıştır</p>
          <button
            onClick={() => setShowFormat(f => !f)}
            className="text-[10px] font-black text-[#1CB0F6] underline"
          >
            {showFormat ? 'Format gizle' : 'Format nasıl olmalı?'}
          </button>
        </div>

        {showFormat && (
          <div className="bg-[#F8F8F8] rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-black text-[#AFAFAF] uppercase">Örnek Format</p>
            <pre className="text-[10px] font-mono text-[#3C3C3C] leading-relaxed whitespace-pre-wrap overflow-x-auto">
              {FORMAT_EXAMPLES}
            </pre>
            <p className="text-[10px] font-semibold text-[#AFAFAF]">
              "Correct: X" satırı isteğe bağlıdır. A) veya A. veya A: formatları hepsi çalışır.
            </p>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder={`PDF'den kopyalayıp yapıştır:\n\n1. Water softeners are particularly useful, ____.\nA) if you live in a hard-water area\nB) that they remove chemicals\n...\nCorrect: A`}
          className="w-full h-52 text-sm font-semibold border-2 border-[#E5E5E5] rounded-xl p-3 focus:border-[#58CC02] outline-none resize-none font-mono text-[#3C3C3C] placeholder:text-[#AFAFAF] placeholder:font-sans"
          disabled={isGenerating}
        />

        {/* Parse preview */}
        {rawInput.trim().length > 0 && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${
            parsed.length > 0 ? 'bg-[#D7FFB8] text-[#46A302]' : 'bg-amber-50 text-amber-700'
          }`}>
            {parsed.length > 0 ? (
              <>
                <span className="font-black">✅ {parsed.length} soru algılandı</span>
                <span className="opacity-70">
                  · {parsed.filter(q => q.correct).length} cevap tanındı
                  · ~{Math.ceil(parsed.length / batchSize)} batch
                </span>
              </>
            ) : (
              <>
                <span>⚠️ Soru algılanamadı.</span>
                <button onClick={() => setShowFormat(true)} className="underline">Format kontrol et.</button>
              </>
            )}
          </div>
        )}

        {/* Parsed question preview */}
        {parsed.length > 0 && (
          <details className="text-[10px]">
            <summary className="font-black text-[#AFAFAF] cursor-pointer select-none">
              Algılanan sorular ({parsed.length}) →
            </summary>
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {parsed.map((q, i) => (
                <div key={i} className="flex gap-2 items-start bg-[#F8F8F8] rounded-lg px-2 py-1.5">
                  <span className="font-black text-[#AFAFAF] flex-shrink-0">#{q.number}</span>
                  <span className="font-semibold text-[#3C3C3C] line-clamp-1">{q.text.slice(0, 70)}…</span>
                  {q.correct && <span className="font-black text-[#58CC02] flex-shrink-0">→{q.correct}</span>}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="space-y-2">
        {activeTab === 'app' && (
          <button
            onClick={generate}
            disabled={parsed.length === 0 || isGenerating}
            className={`btn-duo w-full py-3.5 text-sm font-black ${
              parsed.length === 0 ? 'opacity-40' : ''
            }`}
          >
            {isGenerating
              ? '⏳ Üretiliyor… (bu biraz sürebilir)'
              : `⚡ ${parsed.length} Soruyu JSON'a Çevir`
            }
          </button>
        )}

        {activeTab === 'claude' && (
          <button
            onClick={copyClaudePrompt}
            disabled={!rawInput.trim() || !goldJson}
            className={`w-full py-3.5 text-sm font-black rounded-xl border-b-4 transition-all active:translate-y-[2px] active:border-b-[1px] ${
              promptCopied
                ? 'bg-[#D7FFB8] border-[#46A302] text-[#46A302]'
                : !rawInput.trim() || !goldJson
                  ? 'bg-[#F0F0F0] border-[#E5E5E5] text-[#AFAFAF]'
                  : 'bg-[#1CB0F6] border-[#0099dd] text-white'
            }`}
          >
            {promptCopied
              ? '✅ Kopyalandı! claude.ai\'ya yapıştır'
              : !goldJson
                ? '⏳ Gold standard yükleniyor…'
                : '📋 Tam Prompt\'u Kopyala (25 örnek dahil)'
            }
          </button>
        )}

        {activeTab === 'claude' && rawInput.trim() && (
          <div className="bg-[#F8F8F8] rounded-xl p-3 space-y-1">
            <p className="text-xs font-black text-[#3C3C3C]">Sonraki adımlar:</p>
            <ol className="text-[10px] font-semibold text-[#AFAFAF] space-y-0.5 list-decimal list-inside">
              <li>Yukarıdaki butona tıkla → prompt panoya kopyalanır</li>
              <li>claude.ai'yı aç → yeni sohbet başlat</li>
              <li>Promptu yapıştır → Enter</li>
              <li>JSON çıktısını al → aşağıdaki alana yapıştır</li>
            </ol>
          </div>
        )}
      </div>

      {/* ── Manual paste area (for Claude output) ── */}
      {activeTab === 'claude' && (
        <ClaudeOutputPaster onResult={setResult} />
      )}

      {/* ── Generating indicator ── */}
      {isGenerating && (
        <div className="card p-5 text-center space-y-3">
          <div className="text-3xl animate-spin">⚙️</div>
          <p className="text-sm font-black text-[#3C3C3C]">Üretiliyor…</p>
          <p className="text-xs font-semibold text-[#AFAFAF]">
            Her {batchSize} soru için ~20-40 saniye bekleyin
          </p>
          <div className="flex justify-center gap-1">
            {Array.from({ length: Math.ceil(parsed.length / batchSize) }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#58CC02] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Errors ── */}
      {errors.length > 0 && (
        <div className="card p-4 space-y-2 border-[#FF4B4B] bg-red-50">
          <p className="text-xs font-black text-[#FF4B4B]">⚠️ Uyarılar ({errors.length})</p>
          {errors.map((e, i) => (
            <p key={i} className="text-[10px] font-semibold text-[#FF4B4B]">{e}</p>
          ))}
        </div>
      )}

      {/* ── Result ── */}
      {result && result.length > 0 && (
        <ResultPanel
          result={result}
          testName={testName}
          copied={copied}
          onCopy={copyOutput}
          onDownload={downloadOutput}
        />
      )}

    </div>
  )
}

// ── ClaudeOutputPaster ────────────────────────────────────────────────────────

function ClaudeOutputPaster({ onResult }: { onResult: (r: object[]) => void }) {
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState('')

  const tryParse = () => {
    setParseError('')
    const cleaned = pasteText
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```$/m, '')
      .trim()
    try {
      const match = cleaned.match(/\[[\s\S]*\]/)
      const arr = JSON.parse(match ? match[0] : cleaned)
      if (!Array.isArray(arr)) throw new Error('Not an array')
      onResult(arr)
      setPasteText('')
    } catch (e: any) {
      setParseError(`JSON parse hatası: ${e.message}`)
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs font-black text-[#3C3C3C]">📥 Claude Çıktısını Yapıştır</p>
      <p className="text-[10px] font-semibold text-[#AFAFAF]">Claude'dan aldığın JSON'ı buraya yapıştır</p>
      <textarea
        value={pasteText}
        onChange={e => setPasteText(e.target.value)}
        placeholder={'[\n  {\n    "id": "sentence_completion_test2_q01",\n    ...\n  }\n]'}
        className="w-full h-32 text-xs font-mono border-2 border-[#E5E5E5] rounded-xl p-3 focus:border-[#1CB0F6] outline-none resize-none text-[#3C3C3C]"
      />
      {parseError && <p className="text-[10px] font-semibold text-[#FF4B4B]">{parseError}</p>}
      <button
        onClick={tryParse}
        disabled={!pasteText.trim()}
        className="btn-duo w-full py-2.5 text-sm font-black disabled:opacity-40"
      >
        ✅ JSON'ı Doğrula ve Kaydet
      </button>
    </div>
  )
}

// ── ResultPanel ───────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  testName,
  copied,
  onCopy,
  onDownload,
}: {
  result: object[]
  testName: string
  copied: boolean
  onCopy: () => void
  onDownload: () => void
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [testMode, setTestMode]       = useState(false)

  const loadInBootcamp = () => {
    try {
      localStorage.setItem('yds_bootcamp_custom', JSON.stringify(result))
      setTestMode(true)
    } catch {}
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="card p-4 bg-[#D7FFB8] border-[#58CC02] border space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-black text-[#3C3C3C]">{result.length} soru üretildi!</p>
            <p className="text-xs font-semibold text-[#46A302]">
              {testName.toUpperCase()} · Bootcamp formatında hazır
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCopy}
          className={`py-3 rounded-xl border-2 text-sm font-black transition-all ${
            copied
              ? 'border-[#58CC02] bg-[#D7FFB8] text-[#46A302]'
              : 'border-[#E5E5E5] bg-white text-[#3C3C3C] hover:border-[#58CC02]'
          }`}
        >
          {copied ? '✅ Kopyalandı' : '📋 JSON Kopyala'}
        </button>
        <button
          onClick={onDownload}
          className="btn-duo py-3 text-sm font-black"
        >
          ⬇️ İndir (.json)
        </button>
      </div>

      {/* Test in bootcamp */}
      <button
        onClick={loadInBootcamp}
        className="w-full py-2.5 rounded-xl border-2 border-[#1CB0F6] text-sm font-black text-[#1CB0F6] hover:bg-blue-50 transition-all"
      >
        🎯 Bootcamp'ta Test Et
      </button>

      {testMode && (
        <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-blue-700">
            Sorular localStorage'a kaydedildi!
          </p>
          <Link href="/bootcamp?custom=1" className="text-xs font-black text-[#1CB0F6] underline">
            Bootcamp'a Git →
          </Link>
        </div>
      )}

      {/* JSON preview */}
      <button
        onClick={() => setPreviewOpen(o => !o)}
        className="w-full py-2 text-xs font-black text-[#AFAFAF] border border-[#F0F0F0] rounded-xl hover:bg-[#F8F8F8]"
      >
        {previewOpen ? '▲ JSON Önizlemeyi Gizle' : '▼ JSON Önizle'}
      </button>

      {previewOpen && (
        <div className="card p-3 overflow-auto max-h-96 bg-[#1E1E1E] rounded-xl">
          <pre className="text-[10px] font-mono text-[#9CDCFE] leading-relaxed whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {/* Per-question summary */}
      <div className="card p-4 space-y-2">
        <p className="text-xs font-black text-[#3C3C3C]">Üretilen Sorular</p>
        <div className="space-y-1.5">
          {result.map((q: any, i) => (
            <div key={i} className="flex items-start gap-2 bg-[#F8F8F8] rounded-xl p-2.5">
              <span className="w-6 h-6 rounded-full bg-[#58CC02] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#3C3C3C] line-clamp-1">
                  {q.question_text?.slice(0, 70)}…
                </p>
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                    {q.logic_type ?? '?'}
                  </span>
                  <span className="text-[9px] font-black bg-green-100 text-[#46A302] px-1.5 py-0.5 rounded-full">
                    ✓ {q.correct_answer}
                  </span>
                  {q.guided_solve?.clue_highlights?.length > 0 && (
                    <span className="text-[9px] font-black bg-[#FFF9DB] text-amber-700 px-1.5 py-0.5 rounded-full">
                      {q.guided_solve.clue_highlights.length} ipucu
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
