'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClueHighlight {
  text: string
  color: 'blue' | 'green' | 'orange' | 'red'
  why_tr: string
}

interface BootcampQuestion {
  id: string
  question_number: number
  question_text: string
  options: Record<string, string>
  correct_answer: string
  logic_type: string
  expected_direction: string
  difficulty: number
  guided_solve: {
    clue_highlights: ClueHighlight[]
    decision_rule_tr: string
    short_explanation_tr: string
    memory_trick_tr: string
    mini_lesson_tr: string
    option_analysis: Record<string, string>
  }
}

interface BootcampData {
  metadata: { title: string; total_questions: number }
  questions: BootcampQuestion[]
}

// ── Logic options ─────────────────────────────────────────────────────────────

type LogicKey =
  | 'noun_clause' | 'result_structure' | 'condition' | 'relative_clause'
  | 'contrast' | 'cause_result' | 'continuation' | 'time_sequence'
  | 'indirect_question' | 'not_sure'

const LOGIC_OPTIONS: { key: LogicKey; label: string; icon: string; desc: string }[] = [
  { key: 'continuation',      label: 'Devam',          icon: '➡️', desc: 'Aynı yönde ek bilgi' },
  { key: 'contrast',          label: 'Zıtlık',         icon: '↔️', desc: 'however / although / though' },
  { key: 'cause_result',      label: 'Sebep-Sonuç',    icon: '🔗', desc: 'because / since / therefore' },
  { key: 'condition',         label: 'Şart',           icon: '⚙️', desc: 'if / unless / provided' },
  { key: 'relative_clause',   label: 'Relative',       icon: '🔍', desc: 'who / which / that (tanım)' },
  { key: 'result_structure',  label: 'such…that',      icon: '📐', desc: 'so/such…that → sonuç' },
  { key: 'noun_clause',       label: 'İsim Cümlesi',   icon: '📝', desc: 'that + tam cümle' },
  { key: 'time_sequence',     label: 'Zaman',          icon: '⏱️', desc: 'when / after / before' },
  { key: 'indirect_question', label: 'Dolaylı Soru',   icon: '❓', desc: 'asked / wondered + wh-' },
  { key: 'not_sure',          label: 'Emin Değilim',   icon: '🤔', desc: '' },
]

const LOGIC_NORMALIZE: Record<string, LogicKey> = {
  noun_clause_completion: 'noun_clause',
  result_structure:       'result_structure',
  condition:              'condition',
  relative_clause:        'relative_clause',
  contrast:               'contrast',
  contrast_surprise:      'contrast',
  cause_result:           'cause_result',
  continuation:           'continuation',
  time_sequence:          'time_sequence',
  indirect_question:      'indirect_question',
}

// ── Direction options ─────────────────────────────────────────────────────────

type DirectionKey = 'same' | 'opposite' | 'reason' | 'result' | 'description' | 'condition'

const DIRECTION_OPTIONS: { key: DirectionKey; label: string; icon: string; hint: string }[] = [
  { key: 'same',        label: 'Aynı Yön',    icon: '➡️', hint: 'Öncekiyle aynı fikir devam ediyor' },
  { key: 'opposite',    label: 'Zıt Yön',     icon: '↩️', hint: 'Beklenmedik, karşı fikir' },
  { key: 'reason',      label: 'Sebep',       icon: '🔍', hint: 'Neden böyle?' },
  { key: 'result',      label: 'Sonuç',       icon: '🎯', hint: 'Bu yüzden ne oldu?' },
  { key: 'description', label: 'Tanım',       icon: '📝', hint: 'Kişi/şey açıklaması' },
  { key: 'condition',   label: 'Şart',        icon: '⚙️', hint: 'Hangi durumda?' },
]

function normalizeDirection(logic_type: string, expected_direction: string): DirectionKey {
  const d = (expected_direction ?? '').toLowerCase()
  const l = (logic_type ?? '').toLowerCase()
  if (l.includes('condition') || d.includes('condition') || d.includes('if ')) return 'condition'
  if (l.includes('contrast') || d.includes('contrast') || d.includes('opposite') || d.includes('surprise')) return 'opposite'
  if (l === 'relative_clause' || d.includes('who') || d.includes('someone') || d.includes('descri')) return 'description'
  if (l === 'noun_clause_completion' || l === 'noun_clause' || d.includes('that clause') || d.includes('statement')) return 'description'
  if (l === 'result_structure' || d.includes('result') || d.includes('that result')) return 'result'
  if (l === 'cause_result' || d.includes('cause') || d.includes('reason')) return 'reason'
  if (l === 'indirect_question' || d.includes('indirect')) return 'description'
  return 'same'
}

// ── Clue highlighter ──────────────────────────────────────────────────────────

type Segment = { text: string; clue?: ClueHighlight }

function buildSegments(rawText: string, clues: ClueHighlight[]): Segment[] {
  const sorted = [...clues].sort((a, b) => {
    const ia = rawText.indexOf(a.text)
    const ib = rawText.indexOf(b.text)
    return (ia < 0 ? 99999 : ia) - (ib < 0 ? 99999 : ib)
  })
  let segs: Segment[] = [{ text: rawText }]
  for (const clue of sorted) {
    const next: Segment[] = []
    for (const seg of segs) {
      if (seg.clue) { next.push(seg); continue }
      const idx = seg.text.indexOf(clue.text)
      if (idx < 0) { next.push(seg); continue }
      if (idx > 0) next.push({ text: seg.text.slice(0, idx) })
      next.push({ text: clue.text, clue })
      const after = seg.text.slice(idx + clue.text.length)
      if (after) next.push({ text: after })
    }
    segs = next
  }
  return segs
}

// Replace ____ with visual blank
function renderBlank(text: string): string {
  return text.replace(/_{4,}/g, '▢▢▢▢')
}

// ── Phase flow ────────────────────────────────────────────────────────────────

type Phase = 'sentence' | 'clues' | 'logic' | 'direction' | 'options' | 'feedback' | 'end'
type Level = 1 | 2 | 3 | 4

function nextPhaseFor(phase: Phase, level: Level): Phase {
  if (phase === 'sentence')   return level === 3 ? 'clues' : 'logic'
  if (phase === 'clues')      return 'logic'
  if (phase === 'logic')      return level >= 2 ? 'direction' : 'options'
  if (phase === 'direction')  return 'options'
  return 'feedback'
}

const CLUE_STYLE: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700 border-b-2 border-blue-500 cursor-pointer',
  green:  'bg-[#D7FFB8] text-[#3A7C00] border-b-2 border-[#58CC02] cursor-pointer',
  orange: 'bg-orange-100 text-orange-700 border-b-2 border-orange-500 cursor-pointer',
  red:    'bg-red-100 text-[#FF4B4B] border-b-2 border-red-500 cursor-pointer',
}

const CLUE_BADGE: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-[#D7FFB8] text-[#3A7C00]',
  orange: 'bg-orange-100 text-orange-700',
  red:    'bg-red-100 text-[#FF4B4B]',
}

const CLUE_LABEL: Record<string, string> = {
  blue:   '🔵 Gramer yapısı',
  green:  '🟢 Anlam ipucu',
  orange: '🟠 Mantık bağlacı',
  red:    '🔴 Tuzak / Dikkat',
}

const LEVEL_INFO: Record<Level, { label: string; desc: string; phases: string }> = {
  1: { label: 'Başlangıç', desc: 'Sadece mantık tipi — sonra şıklar', phases: 'Cümle → Mantık → Şıklar' },
  2: { label: 'Orta',      desc: 'Mantık + yön tahmini',               phases: 'Cümle → Mantık → Yön → Şıklar' },
  3: { label: 'İleri',     desc: 'Tam rehberli çözüm (önerilen)',       phases: 'Cümle → İpuçları → Mantık → Yön → Şıklar' },
  4: { label: 'YDS Modu',  desc: 'Renksiz ipuçları, tam zorlu',         phases: 'Cümle → Mantık → Yön → Şıklar (renksiz)' },
}

// ── Score interface ───────────────────────────────────────────────────────────

interface SessionScore {
  correct: number
  wrong: number
  total: number
  logicCorrect: number
  logicTotal: number
  directionCorrect: number
  directionTotal: number
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BootcampPage() {
  const [data, setData]               = useState<BootcampData | null>(null)
  const [qIdx, setQIdx]               = useState(0)
  const [phase, setPhase]             = useState<Phase>('sentence')
  const [level, setLevel]             = useState<Level>(3)
  const [logicGuess, setLogicGuess]   = useState<LogicKey | null>(null)
  const [logicLocked, setLogicLocked] = useState(false)
  const [dirGuess, setDirGuess]       = useState<DirectionKey | null>(null)
  const [dirLocked, setDirLocked]     = useState(false)
  const [userAnswer, setUserAnswer]   = useState<string | null>(null)
  const [activeClue, setActiveClue]   = useState<string | null>(null)
  const [reviewIds, setReviewIds]     = useState<Set<string>>(new Set())
  const [showLevelModal, setShowLevelModal] = useState(false)
  const [score, setScore]             = useState<SessionScore>({
    correct: 0, wrong: 0, total: 0,
    logicCorrect: 0, logicTotal: 0,
    directionCorrect: 0, directionTotal: 0,
  })

  useEffect(() => {
    // Support custom questions generated by /bootcamp/generate
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.get('custom') === '1') {
        const customRaw = localStorage.getItem('yds_bootcamp_custom')
        if (customRaw) {
          const questions: BootcampQuestion[] = JSON.parse(customRaw)
          if (questions.length > 0) {
            setData({ metadata: { title: 'Custom Questions', total_questions: questions.length }, questions })
            localStorage.removeItem('yds_bootcamp_custom')
            return
          }
        }
      }
    } catch {}
    fetch('/bootcamp_test1.json').then(r => r.json()).then(setData)
    try {
      const saved = localStorage.getItem('yds_bootcamp_review')
      if (saved) setReviewIds(new Set(JSON.parse(saved)))
    } catch {}
  }, [])

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-4xl animate-bounce">🧩</div>
        <p className="font-bold text-[#AFAFAF]">Bootcamp yükleniyor…</p>
      </div>
    )
  }

  const questions = data.questions
  const q = questions[qIdx]
  if (!q) return null

  const correctLogic = LOGIC_NORMALIZE[q.logic_type] ?? ('not_sure' as LogicKey)
  const correctDir   = normalizeDirection(q.logic_type, q.expected_direction)
  const progress     = Math.round((qIdx / questions.length) * 100)
  const inReview     = reviewIds.has(q.id)

  // ── Handlers ─────────────────────────────────────────────────────────────

  const advance = () => setPhase(p => nextPhaseFor(p, level))

  const pickLogic = (key: LogicKey) => {
    if (logicLocked) return
    const isRight = key === correctLogic
    setLogicGuess(key)
    setLogicLocked(true)
    setScore(prev => ({
      ...prev,
      logicCorrect: prev.logicCorrect + (isRight ? 1 : 0),
      logicTotal: prev.logicTotal + 1,
    }))
    setTimeout(() => { setLogicLocked(false); advance() }, isRight ? 500 : 1400)
  }

  const pickDirection = (key: DirectionKey) => {
    if (dirLocked) return
    const isRight = key === correctDir
    setDirGuess(key)
    setDirLocked(true)
    setScore(prev => ({
      ...prev,
      directionCorrect: prev.directionCorrect + (isRight ? 1 : 0),
      directionTotal: prev.directionTotal + 1,
    }))
    setTimeout(() => { setDirLocked(false); advance() }, isRight ? 500 : 1200)
  }

  const pickAnswer = (opt: string) => {
    if (userAnswer) return
    const isRight = opt === q.correct_answer
    setUserAnswer(opt)
    setScore(prev => ({
      ...prev,
      correct:  prev.correct  + (isRight ? 1 : 0),
      wrong:    prev.wrong    + (isRight ? 0 : 1),
      total:    prev.total    + 1,
    }))
    setPhase('feedback')
  }

  const goNext = () => {
    if (qIdx + 1 >= questions.length) { setPhase('end'); return }
    setQIdx(i => i + 1)
    setPhase('sentence')
    setLogicGuess(null); setLogicLocked(false)
    setDirGuess(null);   setDirLocked(false)
    setUserAnswer(null)
    setActiveClue(null)
  }

  const toggleReview = () => {
    const next = new Set(reviewIds)
    if (next.has(q.id)) next.delete(q.id)
    else next.add(q.id)
    setReviewIds(next)
    localStorage.setItem('yds_bootcamp_review', JSON.stringify([...next]))
  }

  // ── End screen ────────────────────────────────────────────────────────────

  if (phase === 'end') {
    const acc = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="card p-6 text-center space-y-3">
          <div className="text-5xl">{acc >= 80 ? '🏆' : acc >= 60 ? '🦅' : '🐣'}</div>
          <h1 className="text-xl font-black text-[#3C3C3C]">Bootcamp Bitti!</h1>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-xl py-3">
              <div className="text-xl font-black text-[#58CC02]">{score.correct}</div>
              <div className="text-[10px] font-bold text-[#AFAFAF]">DOĞRU</div>
            </div>
            <div className="bg-red-50 rounded-xl py-3">
              <div className="text-xl font-black text-[#FF4B4B]">{score.wrong}</div>
              <div className="text-[10px] font-bold text-[#AFAFAF]">YANLIŞ</div>
            </div>
            <div className="bg-[#F8F8F8] rounded-xl py-3">
              <div className="text-xl font-black text-[#3C3C3C]">{acc}%</div>
              <div className="text-[10px] font-bold text-[#AFAFAF]">DOĞRULUK</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50 rounded-xl py-2 px-3">
              <span className="font-black text-blue-600">Mantık: </span>
              <span className="font-semibold text-[#3C3C3C]">{score.logicCorrect}/{score.logicTotal}</span>
            </div>
            <div className="bg-purple-50 rounded-xl py-2 px-3">
              <span className="font-black text-purple-600">Yön: </span>
              <span className="font-semibold text-[#3C3C3C]">{score.directionCorrect}/{score.directionTotal}</span>
            </div>
          </div>
          <button
            onClick={() => {
                setQIdx(0); setPhase('sentence')
                setLogicGuess(null); setLogicLocked(false)
                setDirGuess(null); setDirLocked(false)
                setUserAnswer(null); setActiveClue(null)
                setScore({ correct:0, wrong:0, total:0, logicCorrect:0, logicTotal:0, directionCorrect:0, directionTotal:0 })
              }}
            className="btn-duo w-full py-3 font-black"
          >
            🔄 Baştan Başla
          </button>
          <Link href="/lab" className="block text-sm font-bold text-[#AFAFAF] underline">← Lab'a Dön</Link>
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  const showColors = level < 4

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-8">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-2">
        <Link href="/lab" className="text-[#AFAFAF] text-sm font-black flex-shrink-0">←</Link>
        <Link href="/bootcamp/generate" className="flex-shrink-0 text-[9px] font-black bg-[#FFF9DB] text-amber-700 border border-amber-200 px-2 py-1 rounded-lg hover:bg-amber-100">
          🛠️ JSON Üret
        </Link>
        <div className="flex-1">
          <div className="flex justify-between text-[10px] font-bold text-[#AFAFAF] mb-1">
            <span>Soru {qIdx + 1} / {questions.length}</span>
            <span>%{progress}</span>
          </div>
          <div className="h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden">
            <div className="h-full bg-[#58CC02] rounded-full transition-all duration-500" style={{ width: `${Math.max(2, progress)}%` }} />
          </div>
        </div>
        <button
          onClick={() => setShowLevelModal(true)}
          className="flex-shrink-0 text-[10px] font-black bg-[#F0F0F0] hover:bg-[#E8E8E8] text-[#3C3C3C] px-2.5 py-1.5 rounded-lg"
        >
          L{level} ▾
        </button>
      </div>

      {/* ── Session score ── */}
      <div className="flex gap-2 text-[10px] font-black">
        <span className="bg-green-100 text-[#46A302] px-2 py-1 rounded-full">✅ {score.correct}</span>
        <span className="bg-red-100 text-[#FF4B4B] px-2 py-1 rounded-full">❌ {score.wrong}</span>
        {score.logicTotal > 0 && <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full">🧠 {score.logicCorrect}/{score.logicTotal}</span>}
        {score.directionTotal > 0 && <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full">🎯 {score.directionCorrect}/{score.directionTotal}</span>}
      </div>

      {/* ── Question stem (always visible) ── */}
      <div className="card p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wider">
            Soru {q.question_number} · Zorluk {'⭐'.repeat(q.difficulty)}
          </span>
          {phase === 'feedback' && (
            <button onClick={toggleReview} className="text-[10px] font-black text-[#AFAFAF] hover:text-[#3C3C3C]">
              {inReview ? '📌 Eklendi' : '+ Tekrara Ekle'}
            </button>
          )}
        </div>

        {/* Sentence with optional clue highlighting */}
        <QuestionStem
          q={q}
          showHighlights={phase === 'clues' || phase === 'logic' || phase === 'direction' || phase === 'options' || phase === 'feedback'}
          showColors={showColors}
          activeClue={activeClue}
          onClueToggle={(text) => setActiveClue(c => c === text ? null : text)}
        />
      </div>

      {/* ── Phase panels ── */}

      {phase === 'sentence' && (
        <SentencePanel level={level} onAdvance={advance} />
      )}

      {phase === 'clues' && (
        <CluesPanel
          q={q}
          showColors={showColors}
          activeClue={activeClue}
          onClueToggle={(text) => setActiveClue(c => c === text ? null : text)}
          onAdvance={advance}
        />
      )}

      {phase === 'logic' && (
        <LogicPanel
          correctKey={correctLogic}
          selected={logicGuess}
          locked={logicLocked}
          onSelect={pickLogic}
        />
      )}

      {phase === 'direction' && (
        <DirectionPanel
          correctKey={correctDir}
          selected={dirGuess}
          locked={dirLocked}
          onSelect={pickDirection}
        />
      )}

      {phase === 'options' && (
        <OptionsPanel q={q} onSelect={pickAnswer} />
      )}

      {phase === 'feedback' && (
        <FeedbackPanel
          q={q}
          userAnswer={userAnswer!}
          logicGuess={logicGuess}
          correctLogic={correctLogic}
          dirGuess={dirGuess}
          correctDir={correctDir}
          level={level}
          inReview={inReview}
          onToggleReview={toggleReview}
          onNext={goNext}
          isLast={qIdx + 1 >= questions.length}
        />
      )}

      {/* Level modal */}
      {showLevelModal && (
        <LevelModal
          current={level}
          onSelect={(l) => { setLevel(l); setShowLevelModal(false) }}
          onClose={() => setShowLevelModal(false)}
        />
      )}
    </div>
  )
}

// ── QuestionStem ──────────────────────────────────────────────────────────────

function QuestionStem({
  q,
  showHighlights,
  showColors,
  activeClue,
  onClueToggle,
}: {
  q: BootcampQuestion
  showHighlights: boolean
  showColors: boolean
  activeClue: string | null
  onClueToggle: (text: string) => void
}) {
  const clues = q.guided_solve?.clue_highlights ?? []
  const segs  = (showHighlights && showColors && clues.length > 0)
    ? buildSegments(q.question_text, clues)
    : [{ text: q.question_text }]

  return (
    <div className="space-y-2">
      <p className="text-base font-bold text-[#3C3C3C] leading-relaxed">
        {segs.map((seg, i) => {
          if (!seg.clue) {
            // Render blanks styled
            const parts = seg.text.split(/_{4,}/)
            return (
              <span key={i}>
                {parts.map((p, j) => (
                  <span key={j}>
                    {p}
                    {j < parts.length - 1 && (
                      <span className="inline-block bg-[#FFF9DB] border-b-2 border-[#FFD900] px-2 text-[#3C3C3C] font-black mx-0.5 rounded-sm">
                        ▢ ▢ ▢ ▢
                      </span>
                    )}
                  </span>
                ))}
              </span>
            )
          }

          const isActive = activeClue === seg.clue.text
          return (
            <span key={i} className="relative inline">
              <span
                className={`px-0.5 rounded-sm ${CLUE_STYLE[seg.clue.color]}`}
                onClick={() => onClueToggle(seg.clue!.text)}
              >
                {seg.text}
              </span>
              {isActive && (
                <span className={`absolute z-10 left-0 top-full mt-1 text-[10px] font-semibold px-2 py-1 rounded-lg shadow-lg whitespace-nowrap ${CLUE_BADGE[seg.clue.color]}`}>
                  {CLUE_LABEL[seg.clue.color]}: {seg.clue.why_tr}
                </span>
              )}
            </span>
          )
        })}
      </p>

      {/* Colour legend when highlights are showing */}
      {showHighlights && showColors && clues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from(new Set(clues.map(c => c.color))).map(color => (
            <span key={color} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${CLUE_BADGE[color]}`}>
              {CLUE_LABEL[color]}
            </span>
          ))}
          <span className="text-[9px] font-semibold text-[#AFAFAF]">· renklere dokun →</span>
        </div>
      )}
    </div>
  )
}

// ── SentencePanel ─────────────────────────────────────────────────────────────

function SentencePanel({ level, onAdvance }: { level: Level; onAdvance: () => void }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="bg-[#F8F8F8] rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-black text-[#3C3C3C]">📖 Cümleyi dikkatlice oku</p>
        <p className="text-xs font-semibold text-[#AFAFAF] leading-relaxed">
          Boşluğun nerede olduğuna bak. Öncesi ve sonrası ne söylüyor?
          Şıkları görmeden ÖNCE düşün.
        </p>
      </div>
      {level === 4 && (
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs font-black text-amber-700">⏱️ YDS Modu — renk ipucu yok</p>
        </div>
      )}
      <button onClick={onAdvance} className="btn-duo w-full py-3 text-sm font-black">
        {level >= 3 ? '🔍 İpuçlarını Gör →' : '🧠 Mantığı Belirle →'}
      </button>
    </div>
  )
}

// ── CluesPanel ────────────────────────────────────────────────────────────────

function CluesPanel({
  q,
  showColors,
  activeClue,
  onClueToggle,
  onAdvance,
}: {
  q: BootcampQuestion
  showColors: boolean
  activeClue: string | null
  onClueToggle: (text: string) => void
  onAdvance: () => void
}) {
  const clues = q.guided_solve?.clue_highlights ?? []

  return (
    <div className="space-y-3">
      <div className="card p-4 space-y-3">
        <p className="text-xs font-black text-[#3C3C3C]">🔍 İpucu Analizi</p>
        <p className="text-[11px] font-semibold text-[#AFAFAF]">
          Renkli kelimelere dokun → ne anlam taşıdığını gör
        </p>

        {/* Clue cards */}
        <div className="space-y-2">
          {clues.map((clue, i) => (
            <div
              key={i}
              className={`flex gap-2 items-start p-2.5 rounded-xl border cursor-pointer ${
                activeClue === clue.text ? 'border-current shadow-sm' : 'border-[#F0F0F0]'
              } ${CLUE_BADGE[clue.color]}`}
              onClick={() => onClueToggle(clue.text)}
            >
              <span className="text-sm font-black flex-shrink-0">
                {clue.color === 'blue' ? '🔵' : clue.color === 'green' ? '🟢' : clue.color === 'orange' ? '🟠' : '🔴'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black">"{clue.text}"</p>
                <p className="text-[10px] font-semibold opacity-80 mt-0.5 leading-relaxed">{clue.why_tr}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Decision rule */}
        {q.guided_solve?.decision_rule_tr && (
          <div className="bg-[#F0FFF0] rounded-xl p-3">
            <p className="text-[10px] font-black text-[#46A302] uppercase tracking-wider mb-1">📌 Karar Kuralı</p>
            <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{q.guided_solve.decision_rule_tr}</p>
          </div>
        )}
      </div>

      <button onClick={onAdvance} className="btn-duo w-full py-3 text-sm font-black">
        🧠 Mantığı Belirle →
      </button>
    </div>
  )
}

// ── LogicPanel ────────────────────────────────────────────────────────────────

function LogicPanel({
  correctKey,
  selected,
  locked,
  onSelect,
}: {
  correctKey: LogicKey
  selected: LogicKey | null
  locked: boolean
  onSelect: (k: LogicKey) => void
}) {
  return (
    <div className="card p-4 space-y-3">
      <div>
        <p className="text-sm font-black text-[#3C3C3C]">🧠 Bu cümle hangi mantık türü?</p>
        <p className="text-xs font-semibold text-[#AFAFAF] mt-0.5">
          Şıkları görmeden önce mantığı belirle
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {LOGIC_OPTIONS.map(opt => {
          const isSelected = selected === opt.key
          const isCorrect  = selected !== null && opt.key === correctKey
          const isWrong    = isSelected && selected !== correctKey

          let btnClass = 'w-full text-left p-3 rounded-xl border-2 transition-all '
          if (!selected) {
            btnClass += 'border-[#E5E5E5] bg-white hover:border-[#58CC02] hover:bg-[#F0FFF0] active:scale-95'
          } else if (isCorrect) {
            btnClass += 'border-[#58CC02] bg-[#D7FFB8]'
          } else if (isWrong) {
            btnClass += 'border-[#FF4B4B] bg-red-50'
          } else {
            btnClass += 'border-[#E5E5E5] bg-[#F8F8F8] opacity-40'
          }

          return (
            <button
              key={opt.key}
              onClick={() => !selected && !locked && onSelect(opt.key)}
              disabled={!!selected || locked}
              className={btnClass}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[#3C3C3C] leading-tight">{opt.label}</p>
                  {opt.desc && (
                    <p className="text-[9px] font-semibold text-[#AFAFAF] leading-tight mt-0.5 truncate">{opt.desc}</p>
                  )}
                </div>
                {isCorrect && <span className="text-sm flex-shrink-0">✅</span>}
                {isWrong   && <span className="text-sm flex-shrink-0">❌</span>}
              </div>
            </button>
          )
        })}
      </div>

      {selected && selected !== correctKey && (
        <div className="bg-red-50 rounded-xl p-3 border border-red-100">
          <p className="text-xs font-black text-[#FF4B4B]">
            ❌ "{LOGIC_OPTIONS.find(o => o.key === selected)?.label}" seçtin
            — bu cümle "{LOGIC_OPTIONS.find(o => o.key === correctKey)?.label}" gerektiriyor
          </p>
          <p className="text-[10px] font-semibold text-[#AFAFAF] mt-1">
            Devam ediliyor…
          </p>
        </div>
      )}

      {selected && selected === correctKey && (
        <div className="bg-[#D7FFB8] rounded-xl p-3 border border-[#58CC02]">
          <p className="text-xs font-black text-[#46A302]">
            ✅ Doğru! {LOGIC_OPTIONS.find(o => o.key === correctKey)?.icon} {LOGIC_OPTIONS.find(o => o.key === correctKey)?.label}
          </p>
        </div>
      )}
    </div>
  )
}

// ── DirectionPanel ────────────────────────────────────────────────────────────

function DirectionPanel({
  correctKey,
  selected,
  locked,
  onSelect,
}: {
  correctKey: DirectionKey
  selected: DirectionKey | null
  locked: boolean
  onSelect: (k: DirectionKey) => void
}) {
  return (
    <div className="card p-4 space-y-3">
      <div>
        <p className="text-sm font-black text-[#3C3C3C]">🎯 Boşluk ne yönde gitmeli?</p>
        <p className="text-xs font-semibold text-[#AFAFAF] mt-0.5">
          Cümlenin öncesinden yola çık — boşluk hangi yönde bilgi bekliyor?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DIRECTION_OPTIONS.map(opt => {
          const isSelected = selected === opt.key
          const isCorrect  = selected !== null && opt.key === correctKey
          const isWrong    = isSelected && selected !== correctKey

          let btnClass = 'w-full text-left p-3 rounded-xl border-2 transition-all '
          if (!selected) {
            btnClass += 'border-[#E5E5E5] bg-white hover:border-[#1CB0F6] hover:bg-blue-50 active:scale-95'
          } else if (isCorrect) {
            btnClass += 'border-[#58CC02] bg-[#D7FFB8]'
          } else if (isWrong) {
            btnClass += 'border-[#FF4B4B] bg-red-50'
          } else {
            btnClass += 'border-[#E5E5E5] bg-[#F8F8F8] opacity-40'
          }

          return (
            <button
              key={opt.key}
              onClick={() => !selected && !locked && onSelect(opt.key)}
              disabled={!!selected || locked}
              className={btnClass}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[#3C3C3C]">{opt.label}</p>
                  <p className="text-[9px] font-semibold text-[#AFAFAF] leading-tight mt-0.5">{opt.hint}</p>
                </div>
                {isCorrect && <span className="text-sm">✅</span>}
                {isWrong   && <span className="text-sm">❌</span>}
              </div>
            </button>
          )
        })}
      </div>

      {selected && selected !== correctKey && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
          <p className="text-xs font-black text-amber-700">
            "{DIRECTION_OPTIONS.find(o => o.key === selected)?.label}" seçtin
            — doğru yön: "{DIRECTION_OPTIONS.find(o => o.key === correctKey)?.label}"
          </p>
        </div>
      )}
    </div>
  )
}

// ── OptionsPanel ──────────────────────────────────────────────────────────────

function OptionsPanel({ q, onSelect }: { q: BootcampQuestion; onSelect: (opt: string) => void }) {
  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-black text-[#3C3C3C]">✏️ Şimdi cevabını seç</p>

      <div className="space-y-2">
        {Object.entries(q.options).map(([key, text]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className="w-full text-left p-3 rounded-xl border-2 border-[#E5E5E5] bg-white hover:border-[#58CC02] hover:bg-[#F0FFF0] active:scale-[0.98] transition-all"
          >
            <div className="flex gap-3 items-start">
              <span className="w-7 h-7 rounded-full bg-[#F0F0F0] flex items-center justify-center text-xs font-black text-[#3C3C3C] flex-shrink-0 mt-0.5">
                {key}
              </span>
              <span className="text-sm font-semibold text-[#3C3C3C] leading-snug">{text}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── FeedbackPanel ─────────────────────────────────────────────────────────────

function FeedbackPanel({
  q,
  userAnswer,
  logicGuess,
  correctLogic,
  dirGuess,
  correctDir,
  level,
  inReview,
  onToggleReview,
  onNext,
  isLast,
}: {
  q: BootcampQuestion
  userAnswer: string
  logicGuess: LogicKey | null
  correctLogic: LogicKey
  dirGuess: DirectionKey | null
  correctDir: DirectionKey
  level: Level
  inReview: boolean
  onToggleReview: () => void
  onNext: () => void
  isLast: boolean
}) {
  const [showMemory, setShowMemory] = useState(false)
  const isRight    = userAnswer === q.correct_answer
  const logicRight = logicGuess === correctLogic
  const dirRight   = dirGuess === correctDir
  const analysis   = q.guided_solve?.option_analysis ?? {}

  // Detect trap type from analysis text
  const getTrapType = (optKey: string, text: string): string | null => {
    const t = (text ?? '').toLowerCase()
    if (t.includes('gramer') || t.includes('grammar') || t.includes('yapı') || t.includes('structure')) return 'GRAMER TUZAĞI'
    if (t.includes('anlam') || t.includes('meaning') || t.includes('bağlam') || t.includes('context')) return 'ANLAM TUZAĞI'
    if (t.includes('mantık') || t.includes('logic') || t.includes('zıtlık') || t.includes('sebep')) return 'MANTIK TUZAĞI'
    return null
  }

  return (
    <div className="space-y-3">

      {/* ── Result banner ── */}
      <div className={`card p-4 border-2 ${isRight ? 'border-[#58CC02] bg-[#D7FFB8]' : 'border-[#FF4B4B] bg-red-50'}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isRight ? '✅' : '❌'}</span>
          <div>
            <p className="font-black text-base text-[#3C3C3C]">
              {isRight ? 'Doğru!' : `Yanlış — Doğru cevap: ${q.correct_answer}`}
            </p>
            <p className="text-xs font-semibold text-[#3C3C3C] opacity-80 mt-0.5">
              {q.options[q.correct_answer]}
            </p>
          </div>
        </div>
      </div>

      {/* ── Logic / Direction comparison ── */}
      {(logicGuess || (level >= 2 && dirGuess)) && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-black text-[#3C3C3C] uppercase tracking-wider">Tahmin Karşılaştırması</p>

          {logicGuess && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${logicRight ? 'bg-[#D7FFB8]' : 'bg-red-50'}`}>
              <span className="text-xs font-semibold text-[#3C3C3C]">Mantık tipi</span>
              <div className="flex items-center gap-2 text-xs font-black">
                {!logicRight && (
                  <span className="text-[#FF4B4B] line-through opacity-60">
                    {LOGIC_OPTIONS.find(o => o.key === logicGuess)?.label}
                  </span>
                )}
                <span className={logicRight ? 'text-[#46A302]' : 'text-[#58CC02]'}>
                  {logicRight ? '✅' : '→'} {LOGIC_OPTIONS.find(o => o.key === correctLogic)?.label}
                </span>
              </div>
            </div>
          )}

          {level >= 2 && dirGuess && (
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${dirRight ? 'bg-[#D7FFB8]' : 'bg-amber-50'}`}>
              <span className="text-xs font-semibold text-[#3C3C3C]">Yön tahmini</span>
              <div className="flex items-center gap-2 text-xs font-black">
                {!dirRight && (
                  <span className="text-amber-600 line-through opacity-60">
                    {DIRECTION_OPTIONS.find(o => o.key === dirGuess)?.label}
                  </span>
                )}
                <span className={dirRight ? 'text-[#46A302]' : 'text-amber-600'}>
                  {dirRight ? '✅' : '→'} {DIRECTION_OPTIONS.find(o => o.key === correctDir)?.label}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Explanation ── */}
      {q.guided_solve?.short_explanation_tr && (
        <div className="card p-4 space-y-1.5">
          <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wider">Açıklama</p>
          <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{q.guided_solve.short_explanation_tr}</p>
        </div>
      )}

      {/* ── Option analysis ── */}
      {Object.keys(analysis).length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-black text-[#3C3C3C] uppercase tracking-wider">Şık Analizi</p>
          <div className="space-y-1.5">
            {Object.entries(analysis).map(([key, text]) => {
              const isCorrectOpt = key === q.correct_answer
              const isUserOpt    = key === userAnswer
              const trapType     = !isCorrectOpt ? getTrapType(key, text) : null

              return (
                <div
                  key={key}
                  className={`flex gap-2.5 items-start p-3 rounded-xl border ${
                    isCorrectOpt
                      ? 'border-[#58CC02] bg-[#D7FFB8]'
                      : isUserOpt && !isCorrectOpt
                        ? 'border-[#FF4B4B] bg-red-50'
                        : 'border-[#F0F0F0] bg-[#F8F8F8]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${
                    isCorrectOpt ? 'bg-[#58CC02] text-white' : 'bg-[#E5E5E5] text-[#3C3C3C]'
                  }`}>
                    {key}
                  </span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCorrectOpt && <span className="text-[9px] font-black bg-[#58CC02] text-white px-1.5 py-0.5 rounded-full">DOĞRU</span>}
                      {isUserOpt && !isCorrectOpt && <span className="text-[9px] font-black bg-[#FF4B4B] text-white px-1.5 py-0.5 rounded-full">SEÇTİN</span>}
                      {trapType && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{trapType}</span>}
                    </div>
                    <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Memory trick + Mini lesson ── */}
      <button
        onClick={() => setShowMemory(m => !m)}
        className={`w-full card p-4 text-left transition-all ${showMemory ? 'border-[#FFD900] bg-[#FFF9DB]' : ''}`}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-[#3C3C3C]">💡 Hafıza Hilesi & Mini Ders</p>
          <span className="text-[#AFAFAF] text-lg">{showMemory ? '▲' : '▼'}</span>
        </div>
      </button>

      {showMemory && (
        <div className="space-y-2">
          {q.guided_solve?.memory_trick_tr && (
            <div className="card p-4 bg-[#FFF9DB] border-[#FFD900] border space-y-1">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">🧠 Hafıza Hilesi</p>
              <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{q.guided_solve.memory_trick_tr}</p>
            </div>
          )}
          {q.guided_solve?.mini_lesson_tr && (
            <div className="card p-4 bg-blue-50 border-blue-200 border space-y-1">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">📚 Mini Ders</p>
              <p className="text-sm font-semibold text-[#3C3C3C] leading-relaxed">{q.guided_solve.mini_lesson_tr}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-2">
        <button
          onClick={onToggleReview}
          className={`flex-1 py-3 rounded-xl border-2 text-sm font-black transition-all ${
            inReview
              ? 'border-[#FFD900] bg-[#FFF9DB] text-amber-700'
              : 'border-[#E5E5E5] bg-white text-[#AFAFAF] hover:border-[#FFD900]'
          }`}
        >
          {inReview ? '📌 Eklendi' : '+ Tekrara Ekle'}
        </button>
        <button onClick={onNext} className="flex-2 btn-duo px-6 py-3 text-sm font-black">
          {isLast ? '🏆 Bitir' : 'Sıradaki →'}
        </button>
      </div>
    </div>
  )
}

// ── LevelModal ────────────────────────────────────────────────────────────────

function LevelModal({
  current,
  onSelect,
  onClose,
}: {
  current: Level
  onSelect: (l: Level) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-black text-[#3C3C3C]">Seviye Seç</h2>
        <div className="space-y-2">
          {([1, 2, 3, 4] as Level[]).map(l => (
            <button
              key={l}
              onClick={() => onSelect(l)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                current === l
                  ? 'border-[#58CC02] bg-[#D7FFB8]'
                  : 'border-[#E5E5E5] hover:border-[#58CC02]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                  current === l ? 'bg-[#58CC02] text-white' : 'bg-[#F0F0F0] text-[#3C3C3C]'
                }`}>
                  L{l}
                </span>
                <div>
                  <p className="text-sm font-black text-[#3C3C3C]">{LEVEL_INFO[l].label}</p>
                  <p className="text-[10px] font-semibold text-[#AFAFAF]">{LEVEL_INFO[l].desc}</p>
                  <p className="text-[9px] font-semibold text-[#AFAFAF] mt-0.5">{LEVEL_INFO[l].phases}</p>
                </div>
                {current === l && <span className="ml-auto text-[#58CC02]">✓</span>}
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-2 text-sm font-bold text-[#AFAFAF]">Kapat</button>
      </div>
    </div>
  )
}
