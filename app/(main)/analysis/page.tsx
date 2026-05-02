'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ExamData } from '@/lib/types'
import {
  analyzeExams,
  generateWeaknessProfile,
  generateTopPatterns,
  generateDailyPlan,
  buildAdaptiveSets,
  generatePersonalStrategy,
  type SectionStat,
  type WeaknessItem,
  type MissingPattern,
  type DayPlan,
  type AdaptiveSet,
  type MistakeType,
  type ExamMeta,
} from '@/lib/exam-analyzer'

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'weaknesses' | 'patterns' | 'plan' | 'sets'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Özet',       icon: '📊' },
  { id: 'weaknesses', label: 'Zayıflıklar', icon: '🎯' },
  { id: 'patterns',   label: 'Kalıplar',    icon: '🔍' },
  { id: 'plan',       label: '7 Günlük',    icon: '📅' },
  { id: 'sets',       label: 'Pratik',      icon: '⚡' },
]

// ── Priority colours ──────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-[#FF4B4B] border-[#FF4B4B]',
  high:     'bg-orange-100 text-orange-600 border-orange-400',
  medium:   'bg-amber-100 text-amber-700 border-amber-400',
  low:      'bg-green-100 text-[#58CC02] border-[#58CC02]',
}

const PRIORITY_BAR: Record<string, string> = {
  critical: 'bg-[#FF4B4B]',
  high:     'bg-orange-500',
  medium:   'bg-amber-400',
  low:      'bg-[#58CC02]',
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-[#FF4B4B]',
  major:    'text-orange-500',
  minor:    'text-amber-600',
}

const DIFFICULTY_COLOR: Record<string, string> = {
  hard:   'bg-red-100 text-[#FF4B4B]',
  medium: 'bg-amber-100 text-amber-700',
  easy:   'bg-green-100 text-[#58CC02]',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function AccuracyBar({ pct, priority }: { pct: number; priority: string }) {
  return (
    <div className="w-full bg-[#F0F0F0] rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-700 ${PRIORITY_BAR[priority]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const [exam, setExam] = useState<ExamData | null>(null)
  const [tab, setTab]   = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/yds26_exam1.json')
      .then(r => r.json())
      .then((data: ExamData) => { setExam(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-4xl animate-bounce">📊</div>
        <p className="font-bold text-[#AFAFAF]">Analiz yükleniyor...</p>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="text-4xl">⚠️</div>
        <p className="font-bold text-[#AFAFAF]">Sınav verisi bulunamadı.</p>
      </div>
    )
  }

  // Run analysis — memoized so it doesn't re-run on every re-render (e.g. tab changes)
  const analysis = useMemo(() => {
    const exams = [exam!]
    const { metas, sectionStats, patternStats, mistakeTypes } = analyzeExams(exams)
    const weaknesses   = generateWeaknessProfile(sectionStats)
    const topPatterns  = generateTopPatterns(patternStats, exams)
    const dailyPlan    = generateDailyPlan(weaknesses, topPatterns)
    const adaptiveSets = buildAdaptiveSets(sectionStats, exams)
    const strategy     = generatePersonalStrategy(exams, sectionStats, patternStats)
    return { metas, sectionStats, patternStats, mistakeTypes, weaknesses, topPatterns, dailyPlan, adaptiveSets, strategy }
  }, [exam])

  const { metas, sectionStats, patternStats, mistakeTypes, weaknesses, topPatterns, dailyPlan, adaptiveSets, strategy } = analysis
  const meta = metas[0]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

      {/* ── Header ── */}
      <div className="card p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-black text-[#3C3C3C]">📊 Sınav Analizi</h1>
            <p className="text-xs font-semibold text-[#AFAFAF] mt-0.5">{meta.name}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-[#58CC02]">{meta.totalScore.toFixed(1)}</div>
            <div className="text-[10px] font-bold text-[#AFAFAF]">YDS PUAN</div>
          </div>
        </div>

        {/* Score row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 rounded-xl py-2 px-1">
            <div className="text-lg font-black text-[#58CC02]">{meta.correct}</div>
            <div className="text-[10px] font-bold text-[#AFAFAF]">DOĞRU</div>
          </div>
          <div className="bg-red-50 rounded-xl py-2 px-1">
            <div className="text-lg font-black text-[#FF4B4B]">{meta.total - meta.correct}</div>
            <div className="text-[10px] font-bold text-[#AFAFAF]">YANLIŞ</div>
          </div>
          <div className="bg-[#F8F8F8] rounded-xl py-2 px-1">
            <div className="text-lg font-black text-[#3C3C3C]">{meta.total}</div>
            <div className="text-[10px] font-bold text-[#AFAFAF]">TOPLAM</div>
          </div>
        </div>

        {/* Profile summary */}
        <p className="text-xs font-semibold text-[#AFAFAF] bg-[#F8F8F8] rounded-xl px-3 py-2 leading-relaxed">
          {strategy.profileSummary}
        </p>

        {/* Quick wins / challenges */}
        {strategy.quickWins.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-black text-[#3C3C3C] uppercase tracking-wider">Hızlı Kazanımlar</p>
            {strategy.quickWins.map((w, i) => (
              <p key={i} className="text-xs font-semibold text-[#58CC02] flex gap-1.5 items-start">
                <span>✅</span><span>{w}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all ${
              tab === t.id
                ? 'bg-[#58CC02] text-white shadow-[0_2px_0_#46A302]'
                : 'bg-[#F0F0F0] text-[#AFAFAF] hover:bg-[#E8E8E8]'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === 'overview' && (
        <OverviewTab
          sectionStats={sectionStats}
          mistakeTypes={mistakeTypes}
          hardChallenges={strategy.hardChallenges}
        />
      )}

      {/* ── Tab: Weaknesses ── */}
      {tab === 'weaknesses' && (
        <WeaknessTab weaknesses={weaknesses} />
      )}

      {/* ── Tab: Patterns ── */}
      {tab === 'patterns' && (
        <PatternsTab patterns={topPatterns} />
      )}

      {/* ── Tab: 7-day Plan ── */}
      {tab === 'plan' && (
        <PlanTab days={dailyPlan} />
      )}

      {/* ── Tab: Adaptive Sets ── */}
      {tab === 'sets' && (
        <SetsTab sets={adaptiveSets} />
      )}

    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  sectionStats,
  mistakeTypes,
  hardChallenges,
}: {
  sectionStats: SectionStat[]
  mistakeTypes: MistakeType[]
  hardChallenges: string[]
}) {
  return (
    <div className="space-y-4">

      {/* Section accuracy */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-black text-[#3C3C3C]">Bölüm Doğrulukları</h2>
        <div className="space-y-3">
          {sectionStats.map(s => (
            <div key={s.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${PRIORITY_COLOR[s.priority]}`}>
                    {s.priority === 'critical' ? 'KRİTİK' : s.priority === 'high' ? 'YÜKSEK' : s.priority === 'medium' ? 'ORTA' : 'İYİ'}
                  </span>
                  <span className="text-xs font-bold text-[#3C3C3C]">{s.label}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-black">
                  <span className="text-[#58CC02]">{s.correct}</span>
                  <span className="text-[#AFAFAF]">/</span>
                  <span className="text-[#3C3C3C]">{s.total}</span>
                  <span className="text-[#AFAFAF] font-semibold">
                    %{Math.round(s.accuracy * 100)}
                  </span>
                </div>
              </div>
              <AccuracyBar pct={Math.round(s.accuracy * 100)} priority={s.priority} />
            </div>
          ))}
        </div>
      </div>

      {/* Mistake types */}
      {mistakeTypes.length > 0 && (
        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-black text-[#3C3C3C]">Hata Profili</h2>
          <div className="space-y-2">
            {mistakeTypes.map(m => (
              <div key={m.type} className={`flex items-start gap-3 p-3 rounded-xl border ${m.color}`}>
                <span className="text-lg">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black">{m.label}</span>
                    <span className="text-lg font-black">{m.count}</span>
                  </div>
                  <p className="text-[10px] font-semibold opacity-80 mt-0.5 leading-relaxed">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hard challenges */}
      {hardChallenges.length > 0 && (
        <div className="card p-4 space-y-2">
          <h2 className="text-sm font-black text-[#3C3C3C]">Zorlu Alanlar</h2>
          {hardChallenges.map((c, i) => (
            <p key={i} className="text-xs font-semibold text-[#FF4B4B] flex gap-1.5 items-start">
              <span>🚧</span><span>{c}</span>
            </p>
          ))}
        </div>
      )}

    </div>
  )
}

// ── Weakness tab ──────────────────────────────────────────────────────────────

function WeaknessTab({ weaknesses }: { weaknesses: WeaknessItem[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#AFAFAF] px-1">
        En zayıf 5 bölüm — en kısa sürede en fazla puan kazandıracak sırayla
      </p>
      {weaknesses.map(w => (
        <div key={w.rank} className="card overflow-hidden">
          <button
            onClick={() => setOpen(open === w.rank ? null : w.rank)}
            className="w-full text-left p-4"
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 flex-shrink-0 ${PRIORITY_COLOR[w.priority]}`}>
                {w.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-[#3C3C3C]">{w.category}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    w.accuracy < 50 ? 'bg-red-100 text-[#FF4B4B]' :
                    w.accuracy < 65 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-[#58CC02]'
                  }`}>%{w.accuracy}</span>
                </div>
                <p className="text-[10px] font-semibold text-[#AFAFAF] mt-0.5">
                  {w.wrongCount} yanlış / {w.totalCount} soru · ~{w.estimatedHours}s/hafta
                </p>
                <div className="mt-1.5">
                  <AccuracyBar pct={w.accuracy} priority={w.priority} />
                </div>
              </div>
            </div>
          </button>

          {open === w.rank && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#F0F0F0] pt-3">
              {/* Sub-weaknesses */}
              {w.subWeaknesses.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wider mb-1">Alt Zayıflıklar</p>
                  <div className="flex flex-wrap gap-1">
                    {w.subWeaknesses.map((sw, i) => (
                      <span key={i} className="text-[10px] font-bold bg-[#F8F8F8] text-[#3C3C3C] px-2 py-1 rounded-lg">
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="bg-[#F0FFF0] rounded-xl p-3">
                <p className="text-[10px] font-black text-[#46A302] uppercase tracking-wider mb-1">📌 Öneri</p>
                <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{w.recommendation}</p>
              </div>

              {/* Weekly goal */}
              <div className="bg-[#FFF9DB] rounded-xl p-3">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">🎯 Haftalık Hedef</p>
                <p className="text-xs font-semibold text-[#3C3C3C]">{w.weeklyGoal}</p>
              </div>

              {/* CTA */}
              <Link
                href={`/${w.sectionKey === 'sentence_completion' ? 'sentence-trainer' : w.sectionKey === 'reading' ? 'train' : 'practice'}`}
                className="btn-duo w-full text-center block py-2 text-xs font-black"
              >
                Bu bölümü çalış →
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Patterns tab ──────────────────────────────────────────────────────────────

function PatternsTab({ patterns }: { patterns: MissingPattern[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#AFAFAF] px-1">
        En sık tekrarlayan hata kalıpları — bunları çözmek en yüksek puanı getirir
      </p>
      {patterns.map(p => (
        <div key={p.rank} className="card overflow-hidden">
          <button
            onClick={() => setOpen(open === p.rank ? null : p.rank)}
            className="w-full text-left p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F8F8F8] flex items-center justify-center text-xs font-black text-[#AFAFAF] flex-shrink-0">
                #{p.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-[#3C3C3C] truncate">{p.label}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {p.crossExam && (
                      <span className="text-[9px] font-black bg-red-100 text-[#FF4B4B] px-1.5 py-0.5 rounded-full">
                        TEKRAR
                      </span>
                    )}
                    <span className="text-sm font-black text-[#FF4B4B]">{p.frequency}×</span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          {open === p.rank && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#F0F0F0] pt-3">
              {/* How to fix */}
              <div className="bg-[#F0FFF0] rounded-xl p-3">
                <p className="text-[10px] font-black text-[#46A302] uppercase tracking-wider mb-1">💡 Nasıl Çözersin?</p>
                <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{p.howToFix}</p>
              </div>

              {/* Examples */}
              {p.examples.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wider mb-1">Örnek Sorular</p>
                  <div className="space-y-1">
                    {p.examples.map((ex, i) => (
                      <p key={i} className="text-[10px] font-semibold text-[#AFAFAF] bg-[#F8F8F8] rounded-lg px-2 py-1.5 leading-snug">
                        {ex}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Related */}
              {p.relatedPatterns.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wider mb-1">İlgili Kalıplar</p>
                  <div className="flex flex-wrap gap-1">
                    {p.relatedPatterns.map((r, i) => (
                      <span key={i} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Plan tab ──────────────────────────────────────────────────────────────────

function PlanTab({ days }: { days: DayPlan[] }) {
  const [selected, setSelected] = useState(0)
  const day = days[selected]

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-[#AFAFAF] px-1">
        Kişiselleştirilmiş 7 günlük antrenman planı
      </p>

      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setSelected(i)}
            className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-black transition-all min-w-[52px] ${
              selected === i
                ? 'bg-[#58CC02] text-white shadow-[0_2px_0_#46A302]'
                : 'bg-[#F0F0F0] text-[#AFAFAF]'
            }`}
          >
            <span>{d.day}</span>
            <span className="text-[9px] font-semibold mt-0.5 opacity-80">{d.label.slice(0, 3)}</span>
          </button>
        ))}
      </div>

      {/* Day detail */}
      {day && (
        <div className="card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-black text-[#3C3C3C]">{day.label}</h3>
              <p className="text-xs font-bold text-[#AFAFAF]">{day.sessionType} · {day.duration}</p>
            </div>
            <span className="text-[10px] font-black bg-[#FFF9DB] text-amber-700 px-2 py-1 rounded-full">
              {day.duration}
            </span>
          </div>

          <div className="bg-[#F8F8F8] rounded-xl p-3">
            <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wider mb-1">Odak</p>
            <p className="text-sm font-black text-[#3C3C3C]">{day.focus}</p>
          </div>

          <div>
            <p className="text-[10px] font-black text-[#AFAFAF] uppercase tracking-wider mb-2">Aktiviteler</p>
            <div className="space-y-2">
              {day.activities.map((a, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-5 h-5 rounded-full bg-[#F0FFF0] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] font-black text-[#58CC02]">{i + 1}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#3C3C3C] leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 rounded-xl p-2.5">
            <span className="text-base">🎯</span>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase">Hedef Kalıp</p>
              <p className="text-xs font-semibold text-[#3C3C3C]">{day.targetPattern}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-green-50 rounded-xl p-2.5">
            <span className="text-base">📈</span>
            <div>
              <p className="text-[10px] font-black text-[#58CC02] uppercase">Beklenen İyileşme</p>
              <p className="text-xs font-semibold text-[#3C3C3C]">{day.expectedImprovement}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Adaptive sets tab ─────────────────────────────────────────────────────────

function SetsTab({ sets }: { sets: AdaptiveSet[] }) {
  if (sets.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <div className="text-3xl">✨</div>
        <p className="font-black text-[#3C3C3C]">Harika iş!</p>
        <p className="text-sm font-semibold text-[#AFAFAF]">Tüm bölümlerde yeterli doğruluk var.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[#AFAFAF] px-1">
        Zayıf sorulardan oluşturulan odaklı pratik setleri
      </p>
      {sets.map(s => (
        <div key={s.id} className="card p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <h3 className="text-sm font-black text-[#3C3C3C]">{s.title}</h3>
                <p className="text-[10px] font-semibold text-[#AFAFAF]">
                  {s.questions.length} soru · {s.estimatedTime}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${DIFFICULTY_COLOR[s.difficulty]}`}>
              {s.difficulty === 'hard' ? 'ZOR' : s.difficulty === 'medium' ? 'ORTA' : 'KOLAY'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#F8F8F8] rounded-xl p-2">
              <p className="font-black text-[10px] text-[#AFAFAF] uppercase">Odak</p>
              <p className="font-semibold text-[#3C3C3C] mt-0.5 text-[11px]">{s.focus}</p>
            </div>
            <div className="bg-[#F8F8F8] rounded-xl p-2">
              <p className="font-black text-[10px] text-[#AFAFAF] uppercase">Hedef Zayıflık</p>
              <p className="font-semibold text-[#3C3C3C] mt-0.5 text-[11px]">{s.targetWeakness}</p>
            </div>
          </div>

          {/* Question list preview */}
          <div className="space-y-1">
            {s.questions.slice(0, 3).map((q, i) => (
              <div
                key={q.question_number}
                className={`flex gap-2 items-start p-2 rounded-lg text-[10px] font-semibold ${
                  q.is_correct ? 'bg-green-50 text-[#58CC02]' : 'bg-red-50 text-[#FF4B4B]'
                }`}
              >
                <span className="flex-shrink-0">{q.is_correct ? '✅' : '❌'}</span>
                <span className="text-[#3C3C3C] leading-snug line-clamp-1">
                  S{q.question_number}: {q.question_text?.slice(0, 55)}…
                </span>
              </div>
            ))}
            {s.questions.length > 3 && (
              <p className="text-[10px] font-semibold text-[#AFAFAF] text-center py-1">
                +{s.questions.length - 3} soru daha
              </p>
            )}
          </div>

          <Link
            href="/practice"
            className="btn-duo w-full text-center block py-2.5 text-sm font-black"
          >
            ⚡ Bu Seti Çalış
          </Link>
        </div>
      ))}
    </div>
  )
}
